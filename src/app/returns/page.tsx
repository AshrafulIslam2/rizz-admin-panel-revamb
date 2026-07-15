"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Return = { id: string; ref_number: string; type: string; customer_name?: string; customer_phone?: string; items: any[]; exchange_items?: any[]; refund_amount: number; status: string; note?: string; original_tx?: string; created_at: string };

const TYPE_LABELS: Record<string, string> = { return: "Return", size_exchange: "Size Exchange", color_exchange: "Color Exchange" };
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-900/40 text-amber-300",
  approved: "bg-emerald-900/40 text-emerald-300",
  rejected: "bg-rose-900/40 text-rose-300",
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "return", customer_name: "", customer_phone: "", original_tx: "", refund_amount: 0, note: "" });
  const [items, setItems] = useState([{ variant_id: "", qty: 1 }]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch(`${API}/returns`).then((r) => r.json());
    setReturns(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`${API}/returns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items }),
    });
    setSaving(false);
    setShowForm(false);
    setItems([{ variant_id: "", qty: 1 }]);
    load();
  }

  async function handleApprove(id: string) {
    if (!confirm("Approve and restock items?")) return;
    await fetch(`${API}/returns/${id}/approve`, { method: "POST" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Returns & Exchange</h1>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">+ New Return</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-slate-800/50 p-6 space-y-4 max-w-2xl">
          <h2 className="text-lg font-semibold text-white">Create Return / Exchange</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
                <option value="return">Return</option>
                <option value="size_exchange">Size Exchange</option>
                <option value="color_exchange">Color Exchange</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Original TX #</label>
              <input value={form.original_tx} onChange={(e) => setForm({ ...form, original_tx: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="TX-000001" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Customer Name</label>
              <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Customer Phone</label>
              <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            {form.type === "return" && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Refund Amount (৳)</label>
                <input type="number" min="0" value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: Number(e.target.value) })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Note</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Returned Items</h3>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <input placeholder="Variant ID" value={item.variant_id} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, variant_id: e.target.value } : it))} className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input type="number" min="1" value={item.qty} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, qty: Number(e.target.value) } : it))} className="w-20 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-rose-400 text-xs">✕</button>}
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { variant_id: "", qty: 1 }])} className="text-xs text-teal-400 hover:text-teal-300">+ Add item</button>
          </div>
          <div className="flex gap-3">
            <button disabled={saving} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50">{saving ? "Saving..." : "Submit"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-slate-700 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-auto">
        {loading ? <p className="p-6 text-slate-400">Loading…</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400">
              {["Ref #", "Type", "Customer", "Items", "Refund", "Status", "Date", ""].map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-mono">{r.ref_number}</td>
                  <td className="px-4 py-3 text-slate-300">{TYPE_LABELS[r.type] || r.type}</td>
                  <td className="px-4 py-3 text-slate-300">{r.customer_name || "—"}{r.customer_phone ? ` · ${r.customer_phone}` : ""}</td>
                  <td className="px-4 py-3 text-slate-400">{Array.isArray(r.items) ? r.items.length : 0}</td>
                  <td className="px-4 py-3 text-white">৳{r.refund_amount}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || "bg-slate-700 text-slate-300"}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && <button onClick={() => handleApprove(r.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Approve</button>}
                  </td>
                </tr>
              ))}
              {returns.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No returns yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
