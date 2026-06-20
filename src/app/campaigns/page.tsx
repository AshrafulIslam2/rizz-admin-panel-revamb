"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Product = { id: string; name: string; price?: number };

type Campaign = {
  id: string;
  name: string;
  type: string;
  code: string | null;
  requires_code: boolean;
  discount_type: string | null;
  discount_value: number | null;
  buy_qty: number | null;
  get_qty: number | null;
  free_shipping: boolean;
  free_gift_product_id: string | null;
  usage_limit: number | null;
  used_count: number;
  product_ids: string[];
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  image_url: string | null;
  headline: string | null;
  body: string | null;
};

const EMPTY = {
  name: "",
  code: "",
  requires_code: false,
  discount_type: "NONE" as "NONE" | "PERCENT" | "FIXED" | "BOGO",
  discount_value: 0,
  buy_qty: 1,
  get_qty: 1,
  free_shipping: false,
  free_gift_product_id: "",
  usage_limit: "" as number | "",
  product_ids: [] as string[],
  start_date: "",
  end_date: "",
  is_active: true,
  image_url: "",
  headline: "",
  body: "",
};

function mechanicLabel(c: Campaign): string {
  const parts: string[] = [];
  if (c.discount_type === "PERCENT") parts.push(`${c.discount_value}% off`);
  if (c.discount_type === "FIXED") parts.push(`৳${c.discount_value} off`);
  if (c.discount_type === "BOGO") parts.push(`Buy ${c.buy_qty} Get ${c.get_qty} Free`);
  if (c.free_shipping) parts.push("Free Shipping");
  if (c.free_gift_product_id) parts.push("Free Gift");
  return parts.length > 0 ? parts.join(" · ") : "No discount mechanic";
}

async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${API}/uploads`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`Upload failed → ${r.status}`);
  const data = await r.json();
  return data.url;
}

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
const label = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      onChange(await uploadToCloudinary(file));
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className={label}>Banner Image</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload below" className={field} />
      <div className="flex items-center gap-3">
        <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer transition">
          {uploading ? "Uploading…" : "↑ Upload Image"}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`${API}/campaigns`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCampaigns(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
    fetch(`${API}/products`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data.map((p: any) => ({ id: p.id, name: p.name, price: p.price })) : []))
      .catch(() => setProducts([]));
  }, []);

  function u<K extends keyof typeof EMPTY>(key: K, val: (typeof EMPTY)[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  function toggleProduct(id: string) {
    setDraft((d) => ({
      ...d,
      product_ids: d.product_ids.includes(id) ? d.product_ids.filter((p) => p !== id) : [...d.product_ids, id],
    }));
  }

  async function save() {
    if (!draft.name.trim()) {
      setMsg("Campaign name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: draft.name,
        is_active: draft.is_active,
        product_ids: draft.product_ids,
        free_shipping: draft.free_shipping,
        image_url: draft.image_url || undefined,
        headline: draft.headline || undefined,
        body: draft.body || undefined,
        start_date: draft.start_date ? new Date(draft.start_date).toISOString() : undefined,
        end_date: draft.end_date ? new Date(draft.end_date).toISOString() : undefined,
        free_gift_product_id: draft.free_gift_product_id || undefined,
        requires_code: draft.requires_code,
        code: draft.code || undefined,
        usage_limit: draft.usage_limit === "" ? undefined : Number(draft.usage_limit),
      };
      if (draft.discount_type === "PERCENT" || draft.discount_type === "FIXED") {
        payload.discount_type = draft.discount_type;
        payload.discount_value = Number(draft.discount_value);
      } else if (draft.discount_type === "BOGO") {
        payload.discount_type = "BOGO";
        payload.buy_qty = Number(draft.buy_qty);
        payload.get_qty = Number(draft.get_qty);
      }

      const r = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        body: JSON.stringify({ is_active: !campaign.is_active }),
      });
      if (!r.ok) throw new Error();
      setCampaigns((cs) => cs.map((c) => c.id === campaign.id ? { ...c, is_active: !c.is_active } : c));
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
            <h1 className="mt-1 text-2xl font-semibold">Campaigns</h1>
            <p className="mt-1 text-sm text-slate-400">Discounts, BOGO deals, free shipping, free gifts, and promo codes.</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition shrink-0"
          >
            + New
          </button>
        </header>

        {msg && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{msg}</div>}

        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
            <h2 className="font-semibold text-slate-900">New Campaign</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={label}>Campaign Name</p>
                <input value={draft.name} onChange={(e) => u("name", e.target.value)} placeholder="Summer Sale" className={field} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 self-end pb-2.5">
                <input type="checkbox" checked={draft.is_active} onChange={(e) => u("is_active", e.target.checked)} className="h-4 w-4" />
                Active (show on storefront)
              </label>
            </div>

            <ImageField value={draft.image_url} onChange={(url) => u("image_url", url)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={label}>Headline</p>
                <input value={draft.headline} onChange={(e) => u("headline", e.target.value)} placeholder="70% Off — This Weekend Only" className={field} />
              </div>
              <div>
                <p className={label}>Body</p>
                <input value={draft.body} onChange={(e) => u("body", e.target.value)} placeholder="Short description for the homepage banner" className={field} />
              </div>
            </div>

            {/* Product selector */}
            <div>
              <p className={label}>Apply to Products ({draft.product_ids.length} selected, leave empty = all products)</p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {products.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">No products found.</p>
                ) : (
                  products.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={draft.product_ids.includes(p.id)} onChange={() => toggleProduct(p.id)} className="h-4 w-4" />
                      <span className="text-sm text-slate-800">{p.name}</span>
                      {p.price ? <span className="ml-auto text-xs text-slate-400">৳{p.price}</span> : null}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Discount mechanic */}
            <div>
              <p className={label}>Discount Mechanic</p>
              <select value={draft.discount_type} onChange={(e) => u("discount_type", e.target.value as typeof draft.discount_type)} className={field}>
                <option value="NONE">None (free shipping / gift only)</option>
                <option value="PERCENT">Percentage Off</option>
                <option value="FIXED">Fixed Cash Amount Off</option>
                <option value="BOGO">Buy X Get Y Free</option>
              </select>
            </div>

            {draft.discount_type === "PERCENT" && (
              <div>
                <p className={label}>Percent Off (%)</p>
                <input type="number" min={1} max={100} value={draft.discount_value} onChange={(e) => u("discount_value", Number(e.target.value))} placeholder="70" className={field} />
              </div>
            )}
            {draft.discount_type === "FIXED" && (
              <div>
                <p className={label}>Amount Off Per Unit (৳)</p>
                <input type="number" min={1} value={draft.discount_value} onChange={(e) => u("discount_value", Number(e.target.value))} placeholder="600" className={field} />
              </div>
            )}
            {draft.discount_type === "BOGO" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={label}>Buy Quantity</p>
                  <input type="number" min={1} value={draft.buy_qty} onChange={(e) => u("buy_qty", Number(e.target.value))} placeholder="1" className={field} />
                </div>
                <div>
                  <p className={label}>Get Free Quantity</p>
                  <input type="number" min={1} value={draft.get_qty} onChange={(e) => u("get_qty", Number(e.target.value))} placeholder="1" className={field} />
                  <p className="mt-1 text-xs text-slate-400">e.g. Buy 1 = 1, Get 1 Free = 1. For Buy 1 Get 2 Free, set Get to 2.</p>
                </div>
              </div>
            )}

            {/* Free shipping & gift */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
                <input type="checkbox" checked={draft.free_shipping} onChange={(e) => u("free_shipping", e.target.checked)} className="h-4 w-4" />
                <span className="text-sm font-medium text-slate-800">Free Delivery on this campaign</span>
              </label>
              <div>
                <p className={label}>Free Gift Product (optional)</p>
                <select value={draft.free_gift_product_id} onChange={(e) => u("free_gift_product_id", e.target.value)} className={field}>
                  <option value="">No free gift</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* Promo code */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={draft.requires_code} onChange={(e) => u("requires_code", e.target.checked)} className="h-4 w-4" />
                <span className="text-sm font-medium text-slate-800">Require a promo code to apply (otherwise applies automatically)</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={label}>Promo Code</p>
                  <input value={draft.code} onChange={(e) => u("code", e.target.value.toUpperCase())} placeholder="RIZZ70" className={field + " font-mono uppercase"} />
                </div>
                <div>
                  <p className={label}>Usage Limit (optional)</p>
                  <input type="number" min={1} value={draft.usage_limit} onChange={(e) => u("usage_limit", e.target.value === "" ? "" : Number(e.target.value))} placeholder="Unlimited" className={field} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={label}>Start Date</p>
                <input type="date" value={draft.start_date} onChange={(e) => u("start_date", e.target.value)} className={field} />
              </div>
              <div>
                <p className={label}>End Date</p>
                <input type="date" value={draft.end_date} onChange={(e) => u("end_date", e.target.value)} className={field} />
              </div>
            </div>

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
            No campaigns yet. Create your first discount, BOGO deal, or promo code.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      {mechanicLabel(c)}
                    </span>
                    {!c.is_active && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Inactive</span>}
                  </div>
                  {c.headline && <p className="mt-1 text-sm text-slate-600">{c.headline}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {c.product_ids.length === 0 ? "Applies to all products" : `${c.product_ids.length} product(s)`}
                    {c.requires_code && c.code && (
                      <> · Code: <span className="font-mono font-semibold">{c.code}</span> ({c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""} used)</>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => toggle(c)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${c.is_active ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                    {c.is_active ? "Deactivate" : "Activate"}
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
