"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Variant = { id: string; sku?: string; barcode?: string; price: number; attributes: any; product?: { name: string; slug: string } };

type TagSettings = { format: "a4" | "thermal"; cols: number; showLogo: boolean; showSku: boolean; showBarcode: boolean; showPrice: boolean; showName: boolean; showColor: boolean; showSize: boolean };

const DEFAULT_SETTINGS: TagSettings = { format: "a4", cols: 4, showLogo: true, showSku: true, showBarcode: true, showPrice: true, showName: true, showColor: true, showSize: true };

export default function PriceTagsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<TagSettings>({ ...DEFAULT_SETTINGS });
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    fetch(`${API}/products?limit=500`).then((r) => r.json()).then((d) => {
      const products = Array.isArray(d?.products) ? d.products : Array.isArray(d) ? d : [];
      const vars: Variant[] = [];
      for (const p of products) {
        for (const v of (p.variants || [])) {
          vars.push({ ...v, product: { name: p.name, slug: p.slug } });
        }
      }
      setVariants(vars);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const selectedVars = variants.filter((v) => selected.has(v.id));
    if (selectedVars.length === 0) return;

    import("jsbarcode").then(({ default: JsBarcode }) => {
      for (const v of selectedVars) {
        const code = v.barcode || v.sku || v.id.slice(-8);
        const canvas = canvasRefs.current[v.id];
        if (canvas) {
          try { JsBarcode(canvas, code, { format: "CODE128", width: 1.2, height: 35, displayValue: false, margin: 2 }); } catch {}
        }
      }
    });
  }, [selected, variants]);

  const filtered = variants.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.product?.name.toLowerCase().includes(q) || v.sku?.toLowerCase().includes(q) || (v.attributes?.color || "").toLowerCase().includes(q) || (v.attributes?.size || "").toLowerCase().includes(q);
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function printTags() {
    const selectedVars = variants.filter((v) => selected.has(v.id));
    const tagWidth = settings.format === "thermal" ? "55mm" : `${Math.floor(190 / settings.cols)}mm`;
    const tagHeight = settings.format === "thermal" ? "30mm" : "55mm";

    const tagsHtml = selectedVars.map((v) => {
      const barcodeDataUrl = canvasRefs.current[v.id]?.toDataURL() || "";
      return `
        <div class="tag">
          ${settings.showLogo ? `<p class="brand">RIZZ Leather</p>` : ""}
          ${settings.showName ? `<p class="name">${v.product?.name || ""}</p>` : ""}
          ${settings.showColor || settings.showSize ? `<p class="attr">${[settings.showColor && v.attributes?.color, settings.showSize && v.attributes?.size].filter(Boolean).join(" / ")}</p>` : ""}
          ${settings.showSku && v.sku ? `<p class="sku">${v.sku}</p>` : ""}
          ${settings.showBarcode && barcodeDataUrl ? `<img class="barcode" src="${barcodeDataUrl}" />` : ""}
          ${settings.showPrice ? `<p class="price">৳${v.price.toLocaleString()}</p>` : ""}
        </div>
      `;
    }).join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Price Tags</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: sans-serif; }
      .grid { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; }
      .tag { width: ${tagWidth}; height: ${tagHeight}; border: 1px dashed #999; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; break-inside: avoid; text-align: center; overflow: hidden; }
      .brand { font-size: 7px; font-weight: bold; color: #333; text-transform: uppercase; letter-spacing: 1px; }
      .name { font-size: 8px; font-weight: bold; margin-top: 2px; line-height: 1.2; }
      .attr { font-size: 7px; color: #555; }
      .sku { font-size: 6px; font-family: monospace; color: #888; }
      .barcode { max-width: 100%; height: auto; margin: 1px 0; }
      .price { font-size: 11px; font-weight: bold; color: #000; margin-top: 1px; }
      @media print { @page { margin: 5mm; } button { display: none; } }
    </style></head><body>
    <div class="grid">${tagsHtml}</div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Price Tags</h1>
        {selected.size > 0 && (
          <button onClick={printTags} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">Print {selected.size} Tag{selected.size > 1 ? "s" : ""}</button>
        )}
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Tag Settings</h3>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Format</label>
            <select value={settings.format} onChange={(e) => setSettings({ ...settings, format: e.target.value as "a4" | "thermal" })} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white">
              <option value="a4">A4 Sheet</option>
              <option value="thermal">Thermal Label</option>
            </select>
          </div>
          {settings.format === "a4" && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Columns</label>
              <select value={settings.cols} onChange={(e) => setSettings({ ...settings, cols: Number(e.target.value) })} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white">
                {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} cols</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-end">
            {[
              { key: "showLogo", label: "Logo/Brand" },
              { key: "showName", label: "Name" },
              { key: "showColor", label: "Color" },
              { key: "showSize", label: "Size" },
              { key: "showSku", label: "SKU" },
              { key: "showBarcode", label: "Barcode" },
              { key: "showPrice", label: "Price" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={(settings as any)[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="rounded" />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="max-w-sm rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500" />
        <button onClick={() => setSelected(new Set(filtered.map((v) => v.id)))} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600">Select All</button>
        <button onClick={() => setSelected(new Set())} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600">Clear</button>
      </div>

      {/* Hidden canvases for barcode generation */}
      <div className="hidden">
        {variants.filter((v) => selected.has(v.id)).map((v) => (
          <canvas key={v.id} ref={(el) => { canvasRefs.current[v.id] = el; }} />
        ))}
      </div>

      {loading ? <p className="text-slate-400">Loading…</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filtered.map((v) => {
            const isSelected = selected.has(v.id);
            return (
              <button key={v.id} onClick={() => toggle(v.id)} className={`rounded-xl border p-3 text-left transition ${isSelected ? "border-teal-500 bg-teal-900/20" : "border-white/10 bg-slate-800/50 hover:border-white/20"}`}>
                <p className="text-xs text-white font-medium truncate">{v.product?.name}</p>
                <p className="text-xs text-slate-400">{v.attributes?.color} / {v.attributes?.size}</p>
                {v.sku && <p className="text-xs text-slate-500 font-mono truncate">{v.sku}</p>}
                <p className="text-xs text-emerald-400 mt-1 font-bold">৳{v.price}</p>
                {isSelected && <p className="text-xs text-teal-400 mt-1">✓ Selected</p>}
              </button>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full text-slate-500 py-8 text-center">No variants found</p>}
        </div>
      )}
    </div>
  );
}
