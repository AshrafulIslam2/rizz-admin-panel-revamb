"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Supplier = { id: string; name: string; phone?: string; email?: string; address?: string; note?: string; _count?: { purchase_orders: number } };

const EMPTY = { name: "", phone: "", email: "", address: "", note: "" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch(`${API}/suppliers`).then((r) => r.json());
    setSuppliers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(s: Supplier) {
    setEditing(s.id);
    setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", note: s.note || "" });
    setShowForm(true);
  }

  function startAdd() { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `${API}/suppliers/${editing}` : `${API}/suppliers`;
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this supplier?")) return;
    await fetch(`${API}/suppliers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Suppliers</h1>
        <button onClick={startAdd} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">+ Add Supplier</button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="rounded-xl border border-white/10 bg-slate-800/50 p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-semibold text-white">{editing ? "Edit Supplier" : "New Supplier"}</h2>
          {[
            { key: "name", label: "Name *", required: true },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
            { key: "address", label: "Address" },
            { key: "note", label: "Note" },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={required} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
          ))}
          <div className="flex gap-3">
            <button disabled={saving} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-slate-700 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-auto">
        {loading ? <p className="p-6 text-slate-400">Loading…</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400">
              {["Name", "Phone", "Email", "Address", "Orders", ""].map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-slate-300">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{s.address || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{s._count?.purchase_orders ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(s)} className="text-xs text-teal-400 hover:text-teal-300">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-rose-400 hover:text-rose-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No suppliers yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
