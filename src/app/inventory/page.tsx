"use client";

import { useEffect, useState } from "react";

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

type LowStock = {
  id: string;
  attributes: any;
  stock_qty: number;
  price: number;
  sku?: string;
  product?: { name: string; slug: string };
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
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"move" | "history" | "low">("move");

  const [form, setForm] = useState({ variant_id: "", type: "STOCK_IN", quantity: "", reference: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const [h, l, s] = await Promise.all([
      fetch(`${API}/inventory/history?limit=100`).then((r) => r.json()),
      fetch(`${API}/inventory/low-stock?threshold=10`).then((r) => r.json()),
      fetch(`${API}/inventory/summary`).then((r) => r.json()),
    ]);
    setHistory(Array.isArray(h) ? h : []);
    setLowStock(Array.isArray(l) ? l : []);
    setSummary(s);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleMove(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch(`${API}/inventory/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
    });
    setSaving(false);
    if (res.ok) { setMsg("Stock movement recorded."); setForm({ ...form, quantity: "", reference: "", note: "" }); load(); }
    else { const d = await res.json(); setMsg(d.message || "Error"); }
  }

  function variantLabel(m: Movement) {
    const a = m.variant?.attributes || {};
    const parts = [m.variant?.product?.name, a.color, a.size].filter(Boolean);
    return parts.join(" / ") || m.variant?.product?.slug || "—";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Inventory Management</h1>

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Qty", value: summary.totalQty?.toLocaleString() },
            { label: "Stock Value", value: `৳${(summary.totalValue || 0).toLocaleString()}` },
            { label: "Purchase Cost", value: `৳${(summary.totalCost || 0).toLocaleString()}` },
            { label: "Out of Stock", value: summary.outOfStock, red: true },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
              <p className="text-xs text-slate-400">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold ${c.red ? "text-rose-400" : "text-white"}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(["move", "history", "low"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
            {t === "move" ? "Stock Movement" : t === "history" ? "History" : `Low Stock (${lowStock.length})`}
          </button>
        ))}
      </div>

      {tab === "move" && (
        <form onSubmit={handleMove} className="rounded-xl border border-white/10 bg-slate-800/50 p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-semibold text-white">Record Movement</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Variant ID *</label>
            <input value={form.variant_id} onChange={(e) => setForm({ ...form, variant_id: e.target.value })} required className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Paste variant ID" />
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
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
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
          {msg && <p className="text-sm text-teal-400">{msg}</p>}
          <button disabled={saving} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50">{saving ? "Saving..." : "Record"}</button>
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
                    <td className="px-4 py-2 text-white font-mono">{m.type === "STOCK_OUT" || m.type === "SALE" || m.type === "DAMAGE" ? "-" : "+"}{m.quantity}</td>
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

      {tab === "low" && (
        <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400">
              {["Product", "Color", "Size", "SKU", "Stock Qty", "Price"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {lowStock.map((v) => (
                <tr key={v.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2 text-white">{v.product?.name || v.product?.slug || "—"}</td>
                  <td className="px-4 py-2 text-slate-300">{(v.attributes as any)?.color || "—"}</td>
                  <td className="px-4 py-2 text-slate-300">{(v.attributes as any)?.size || "—"}</td>
                  <td className="px-4 py-2 text-slate-400 font-mono text-xs">{v.sku || "—"}</td>
                  <td className="px-4 py-2"><span className={`font-bold ${v.stock_qty === 0 ? "text-rose-400" : "text-amber-400"}`}>{v.stock_qty}</span></td>
                  <td className="px-4 py-2 text-slate-300">৳{v.price}</td>
                </tr>
              ))}
              {lowStock.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No low stock items</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
