"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Variant = { id: string; sku?: string; barcode?: string; price: number; attributes: any; product?: { name: string; slug: string } };

export default function BarcodesPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [rendered, setRendered] = useState<Set<string>>(new Set());

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
    if (typeof window === "undefined") return;
    const toRender = variants.filter((v) => selected.has(v.id) && !rendered.has(v.id));
    if (toRender.length === 0) return;

    import("jsbarcode").then(({ default: JsBarcode }) => {
      for (const v of toRender) {
        const code = v.barcode || v.sku || v.id.slice(-8);
        const canvas = canvasRefs.current[v.id];
        if (canvas) {
          try {
            JsBarcode(canvas, code, { format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 10, margin: 4 });
            setRendered((prev) => new Set([...prev, v.id]));
          } catch {}
        }
      }
    });
  }, [selected, variants, rendered]);

  const filtered = variants.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.product?.name.toLowerCase().includes(q) ||
      v.sku?.toLowerCase().includes(q) ||
      v.barcode?.includes(q) ||
      (v.attributes?.color || "").toLowerCase().includes(q) ||
      (v.attributes?.size || "").toLowerCase().includes(q)
    );
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(filtered.map((v) => v.id))); }
  function clearAll() { setSelected(new Set()); }

  function printSelected() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const selectedVars = variants.filter((v) => selected.has(v.id));
    const canvasDataUrls = selectedVars.map((v) => ({
      v,
      dataUrl: canvasRefs.current[v.id]?.toDataURL() || "",
    }));

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Barcodes</title><style>
      body { margin: 0; font-family: sans-serif; }
      .grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; }
      .item { border: 1px solid #ccc; padding: 6px; text-align: center; break-inside: avoid; width: 160px; }
      .item p { margin: 2px 0; font-size: 9px; }
      img { max-width: 100%; }
      @media print { button { display: none; } }
    </style></head><body>
    <div class="grid">
      ${canvasDataUrls.map(({ v, dataUrl }) => `
        <div class="item">
          <p style="font-weight:bold;font-size:10px">${v.product?.name || ""}</p>
          <p>${v.attributes?.color || ""} / ${v.attributes?.size || ""}</p>
          ${dataUrl ? `<img src="${dataUrl}" />` : `<p>SKU: ${v.sku || v.id.slice(-8)}</p>`}
          <p>৳${v.price}</p>
        </div>
      `).join("")}
    </div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Barcodes</h1>
        <div className="flex gap-2">
          <button onClick={selectAll} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600">Select All ({filtered.length})</button>
          <button onClick={clearAll} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600">Clear</button>
          {selected.size > 0 && (
            <button onClick={printSelected} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">Print {selected.size} Barcode{selected.size > 1 ? "s" : ""}</button>
          )}
        </div>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU, barcode, color, size…" className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500" />

      {loading ? <p className="text-slate-400">Loading…</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((v) => {
            const isSelected = selected.has(v.id);
            const code = v.barcode || v.sku || v.id.slice(-8);
            return (
              <button key={v.id} onClick={() => toggleSelect(v.id)} className={`rounded-xl border p-3 text-left transition ${isSelected ? "border-teal-500 bg-teal-900/20" : "border-white/10 bg-slate-800/50 hover:border-white/20"}`}>
                <p className="text-xs text-white font-medium truncate">{v.product?.name}</p>
                <p className="text-xs text-slate-400">{v.attributes?.color} / {v.attributes?.size}</p>
                <p className="text-xs text-slate-500 font-mono">{code}</p>
                <canvas ref={(el) => { canvasRefs.current[v.id] = el; }} className="w-full mt-2" style={{ display: isSelected ? "block" : "none" }} />
                {!isSelected && <div className="w-full h-10 mt-2 rounded bg-slate-700/50 flex items-center justify-center text-xs text-slate-500">Click to preview</div>}
                <p className="text-xs text-emerald-400 mt-1">৳{v.price}</p>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full text-slate-500 py-8 text-center">No variants found</p>}
        </div>
      )}
    </div>
  );
}
