"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

const STATUSES = ["all", "new", "contacted", "converted", "ignored"];
const SOURCES = ["all", "checkout", "catalog_download"];
const SOURCE_LABELS: Record<string, string> = { checkout: "Checkout", catalog_download: "Catalog Download" };

const STATUS_COLORS: Record<string, string> = {
  new: "bg-amber-50 text-amber-700 border-amber-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ignored: "bg-slate-50 text-slate-500 border-slate-200",
};

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  cart_total: number | null;
  source: string;
  company_name: string | null;
  status: string;
  created_at: string;
};

export default function CheckoutLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeStatus, setActiveStatus] = useState("new");
  const [activeSource, setActiveSource] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/checkout-leads`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) => {
    if (activeStatus !== "all" && l.status !== activeStatus) return false;
    if (activeSource !== "all" && l.source !== activeSource) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return l.phone.includes(q) || (l.name ?? "").toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const counts: Record<string, number> = { all: leads.length };
  STATUSES.slice(1).forEach((s) => { counts[s] = leads.filter((l) => l.status === s).length; });

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      const r = await fetch(`${API}/checkout-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch {
      // ignore
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
            <h1 className="mt-1 text-2xl font-semibold">Checkout Leads</h1>
            <p className="mt-1 text-sm text-slate-400">People who started checkout (gave phone/email) but didn&apos;t place an order — follow up with them.</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
            <p className="text-2xl font-semibold">{counts.new ?? 0}</p>
            <p className="text-xs text-slate-400">new</p>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  activeStatus === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {s} {counts[s] > 0 && <span className="ml-1 opacity-60">{counts[s]}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSource(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activeSource === s ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {s === "all" ? "All Sources" : SOURCE_LABELS[s] ?? s}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or email..."
            className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400 w-64"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              <p className="font-medium text-rose-600">Backend not connected</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No leads match this filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {["Name", "Company", "Phone", "Email", "Source", "Cart Total", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.company_name || "—"}</td>
                    <td className="px-4 py-3">
                      <a href={`tel:${lead.phone}`} className="font-medium text-teal-700 hover:underline">{lead.phone}</a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{lead.cart_total ? `৳${lead.cart_total.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[lead.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(lead.created_at).toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {lead.status !== "contacted" && (
                          <button
                            disabled={busy === lead.id}
                            onClick={() => setStatus(lead.id, "contacted")}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 transition disabled:opacity-50"
                          >
                            Mark Contacted
                          </button>
                        )}
                        {lead.status !== "ignored" && (
                          <button
                            disabled={busy === lead.id}
                            onClick={() => setStatus(lead.id, "ignored")}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
                          >
                            Ignore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
