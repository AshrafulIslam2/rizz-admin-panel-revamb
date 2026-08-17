"use client";

import { useEffect, useRef, useState } from "react";
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, isPrinterSupported,
  printLabel, calibratePrinter, testPrint, testPrintEscPos, LABEL_PRESETS,
  type LabelData,
} from "@/lib/printer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Variant = {
  id: string;
  sku?: string;
  barcode?: string;
  price: number;
  sale_price?: number;
  attributes: { size?: string; color?: string };
  product?: { name: string };
};

type LabelPresetKey = keyof typeof LABEL_PRESETS;

// ─── Barcode canvas (uses JsBarcode lazily) ───────────────────────────────────
function BarcodeCanvas({ code, show }: { code: string; show: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!show || done || !ref.current) return;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      try {
        JsBarcode(ref.current!, code, {
          format: "CODE128", width: 2.5, height: 50,
          displayValue: true, fontSize: 14, margin: 4,
        });
        setDone(true);
      } catch {}
    });
  }, [show, code, done]);

  return (
    <canvas
      ref={ref}
      data-barcode-canvas={code}
      className="w-full mt-2 rounded"
      style={{ display: show ? "block" : "none" }}
    />
  );
}

// ─── Label preview card ────────────────────────────────────────────────────────
function LabelCard({
  v,
  selected,
  qty,
  onToggle,
  onQtyChange,
}: {
  v: Variant;
  selected: boolean;
  qty: number;
  onToggle: () => void;
  onQtyChange: (n: number) => void;
}) {
  const code = v.barcode || v.sku || v.id.slice(-8);
  const size  = v.attributes?.size  ?? "—";
  const color = v.attributes?.color ?? "—";

  return (
    <div
      className={`rounded-xl border p-3 transition cursor-pointer select-none ${
        selected
          ? "border-teal-500 bg-teal-900/20 ring-1 ring-teal-500/40"
          : "border-white/10 bg-slate-800/50 hover:border-white/20"
      }`}
      onClick={onToggle}
    >
      {/* Checkbox + name */}
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${selected ? "border-teal-500 bg-teal-500" : "border-white/20 bg-slate-700"} flex items-center justify-center`}>
          {selected && <span className="text-[9px] text-white font-bold">✓</span>}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate leading-tight">{v.product?.name ?? "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">{size} / {color}</p>
        </div>
      </div>

      {/* Barcode */}
      {selected
        ? <BarcodeCanvas code={code} show={selected} />
        : <div className="mt-2 h-12 rounded bg-slate-700/50 flex items-center justify-center text-[10px] text-slate-500">Click to preview barcode</div>
      }

      {/* Price */}
      <div className="mt-2 flex items-center justify-between">
        <div>
          {v.sale_price ? (
            <>
              <span className="text-sm font-bold text-emerald-400">৳{v.sale_price.toLocaleString()}</span>
              <span className="ml-1.5 text-[10px] text-slate-500 line-through">৳{v.price.toLocaleString()}</span>
            </>
          ) : (
            <span className="text-sm font-bold text-emerald-400">৳{v.price.toLocaleString()}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 font-mono truncate ml-2">{v.sku?.slice(-10) ?? code.slice(-10)}</p>
      </div>

      {/* Qty selector (visible when selected) */}
      {selected && (
        <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-slate-400">Copies:</span>
          <button onClick={() => onQtyChange(Math.max(1, qty - 1))} className="h-5 w-5 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">−</button>
          <span className="text-xs text-white w-5 text-center">{qty}</span>
          <button onClick={() => onQtyChange(Math.min(100, qty + 1))} className="h-5 w-5 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">+</button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function BarcodesPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, number>>({});

  // Printer state
  const [supported, setSupported] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);

  useEffect(() => { setSupported(isPrinterSupported()); }, []);
  const [printerStatus, setPrinterStatus] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  // Label settings
  const [preset, setPreset] = useState<LabelPresetKey>("standard");
  const [showQr, setShowQr] = useState(false);

  // Load all variants
  useEffect(() => {
    fetch(`${API}/products?limit=500`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const products = Array.isArray(d?.products) ? d.products : Array.isArray(d) ? d : [];
        const vars: Variant[] = [];
        for (const p of products) {
          for (const v of (p.variants ?? [])) {
            vars.push({ ...v, product: { name: p.name } });
          }
        }
        setVariants(vars);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered list
  const filtered = variants.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.product?.name.toLowerCase().includes(q) ||
      v.sku?.toLowerCase().includes(q) ||
      v.barcode?.includes(q) ||
      (v.attributes?.color ?? "").toLowerCase().includes(q) ||
      (v.attributes?.size ?? "").toLowerCase().includes(q)
    );
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setQtys((prev) => ({ ...prev, [id]: prev[id] ?? 1 }));
  }

  function selectAll()  { setSelected(new Set(filtered.map((v) => v.id))); }
  function clearAll()   { setSelected(new Set()); }
  function setQty(id: string, n: number) { setQtys((p) => ({ ...p, [id]: n })); }

  const selectedList = variants.filter((v) => selected.has(v.id));
  const totalLabels  = selectedList.reduce((s, v) => s + (qtys[v.id] ?? 1), 0);

  // ── Browser print ─────────────────────────────────────────────────────────
  function browserPrint() {
    const pw = window.open("", "_blank");
    if (!pw) { alert("Popup blocked! Allow popups for this site."); return; }

    // Grab already-rendered barcode canvas images as data URLs (no CDN needed)
    const canvasMap: Record<string, string> = {};
    document.querySelectorAll<HTMLCanvasElement>("canvas[data-barcode-canvas]").forEach((c) => {
      const code = c.getAttribute("data-barcode-canvas");
      if (code && c.width > 0) canvasMap[code] = c.toDataURL("image/png");
    });

    const { width_mm, height_mm } = LABEL_PRESETS[preset];

    const rows = selectedList.map((v) => {
      const code     = v.barcode || v.sku || v.id.slice(-8);
      const qty      = qtys[v.id] ?? 1;
      const imgSrc   = canvasMap[code] ?? "";
      const priceStr = v.sale_price
        ? `৳${v.sale_price.toLocaleString()} <s style="font-size:13px;color:#777">৳${v.price.toLocaleString()}</s>`
        : `৳${v.price.toLocaleString()}`;

      return Array.from({ length: qty }, () => `
        <div class="label">
          <p class="name">${v.product?.name ?? ""}</p>
          <p class="variant">${v.attributes?.size ?? ""} / ${v.attributes?.color ?? ""}</p>
          ${imgSrc ? `<img src="${imgSrc}" class="bc" />` : `<p style="font-size:10px;color:#aaa;text-align:center">No barcode</p>`}
          <p class="price">${priceStr}</p>
          <p class="sku">${v.sku ?? code}</p>
        </div>`).join("");
    }).join("");

    pw.document.write(`<!DOCTYPE html><html><head><title>Labels</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#fff;font-family:'Courier New',monospace}
      .grid{display:flex;flex-wrap:wrap;gap:3px;padding:4px}
      .label{
        width:${width_mm}mm;height:${height_mm}mm;
        border:0.5px solid #ccc;padding:2px 3px;
        display:flex;flex-direction:column;align-items:center;
        justify-content:space-between;overflow:hidden;break-inside:avoid;page-break-inside:avoid
      }
      .name{font-size:15px;font-weight:700;text-align:center;line-height:1.2;width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      .variant{font-size:18px;font-weight:700;color:#111;text-align:center}
      .bc{width:100%;height:auto;max-height:${Math.round(height_mm * 0.42)}mm;object-fit:contain}
      .price{font-size:22px;font-weight:700;text-align:center}
      .sku{font-size:11px;color:#666;text-align:center;letter-spacing:0.5px}
      @media print{
        @page{margin:0;size:${width_mm}mm ${height_mm}mm}
        body{margin:0}
        .grid{padding:0;gap:0}
        .no-print{display:none!important}
      }
    </style></head><body>
    <div class="no-print" style="padding:6px;display:flex;gap:6px;background:#f0f0f0;margin-bottom:6px">
      <button onclick="window.print()" style="background:#0d9488;color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:12px;cursor:pointer">🖨 Print</button>
      <button onclick="window.close()" style="background:#6b7280;color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:12px;cursor:pointer">Close</button>
      <span style="font-size:11px;color:#555;align-self:center">${totalLabels} labels · ${width_mm}×${height_mm}mm</span>
    </div>
    <div class="grid">${rows}</div>
    </body></html>`);
    pw.document.close();
  }

  // ── Rongta TSPL print ─────────────────────────────────────────────────────
  async function connectPrinterFn() {
    try {
      await connectPrinter();
      setPrinterConnected(true);
      setPrinterStatus("✅ Printer connected");
    } catch (e: any) {
      setPrinterStatus(`❌ ${e.message ?? "Connection failed"}`);
    }
  }

  async function tsplPrint() {
    if (!printerConnected) { await connectPrinterFn(); return; }
    setPrinting(true);
    setPrinterStatus(`Printing ${totalLabels} labels…`);
    const { width_mm, height_mm } = LABEL_PRESETS[preset];
    let printed = 0;
    try {
      for (const v of selectedList) {
        const qty = qtys[v.id] ?? 1;
        const labelData: LabelData = {
          width_mm, height_mm,
          product_name: v.product?.name ?? "RIZZ",
          variant_name: `${v.attributes?.size ?? ""} / ${v.attributes?.color ?? ""}`,
          price: v.price,
          sale_price: v.sale_price ?? undefined,
          sku: v.sku,
          barcode: v.barcode ?? v.sku,
          show_qr: showQr,
          qty,
        };
        await printLabel(labelData);
        printed += qty;
        setPrinterStatus(`Printing… ${printed}/${totalLabels} done`);
      }
      setPrinterStatus(`✅ Done — ${printed} labels printed`);
    } catch (e: any) {
      setPrinterStatus(`❌ ${e.message}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">🏷 Barcodes & Price Tags</h1>
          <p className="text-sm text-slate-400 mt-0.5">Select variants → set copies → print via browser or Rongta RP80VI</p>
        </div>
      </div>

      {/* ── Printer panel ── */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-white">🖨 Rongta RP80VI (TSPL)</p>
          <div className="flex gap-2 ml-auto flex-wrap">
            {!printerConnected ? (
              <button
                onClick={connectPrinterFn}
                disabled={!supported}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                title={!supported ? "Use Chrome or Edge for WebUSB" : ""}
              >
                {supported ? "Connect Printer" : "Chrome/Edge only"}
              </button>
            ) : (
              <>
                <span className="rounded-lg bg-teal-900 border border-teal-600 px-3 py-1.5 text-xs font-semibold text-teal-300">● Connected</span>
                <button onClick={async () => { try { await testPrint(); setPrinterStatus("✅ TSPL test sent — check paper & console"); } catch(e:any){setPrinterStatus("❌ "+e.message);}}} className="rounded-lg border border-amber-600 bg-amber-900/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-900/60">🧪 TSPL Test</button>
                <button onClick={async () => { try { await testPrintEscPos(); setPrinterStatus("✅ ESC/POS test sent — check paper & console"); } catch(e:any){setPrinterStatus("❌ "+e.message);}}} className="rounded-lg border border-blue-600 bg-blue-900/30 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-900/60">🧪 ESC Test</button>
                <button onClick={async () => { await calibratePrinter(); setPrinterStatus("Calibrating…"); }} className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600">Calibrate</button>
                <button onClick={async () => { await disconnectPrinter(); setPrinterConnected(false); setPrinterStatus(null); }} className="rounded-lg border border-rose-700 bg-rose-900/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-900/60">Disconnect</button>
              </>
            )}
          </div>
        </div>

        {/* Label settings */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Label Size</p>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as LabelPresetKey)}
              className="rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none focus:border-teal-500"
            >
              {(Object.entries(LABEL_PRESETS) as [LabelPresetKey, typeof LABEL_PRESETS[LabelPresetKey]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="h-3.5 w-3.5 accent-teal-500" />
            Add QR code
          </label>
        </div>

        {printerStatus && (
          <p className={`text-xs rounded-lg px-3 py-2 ${printerStatus.startsWith("❌") ? "bg-rose-900/30 border border-rose-700 text-rose-300" : "bg-teal-900/30 border border-teal-700 text-teal-300"}`}>
            {printerStatus}
          </p>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product, SKU, color, size…"
          className="flex-1 min-w-48 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-500"
        />
        <button onClick={selectAll} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600">
          Select All ({filtered.length})
        </button>
        <button onClick={clearAll} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600">
          Clear
        </button>
        {selected.size > 0 && (
          <>
            <button
              onClick={browserPrint}
              className="rounded-lg bg-slate-600 border border-slate-500 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-500 flex items-center gap-1.5"
            >
              🖨 Browser Print ({totalLabels})
            </button>
            <button
              onClick={tsplPrint}
              disabled={printing}
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-60 flex items-center gap-1.5"
            >
              {printing ? "Printing…" : `🏷 TSPL Print (${totalLabels})`}
            </button>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <p className="text-xs text-slate-400">
          {selected.size} variant{selected.size > 1 ? "s" : ""} selected · {totalLabels} total labels
        </p>
      )}

      {/* ── Variant grid ── */}
      {loading ? (
        <p className="text-slate-400 py-8 text-center">Loading variants…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 py-8 text-center">No variants found</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((v) => (
            <LabelCard
              key={v.id}
              v={v}
              selected={selected.has(v.id)}
              qty={qtys[v.id] ?? 1}
              onToggle={() => toggleSelect(v.id)}
              onQtyChange={(n) => setQty(v.id, n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
