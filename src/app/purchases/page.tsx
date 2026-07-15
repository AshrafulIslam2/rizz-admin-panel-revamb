"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type PO = { id: string; po_number: string; status: string; total_cost: number; note?: string; created_at: string; received_at?: string; supplier?: { name: string }; items: any[] };
type Supplier = { id: string; name: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-900/40 text-amber-300",
  received: "bg-emerald-900/40 text-emerald-300",
  cancelled: "bg-slate-700 text-slate-400",
};

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([{ variant_id: "", qty: 1, cost: 0 }]);
  const [form, setForm] = useState({ supplier_id: "", note: "", total_cost: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [pos, sups] = await Promise.all([
      fetch(`${API}/purchase-orders`).then((r) => r.json()),
      fetch(`${API}/suppliers`).then((r) => r.json()),
    ]);
    setOrders(Array.isArray(pos) ? pos : []);
    setSuppliers(Array.isArray(sups) ? sups : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function totalCost() { return items.reduce((s, i) => s + i.qty * i.cost, 0); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`${API}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, supplier_id: form.supplier_id || null, items, total_cost: totalCost() }),
    });
    setSaving(false);
    setShowForm(false);
    setItems([{ variant_id: "", qty: 1, cost: 0 }]);
    load();
  }

  async function handleReceive(id: string) {
    if (!confirm("Mark this PO as received and update stock?")) return;
    await fetch(`${API}/purchase-orders/${id}/receive`, { method: "POST" });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this purchase order?")) return;
    await fetch(`${API}/purchase-orders/${id}`, { method: "DELETE" });
    load();
  }

  function updateItem(i: number, field: string, value: any) {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">+ New PO</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-slate-800/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Create Purchase Order</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Supplier (optional)</label>
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
                <option value="">No supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Note</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Items</h3>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input placeholder="Variant ID" value={item.variant_id} onChange={(e) => updateItem(i, "variant_id", e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <input type="number" min="1" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(i, "qty", Number(e.target.value))} className="w-20 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <input type="number" min="0" placeholder="Cost ৳" value={item.cost} onChange={(e) => updateItem(i, "cost", Number(e.target.value))} className="w-28 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                  {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-300 text-xs">✕</button>}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems([...items, { variant_id: "", qty: 1, cost: 0 }])} className="mt-2 text-xs text-teal-400 hover:text-teal-300">+ Add item</button>
            <p className="mt-2 text-sm text-slate-300">Total: <span className="font-bold text-white">৳{totalCost().toLocaleString()}</span></p>
          </div>
          <div className="flex gap-3">
            <button disabled={saving} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50">{saving ? "Saving..." : "Create PO"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-slate-700 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-auto">
        {loading ? <p className="p-6 text-slate-400">Loading…</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400">
              {["PO #", "Supplier", "Items", "Total Cost", "Status", "Date", ""].map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-mono font-medium">{po.po_number}</td>
                  <td className="px-4 py-3 text-slate-300">{po.supplier?.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{Array.isArray(po.items) ? po.items.length : 0} items</td>
                  <td className="px-4 py-3 text-white font-medium">৳{po.total_cost.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status] || "bg-slate-700 text-slate-300"}`}>{po.status}</span></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(po.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {po.status === "pending" && <button onClick={() => handleReceive(po.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Receive</button>}
                      <button onClick={() => handleDelete(po.id)} className="text-xs text-rose-400 hover:text-rose-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No purchase orders</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
