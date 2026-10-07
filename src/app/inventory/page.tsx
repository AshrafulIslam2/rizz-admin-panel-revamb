"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import StockTable, { bdt, type StockDashboard } from "./stock-table";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  before_qty: number;
  after_qty: number;
  reference?: string;
  note?: string;
  created_at: string;
  variant?: { attributes: any; product?: { name: string; slug: string } };
};

const TYPE_COLORS: Record<string, string> = {
  STOCK_IN: "bg-emerald-900/40 text-emerald-300",
  STOCK_OUT: "bg-red-900/40 text-red-300",
  SALE: "bg-blue-900/40 text-blue-300",
  RETURN: "bg-amber-900/40 text-amber-300",
  ADJUSTMENT: "bg-purple-900/40 text-purple-300",
  DAMAGE: "bg-rose-900/40 text-rose-300",
};

export default function InventoryPage() {
  const [history, setHistory] = useState<Movement[]>([]);
  const [dashboard, setDashboard] = useState<StockDashboard | null>(null);
  const [threshold, setThreshold] = useState(10);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const summary = dashboard?.summary;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stock" | "move" | "history" | "low">("stock");

  const [form, setForm] = useState({ variant_id: "", type: "STOCK_IN", quantity: "", reference: "", note: "" });
  const [productId, setProductId] = useState("");
  const selectedProduct = dashboard?.products.find((product) => product.id === productId);
  const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === form.variant_id);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const get = async (path: string) => {
        const response = await fetch(API + path, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load stock information (HTTP " + response.status + ").");
        return response.json();
      };
      const [data, movements] = await Promise.all([
        get("/inventory/dashboard?threshold=" + threshold),
        get("/inventory/history?limit=100"),
      ]);
      if (id !== requestId.current) return;
      if (!data?.summary || !Array.isArray(data.products)) throw new Error("Unexpected stock response.");
      setDashboard(data);
      setHistory(Array.isArray(movements) ? movements : []);
      setError("");
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : "Could not load stock information.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15000);
    return () => { clearInterval(interval); requestId.current++; };
  }, [load]);

  async function handleMove(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!selectedVariant) {
      setMsg("Select a product and variant first.");
      return;
    }
    const quantity = Number(form.quantity);
    if (form.quantity === "" || !Number.isInteger(quantity) || quantity < (form.type === "ADJUSTMENT" ? 0 : 1)) {
      setMsg("Enter a valid whole-number quantity.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/inventory/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, variant_id: selectedVariant.id, quantity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(Array.isArray(data?.message) ? data.message.join(" ") : data?.message || "Could not record stock movement.");
      }
      setMsg("Stock movement recorded.");
      setForm((current) => ({ ...current, quantity: "", reference: "", note: "" }));
      await load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not reach the API. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function variantLabel(m: Movement) {
    const a = m.variant?.attributes || {};
    const parts = [m.variant?.product?.name, a.color, a.size].filter(Boolean);
    return parts.join(" / ") || m.variant?.product?.slug || "—";
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">General Stock Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {loading ? "Refreshing…" : "Auto-refresh every 15s"}
          </span>
          <button onClick={load} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600 transition">
            ↺ Refresh now
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400">One shared inventory for online and shop sales. Physical stock includes reserved units; available stock excludes them.</p>
      {error && <div role="alert" className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{error}{dashboard ? " Showing the last successful snapshot." : ""}</div>}
      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Physical stock", value: summary.totalQty.toLocaleString(), sub: summary.totalProducts + " products · " + summary.totalVariants + " variants" },
              { label: "Reserved stock", value: summary.totalReserved.toLocaleString(), sub: "Held for online orders" },
              { label: "Available stock", value: summary.totalAvailable.toLocaleString(), sub: "Physical minus reserved, per variant" },
              { label: "Selling value", value: bdt(summary.totalValue), sub: "Physical quantity × current variant price" },
              { label: "Production value", value: bdt(summary.totalCost), sub: summary.missingCostQty > 0 ? "Incomplete: some stocked units have no cost" : "Physical quantity × production cost" },
              { label: "Low-stock products", value: summary.lowStockProducts.toLocaleString(), sub: "At least one variant below threshold" },
              { label: "Low-stock variants", value: summary.lowStockVariants.toLocaleString(), sub: "Available quantity below " + dashboard?.threshold },
              { label: "Out-of-stock variants", value: summary.outOfStock.toLocaleString(), sub: "No available units" },
            ].map((c) => <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{c.label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p><p className="mt-2 text-xs text-slate-500">{c.sub}</p></div>)}
          </div>
          {summary.missingCostVariants > 0 && <p className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">Production cost is missing for {summary.missingCostVariants} variants ({summary.missingCostQty} physical units). Production value includes only units with a recorded cost. Set costs in each product&apos;s Variants tab.</p>}
          {summary.productsWithoutVariants > 0 && <p className="text-xs text-slate-400">{summary.productsWithoutVariants} products have no variants and contribute no quantity or value.</p>}
          <p className="text-xs text-slate-400">Values are in BDT using variant sale price when set, otherwise regular price. Campaign discounts are excluded. Snapshot: {new Date(dashboard!.generatedAt).toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })}</p>
        </>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex-1 text-xs text-slate-400">Search products or variant SKU<input className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product name, SKU or variant" /></label>
        <label className="text-xs text-slate-400">Low-stock threshold<input type="number" min="0" max="10000" className="mt-1 block w-28 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" value={threshold} onChange={(e) => { const n = e.target.valueAsNumber; if (Number.isInteger(n) && n >= 0 && n <= 10000) setThreshold(n); }} /></label>
        <Link href="/inventory/reconcile" className="py-2 text-xs font-semibold text-teal-400 hover:underline">Stock reconciliation →</Link>
      </div>
      <div className="flex gap-2">
        {(["stock", "move", "history", "low"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
            {t === "stock" ? "All Stock" : t === "move" ? "Stock Movement" : t === "history" ? "History" : `Low Stock (${summary?.lowStockVariants ?? 0})`}
          </button>
        ))}
      </div>

      {tab === "stock" && dashboard && <StockTable products={dashboard.products} search={search} />}
      {!dashboard && loading && <p className="text-sm text-slate-400">Loading stock…</p>}

      {tab === "move" && (
        <form onSubmit={handleMove} className="rounded-xl border border-white/10 bg-slate-800/50 p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-semibold text-white">Record Movement</h2>
          <div>
            <label htmlFor="movement-product" className="block text-xs text-slate-400 mb-1">Product *</label>
            <select id="movement-product" value={selectedProduct?.id ?? ""} required disabled={!dashboard || saving}
              onChange={(e) => { setProductId(e.target.value); setForm((current) => ({ ...current, variant_id: "" })); setMsg(""); }}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">
              <option value="">{!dashboard ? "Loading products…" : "Select a product"}</option>
              {dashboard?.products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.variants.length} variants)</option>)}
            </select>
            {dashboard?.products.length === 0 && <p className="mt-2 text-xs text-amber-300">No products yet. Add a product and its variants first.</p>}
          </div>
          <div>
            <label htmlFor="movement-variant" className="block text-xs text-slate-400 mb-1">Size / Color / Variant *</label>
            <select id="movement-variant" value={selectedVariant?.id ?? ""} required disabled={!selectedProduct?.variants.length || saving}
              onChange={(e) => { setForm((current) => ({ ...current, variant_id: e.target.value })); setMsg(""); }}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">
              <option value="">{!selectedProduct ? "Select a product first" : selectedProduct.variants.length === 0 ? "This product has no variants" : "Select a variant"}</option>
              {selectedProduct?.variants.map((variant) => {
                const label = [variant.attributes?.size, variant.attributes?.color].filter(Boolean).join(" / ") || variant.variant_name;
                return <option key={variant.id} value={variant.id}>{label} · {variant.sku} · Stock: {variant.stock_qty}</option>;
              })}
            </select>
            {selectedProduct && selectedProduct.variants.length === 0 && <Link href={`/products/${selectedProduct.id}`} className="mt-2 inline-block text-xs text-teal-400 hover:underline">Add variants to this product →</Link>}
            {selectedVariant && <p className="mt-2 text-xs text-slate-400">Physical: {selectedVariant.stock_qty} · Reserved: {selectedVariant.reserved_qty} · Available: {selectedVariant.available_qty}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
                {["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "DAMAGE"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Quantity *</label>
              <input type="number" min={form.type === "ADJUSTMENT" ? 0 : 1} step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Reference</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="PO#, Invoice#..." />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Note</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
          </div>
          {msg && <p role="status" className="text-sm text-teal-400">{msg}</p>}
          <button disabled={saving || !selectedVariant} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50">{saving ? "Saving..." : "Record"}</button>
        </form>
      )}

      {tab === "history" && (
        <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-auto">
          {loading ? <p className="p-6 text-slate-400">Loading…</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400">
                {["Product / Variant", "Type", "Qty", "Before", "After", "Reference", "Date"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr></thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2 text-white">{variantLabel(m)}</td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[m.type] || "bg-slate-700 text-slate-300"}`}>{m.type}</span></td>
                    <td className="px-4 py-2 text-white font-mono">{m.after_qty < m.before_qty ? "-" : "+"}{m.quantity}</td>
                    <td className="px-4 py-2 text-slate-400">{m.before_qty}</td>
                    <td className="px-4 py-2 text-slate-300">{m.after_qty}</td>
                    <td className="px-4 py-2 text-slate-400">{m.reference || "—"}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "low" && dashboard && <StockTable products={dashboard.products} search={search} lowOnly />}

    </div>
  );
}
