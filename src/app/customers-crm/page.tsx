"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Customer = { id: string; name: string; phone: string; email?: string; address?: string; total_spend: number; total_orders: number; created_at: string };

export default function CustomersCrmPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);

  async function load(q = "") {
    setLoading(true);
    const data = await fetch(`${API}/crm-customers${q ? `?search=${encodeURIComponent(q)}` : ""}`).then((r) => r.json());
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `${API}/crm-customers/${editing}` : `${API}/crm-customers`;
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    load(search);
  }

  function startEdit(c: Customer) {
    setEditing(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email || "", address: c.address || "" });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete customer?")) return;
    await fetch(`${API}/crm-customers/${id}`, { method: "DELETE" });
    load(search);
  }

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Customers CRM</h1>
        <button onClick={() => { setEditing(null); setForm({ name: "", phone: "", email: "", address: "" }); setShowForm(true); }} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">+ Add Customer</button>
      </div>

      <form onSubmit={doSearch} className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, email..." className="flex-1 max-w-sm rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500" />
        <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">Search</button>
        {search && <button type="button" onClick={() => { setSearch(""); load(); }} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">Clear</button>}
      </form>

      {showForm && (
        <form onSubmit={handleSave} className="rounded-xl border border-white/10 bg-slate-800/50 p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-semibold text-white">{editing ? "Edit Customer" : "Add Customer"}</h2>
          {[
            { key: "name", label: "Name *", required: true },
            { key: "phone", label: "Phone *", required: true },
            { key: "email", label: "Email" },
            { key: "address", label: "Address" },
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
              {["Name", "Phone", "Email", "Orders", "Total Spend", "Joined", ""].map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-400">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{c.total_orders}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">৳{c.total_spend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(c)} className="text-xs text-teal-400 hover:text-teal-300">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-rose-400 hover:text-rose-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No customers found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
