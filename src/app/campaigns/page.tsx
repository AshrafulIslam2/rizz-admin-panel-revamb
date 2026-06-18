"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Campaign = {
  id: string;
  name: string;
  type: "announcement" | "banner" | "discount";
  content: string;
  code?: string;
  discountValue?: number;
  discountType?: "flat" | "percent";
  isActive: boolean;
  startDate?: string;
  endDate?: string;
};

const EMPTY: Omit<Campaign, "id"> = {
  name: "",
  type: "announcement",
  content: "",
  code: "",
  discountValue: 0,
  discountType: "flat",
  isActive: true,
};

const TYPE_COLORS: Record<string, string> = {
  announcement: "bg-blue-50 text-blue-700 border-blue-200",
  banner: "bg-purple-50 text-purple-700 border-purple-200",
  discount: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Omit<Campaign, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`${API}/campaigns`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCampaigns(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  function u<K extends keyof typeof EMPTY>(key: K, val: (typeof EMPTY)[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  async function save() {
    if (!draft.name.trim() || !draft.content.trim()) {
      setMsg("Name and content are required.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const created = await r.json();
      setCampaigns((c) => [created, ...c]);
      setDraft(EMPTY);
      setShowForm(false);
      setMsg("Campaign created.");
    } catch {
      setMsg("Failed to create. Check API connection.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  async function toggle(campaign: Campaign) {
    try {
      const r = await fetch(`${API}/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !campaign.isActive }),
      });
      if (!r.ok) throw new Error();
      setCampaigns((cs) => cs.map((c) => c.id === campaign.id ? { ...c, isActive: !c.isActive } : c));
    } catch {
      setMsg("Toggle failed.");
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this campaign?")) return;
    try {
      await fetch(`${API}/campaigns/${id}`, { method: "DELETE" });
      setCampaigns((cs) => cs.filter((c) => c.id !== id));
    } catch {
      setMsg("Delete failed.");
      setTimeout(() => setMsg(null), 3000);
    }
  }

  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
  const label = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
            <h1 className="mt-1 text-2xl font-semibold">Campaigns</h1>
            <p className="mt-1 text-sm text-slate-400">Announcements, banners, and discount codes for the storefront.</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition"
          >
            + New
          </button>
        </header>

        {msg && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{msg}</div>}

        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">New Campaign</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={label}>Name</p>
                <input value={draft.name} onChange={(e) => u("name", e.target.value)} placeholder="Summer Sale" className={field} />
              </div>
              <div>
                <p className={label}>Type</p>
                <select value={draft.type} onChange={(e) => u("type", e.target.value as any)} className={field}>
                  <option value="announcement">Announcement Bar</option>
                  <option value="banner">Homepage Banner</option>
                  <option value="discount">Discount Code</option>
                </select>
              </div>
            </div>
            <div>
              <p className={label}>Content / Message</p>
              <input value={draft.content} onChange={(e) => u("content", e.target.value)} placeholder="Free shipping on orders above ৳5,000" className={field} />
            </div>
            {draft.type === "discount" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className={label}>Discount Code</p>
                  <input value={draft.code ?? ""} onChange={(e) => u("code", e.target.value)} placeholder="RIZZ10" className={field} />
                </div>
                <div>
                  <p className={label}>Value</p>
                  <input type="number" value={draft.discountValue ?? 0} onChange={(e) => u("discountValue", Number(e.target.value))} className={field} />
                </div>
                <div>
                  <p className={label}>Type</p>
                  <select value={draft.discountType ?? "flat"} onChange={(e) => u("discountType", e.target.value as any)} className={field}>
                    <option value="flat">Flat (৳)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={label}>Start Date</p>
                <input type="date" value={draft.startDate ?? ""} onChange={(e) => u("startDate", e.target.value)} className={field} />
              </div>
              <div>
                <p className={label}>End Date</p>
                <input type="date" value={draft.endDate ?? ""} onChange={(e) => u("endDate", e.target.value)} className={field} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => u("isActive", e.target.checked)} className="h-4 w-4" />
              Active (show on storefront)
            </label>
            <div className="flex gap-3 pt-2 border-t border-slate-200">
              <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50">
                {saving ? "Saving..." : "Create Campaign"}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white border border-slate-200" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
            No campaigns yet. Create your first announcement, banner, or discount code.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[c.type]}`}>{c.type}</span>
                    {!c.isActive && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Inactive</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{c.content}</p>
                  {c.code && <p className="mt-1 text-xs text-slate-500">Code: <span className="font-mono font-semibold">{c.code}</span> · {c.discountValue}{c.discountType === "percent" ? "%" : "৳"} off</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => toggle(c)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${c.isActive ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => remove(c.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
