"use client";

import { useEffect, useMemo, useState } from "react";
import { CLIENT_API_BASE } from "@/lib/api-base";

const API = CLIENT_API_BASE;

type ApiVariant = { price: number; sale_price?: number | null; production_price?: number | null; stock_qty?: number; reserved_qty?: number };
type ApiProduct = {
  id: string;
  name: string;
  status?: string;
  is_published?: boolean;
  media?: { media_url: string; is_primary?: boolean; media_type?: string }[];
  variants?: ApiVariant[];
};

/** What the picker needs per product. */
type Product = {
  id: string;
  name: string;
  image: string | null;
  live: boolean;
  /** Lowest price a customer actually pays — sale price if set, else regular. */
  sellPrice: number;
  /** Regular price of that same cheapest variant, when it is on sale. */
  regularPrice: number | null;
  /** Lowest production cost entered on any variant; null when none entered. */
  productionPrice: number | null;
  stock: number;
};

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

type DiscountType = "NONE" | "PERCENT" | "FIXED" | "BOGO";

const EMPTY = {
  name: "",
  code: "",
  requires_code: false,
  discount_type: "NONE" as DiscountType,
  discount_value: 0,
  buy_qty: 1,
  get_qty: 1,
  free_shipping: false,
  free_gift_product_id: "",
  usage_limit: "" as number | "",
  product_ids: [] as string[],
  /** datetime-local strings, in the admin's local time (Dhaka). */
  start_date: "",
  end_date: "",
  is_active: true,
  image_url: "",
  headline: "",
  body: "",
};
type Draft = typeof EMPTY;

// ── Helpers ─────────────────────────────────────────────────────────────────

function toProduct(p: ApiProduct): Product {
  const variants = p.variants ?? [];
  const cheapest = variants.length
    ? variants.reduce((min, v) => ((v.sale_price || v.price) < (min.sale_price || min.price) ? v : min))
    : null;
  const sellPrice = cheapest ? (cheapest.sale_price && cheapest.sale_price > 0 ? cheapest.sale_price : cheapest.price) : 0;
  const costs = variants.map((v) => v.production_price ?? 0).filter((c) => c > 0);
  const media = (p.media ?? []).filter((m) => m.media_url && (m.media_type ?? "IMAGE") !== "VIDEO");
  return {
    id: p.id,
    name: p.name,
    image: (media.find((m) => m.is_primary) ?? media[0])?.media_url ?? null,
    live: String(p.status ?? "").toUpperCase() === "ACTIVE" && p.is_published !== false,
    sellPrice,
    regularPrice: cheapest && cheapest.sale_price && cheapest.sale_price > 0 && cheapest.sale_price < cheapest.price ? cheapest.price : null,
    productionPrice: costs.length ? Math.min(...costs) : null,
    stock: variants.reduce((s, v) => s + Math.max(0, (v.stock_qty ?? 0) - (v.reserved_qty ?? 0)), 0),
  };
}

const taka = (n: number) => `৳${Math.round(n).toLocaleString()}`;

/**
 * What the customer pays per pair once the campaign applies.
 * Mirrors the backend: discounts come off the selling price of each pair in the cart.
 */
function pricePerPairAfter(sell: number, d: Pick<Draft, "discount_type" | "discount_value" | "buy_qty" | "get_qty">): number {
  if (d.discount_type === "PERCENT") return Math.max(0, sell * (1 - Math.min(100, Number(d.discount_value) || 0) / 100));
  if (d.discount_type === "FIXED") return Math.max(0, sell - (Number(d.discount_value) || 0));
  if (d.discount_type === "BOGO") {
    const buy = Math.max(1, Number(d.buy_qty) || 1);
    const get = Math.max(1, Number(d.get_qty) || 1);
    return (sell * buy) / (buy + get); // average per pair across one Buy+Get group
  }
  return sell;
}

/** ISO from the API -> value for <input type="datetime-local"> in the browser's local time. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO. The browser reads it as local (Dhaka) time. */
function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString());
}

/** "13 Nov 2026, 12:00 PM" in Dhaka time. */
function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return "0 minutes";
  const mins = Math.round(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (m && days === 0) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  return parts.join(" ") || "under a minute";
}

type Status = { label: string; cls: string };
function campaignStatus(c: { is_active: boolean; start_date: string | null; end_date: string | null }, now = new Date()): Status {
  if (!c.is_active) return { label: "Inactive", cls: "border-slate-200 bg-slate-100 text-slate-500" };
  if (c.start_date && new Date(c.start_date) > now) return { label: "Scheduled", cls: "border-sky-200 bg-sky-50 text-sky-700" };
  if (c.end_date && new Date(c.end_date) < now) return { label: "Ended", cls: "border-rose-200 bg-rose-50 text-rose-700" };
  return { label: "Live now", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function mechanicLabel(c: Pick<Campaign, "discount_type" | "discount_value" | "buy_qty" | "get_qty" | "free_shipping" | "free_gift_product_id">): string {
  const parts: string[] = [];
  if (c.discount_type === "PERCENT") parts.push(`${c.discount_value}% off`);
  if (c.discount_type === "FIXED") parts.push(`৳${c.discount_value} off each pair`);
  if (c.discount_type === "BOGO") parts.push(`Buy ${c.buy_qty} Get ${c.get_qty} Free`);
  if (c.free_shipping) parts.push("Free Delivery");
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

async function errorText(r: Response): Promise<string> {
  try {
    const j = await r.json();
    return Array.isArray(j?.message) ? j.message.join(", ") : j?.message || `Error ${r.status}`;
  } catch {
    return `Error ${r.status}`;
  }
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
      <div className="flex gap-3">
        {value && <img src={value} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover" />}
        <div className="flex-1 space-y-2">
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload below" className={field} />
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
              {uploading ? "Uploading…" : "↑ Upload Image"}
              <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
            </label>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  /** null = creating a new campaign; otherwise the id being edited. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    fetch(`${API}/campaigns`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCampaigns(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
    fetch(`${API}/products`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data.map(toProduct) : []))
      .catch(() => setProducts([]));
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function u<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 5000);
  }

  function toggleProduct(id: string) {
    setDraft((d) => ({
      ...d,
      product_ids: d.product_ids.includes(id) ? d.product_ids.filter((p) => p !== id) : [...d.product_ids, id],
    }));
  }

  function openNew() {
    setEditingId(null);
    setDraft({ ...EMPTY, start_date: nowLocalInput() });
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setDraft({
      name: c.name,
      code: c.code ?? "",
      requires_code: c.requires_code,
      discount_type: (["PERCENT", "FIXED", "BOGO"].includes(c.discount_type ?? "") ? c.discount_type : "NONE") as DiscountType,
      discount_value: c.discount_value ?? 0,
      buy_qty: c.buy_qty ?? 1,
      get_qty: c.get_qty ?? 1,
      free_shipping: c.free_shipping,
      free_gift_product_id: c.free_gift_product_id ?? "",
      usage_limit: c.usage_limit ?? "",
      product_ids: c.product_ids ?? [],
      start_date: isoToLocalInput(c.start_date),
      end_date: isoToLocalInput(c.end_date),
      is_active: c.is_active,
      image_url: c.image_url ?? "",
      headline: c.headline ?? "",
      body: c.body ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setDraft(EMPTY);
  }

  // ── Schedule preview ──
  const startAt = draft.start_date ? new Date(draft.start_date) : null;
  const endAt = draft.end_date ? new Date(draft.end_date) : null;
  const windowError = startAt && endAt && endAt <= startAt ? "End must be after the start." : null;
  const draftStatus = campaignStatus({
    is_active: draft.is_active,
    start_date: localInputToIso(draft.start_date),
    end_date: localInputToIso(draft.end_date),
  });

  function setEndOfStartDay() {
    const base = draft.start_date ? draft.start_date.slice(0, 10) : nowLocalInput().slice(0, 10);
    u("end_date", `${base}T23:59`);
  }
  function setEndAfterDays(days: number) {
    const base = startAt ?? new Date();
    const d = new Date(base.getTime() + days * 86400000);
    u("end_date", `${isoToLocalInput(d.toISOString()).slice(0, 10)}T23:59`);
  }

  async function save() {
    if (!draft.name.trim()) return flash("Campaign name is required.", false);
    if (windowError) return flash(windowError, false);
    if (draft.requires_code && !draft.code.trim()) return flash("Enter a promo code, or untick 'Require a promo code'.", false);
    if ((draft.discount_type === "PERCENT" || draft.discount_type === "FIXED") && !(Number(draft.discount_value) > 0)) {
      return flash("Enter the discount amount.", false);
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: draft.name.trim(),
        is_active: draft.is_active,
        product_ids: draft.product_ids,
        free_shipping: draft.free_shipping,
        // On edit, an emptied box must clear the stored value, so send null / "".
        image_url: draft.image_url || (editingId ? null : undefined),
        headline: draft.headline || (editingId ? null : undefined),
        body: draft.body || (editingId ? null : undefined),
        free_gift_product_id: draft.free_gift_product_id || (editingId ? "" : undefined),
        requires_code: draft.requires_code,
        code: draft.code || (editingId ? "" : undefined),
        usage_limit: draft.usage_limit === "" ? (editingId ? null : undefined) : Number(draft.usage_limit),
        discount_type: draft.discount_type === "NONE" ? (editingId ? "" : undefined) : draft.discount_type,
      };
      // Dates: the backend treats null as "no limit"; create omits empties.
      const start = localInputToIso(draft.start_date);
      const end = localInputToIso(draft.end_date);
      if (editingId) {
        payload.start_date = start;
        payload.end_date = end;
      } else {
        if (start) payload.start_date = start;
        if (end) payload.end_date = end;
      }
      if (draft.discount_type === "PERCENT" || draft.discount_type === "FIXED") {
        payload.discount_value = Number(draft.discount_value);
      } else if (draft.discount_type === "BOGO") {
        payload.buy_qty = Number(draft.buy_qty);
        payload.get_qty = Number(draft.get_qty);
      }

      const r = await fetch(editingId ? `${API}/campaigns/${editingId}` : `${API}/campaigns`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await errorText(r));
      const savedCampaign: Campaign = await r.json();
      setCampaigns((cs) => (editingId ? cs.map((c) => (c.id === editingId ? savedCampaign : c)) : [savedCampaign, ...cs]));
      const st = campaignStatus(savedCampaign);
      flash(`${editingId ? "Campaign updated" : "Campaign created"} — ${st.label.toLowerCase()}.${st.label === "Live now" ? " It shows on the homepage within a minute." : ""}`);
      closeForm();
    } catch (e: any) {
      flash(e?.message || "Failed to save.", false);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(campaign: Campaign) {
    try {
      const r = await fetch(`${API}/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !campaign.is_active }),
      });
      if (!r.ok) throw new Error(await errorText(r));
      setCampaigns((cs) => cs.map((c) => (c.id === campaign.id ? { ...c, is_active: !c.is_active } : c)));
    } catch (e: any) {
      flash(e?.message || "Toggle failed.", false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this campaign?")) return;
    try {
      const r = await fetch(`${API}/campaigns/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await errorText(r));
      setCampaigns((cs) => cs.filter((c) => c.id !== id));
      if (editingId === id) closeForm();
    } catch (e: any) {
      flash(e?.message || "Delete failed.", false);
    }
  }

  const visibleProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
    // Live products first, then by name.
    return [...list].sort((a, b) => Number(b.live) - Number(a.live) || a.name.localeCompare(b.name));
  }, [products, productSearch]);

  const hasPriceEffect = draft.discount_type !== "NONE";
  const lossCount = draft.product_ids.filter((id) => {
    const p = productById.get(id);
    return p && p.productionPrice !== null && pricePerPairAfter(p.sellPrice, draft) < p.productionPrice;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-end justify-between gap-4 rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
            <h1 className="mt-1 text-2xl font-semibold">Campaigns</h1>
            <p className="mt-1 text-sm text-slate-400">Discounts, BOGO deals, free delivery, free gifts, and promo codes.</p>
          </div>
          <button onClick={() => (showForm ? closeForm() : openNew())}
            className="shrink-0 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600">
            {showForm ? "Close" : "+ New"}
          </button>
        </header>

        {msg && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-teal-200 bg-teal-50 text-teal-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {msg.text}
          </div>
        )}

        {showForm && (
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">{editingId ? "Edit Campaign" : "New Campaign"}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={label}>Campaign Name</p>
                <input value={draft.name} onChange={(e) => u("name", e.target.value)} placeholder="Winter Sale" className={field} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={draft.is_active} onChange={(e) => u("is_active", e.target.checked)} className="h-4 w-4" />
                Active (show on storefront)
              </label>
            </div>

            <ImageField value={draft.image_url} onChange={(url) => u("image_url", url)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={label}>Headline</p>
                <input value={draft.headline} onChange={(e) => u("headline", e.target.value)} placeholder="20% Off — This Weekend Only" className={field} />
              </div>
              <div>
                <p className={label}>Body</p>
                <input value={draft.body} onChange={(e) => u("body", e.target.value)} placeholder="Short description for the homepage banner" className={field} />
              </div>
            </div>

            {/* ── Discount mechanic ── */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className={label}>Discount Mechanic</p>
              <select value={draft.discount_type} onChange={(e) => u("discount_type", e.target.value as DiscountType)} className={field}>
                <option value="NONE">None (free delivery / gift only)</option>
                <option value="PERCENT">Percentage Off</option>
                <option value="FIXED">Fixed Cash Amount Off (per pair)</option>
                <option value="BOGO">Buy X Get Y Free</option>
              </select>

              {draft.discount_type === "PERCENT" && (
                <div className="mt-3">
                  <p className={label}>Percent Off (%)</p>
                  <input type="number" min={1} max={100} value={draft.discount_value} onChange={(e) => u("discount_value", Number(e.target.value))} placeholder="20" className={field} />
                </div>
              )}
              {draft.discount_type === "FIXED" && (
                <div className="mt-3">
                  <p className={label}>Amount Off Per Pair (৳)</p>
                  <input type="number" min={1} value={draft.discount_value} onChange={(e) => u("discount_value", Number(e.target.value))} placeholder="200" className={field} />
                </div>
              )}
              {draft.discount_type === "BOGO" && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className={label}>Buy Quantity</p>
                    <input type="number" min={1} value={draft.buy_qty} onChange={(e) => u("buy_qty", Number(e.target.value))} className={field} />
                  </div>
                  <div>
                    <p className={label}>Get Free Quantity</p>
                    <input type="number" min={1} value={draft.get_qty} onChange={(e) => u("get_qty", Number(e.target.value))} className={field} />
                  </div>
                </div>
              )}

              {/* Which price the discount comes off */}
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Taken off the selling price</span> — the sale price if the
                variant has one, otherwise the regular price — for each pair in the cart. It never touches the
                production cost.
                {draft.discount_type === "PERCENT" && <> Example: ৳1,400 selling price, {Number(draft.discount_value) || 0}% off → customer pays {taka(pricePerPairAfter(1400, draft))}.</>}
                {draft.discount_type === "FIXED" && <> Example: ৳1,400 selling price, ৳{Number(draft.discount_value) || 0} off → customer pays {taka(pricePerPairAfter(1400, draft))} per pair.</>}
                {draft.discount_type === "BOGO" && <> Counted per product: for every {draft.buy_qty} bought, {draft.get_qty} more of the same product is free. Example: ৳1,400 each, {Number(draft.buy_qty) + Number(draft.get_qty)} pairs in the cart → customer pays {taka(1400 * Number(draft.buy_qty))}, about {taka(pricePerPairAfter(1400, draft))} a pair.</>}
              </div>
            </div>

            {/* ── Product selector ── */}
            <div>
              <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                <p className={label + " mb-0"}>
                  Apply to Products ({draft.product_ids.length} selected — leave empty for all products)
                </p>
                <div className="flex gap-3 text-xs">
                  <button type="button" onClick={() => u("product_ids", Array.from(new Set([...draft.product_ids, ...visibleProducts.map((p) => p.id)])))}
                    className="font-semibold text-teal-700 hover:underline">Select shown</button>
                  <button type="button" onClick={() => u("product_ids", [])} className="font-semibold text-slate-500 hover:underline">Clear</button>
                </div>
              </div>
              <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products…" className={field + " mb-2"} />

              {hasPriceEffect && lossCount > 0 && (
                <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {lossCount} selected product{lossCount === 1 ? "" : "s"} would sell below production cost with this discount.
                </p>
              )}

              <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {visibleProducts.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">{products.length === 0 ? "Loading products…" : "No product matches."}</p>
                ) : (
                  visibleProducts.map((p) => {
                    const checked = draft.product_ids.includes(p.id);
                    const after = pricePerPairAfter(p.sellPrice, draft);
                    const margin = p.productionPrice !== null ? after - p.productionPrice : null;
                    return (
                      <label key={p.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ${checked ? "bg-teal-50/60" : "hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleProduct(p.id)} className="h-4 w-4 shrink-0" />
                        {p.image ? (
                          <img src={p.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] text-slate-400">No image</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-slate-800">
                            {p.name}
                            {!p.live && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Draft</span>}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Production {p.productionPrice !== null ? taka(p.productionPrice) : "not set"} · {p.stock} in stock
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {p.regularPrice && <span className="mr-1 text-xs font-normal text-slate-400 line-through">{taka(p.regularPrice)}</span>}
                            {p.sellPrice > 0 ? taka(p.sellPrice) : "—"}
                          </p>
                          {hasPriceEffect && p.sellPrice > 0 && (
                            <p className={`text-xs ${margin !== null && margin < 0 ? "font-semibold text-rose-600" : "text-teal-700"}`}>
                              → {taka(after)}
                              {margin !== null && <> · {margin < 0 ? "loss" : "profit"} {taka(Math.abs(margin))}</>}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Prices shown are for the cheapest variant. Production cost comes from each variant&apos;s production price.
              </p>
            </div>

            {/* ── Free delivery & gift ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
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

            {/* ── Promo code ── */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={draft.requires_code} onChange={(e) => u("requires_code", e.target.checked)} className="h-4 w-4" />
                <span className="text-sm font-medium text-slate-800">Require a promo code (otherwise applies automatically and shows on the homepage)</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={label}>Promo Code</p>
                  <input value={draft.code} onChange={(e) => u("code", e.target.value.toUpperCase())} placeholder="RIZZ20" className={field + " font-mono uppercase"} />
                </div>
                <div>
                  <p className={label}>Usage Limit (optional)</p>
                  <input type="number" min={1} value={draft.usage_limit} onChange={(e) => u("usage_limit", e.target.value === "" ? "" : Number(e.target.value))} placeholder="Unlimited" className={field} />
                </div>
              </div>
            </div>

            {/* ── Schedule ── */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={label}>Starts</p>
                  <input type="datetime-local" value={draft.start_date} onChange={(e) => u("start_date", e.target.value)} className={field} />
                  <button type="button" onClick={() => u("start_date", nowLocalInput())} className="mt-1 text-xs font-semibold text-teal-700 hover:underline">Now</button>
                  {draft.start_date && <button type="button" onClick={() => u("start_date", "")} className="ml-3 mt-1 text-xs text-slate-500 hover:underline">Clear</button>}
                </div>
                <div>
                  <p className={label}>Ends</p>
                  <input type="datetime-local" value={draft.end_date} onChange={(e) => u("end_date", e.target.value)} className={field} />
                  <div className="mt-1 flex flex-wrap gap-3 text-xs">
                    <button type="button" onClick={setEndOfStartDay} className="font-semibold text-teal-700 hover:underline">End of that day</button>
                    <button type="button" onClick={() => setEndAfterDays(3)} className="font-semibold text-teal-700 hover:underline">+3 days</button>
                    <button type="button" onClick={() => setEndAfterDays(7)} className="font-semibold text-teal-700 hover:underline">+7 days</button>
                    {draft.end_date && <button type="button" onClick={() => u("end_date", "")} className="text-slate-500 hover:underline">No end</button>}
                  </div>
                </div>
              </div>

              <div className={`rounded-lg px-3 py-2.5 text-sm ${windowError ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-700"}`}>
                {windowError ? (
                  windowError
                ) : (
                  <>
                    <span className={`mr-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${draftStatus.cls}`}>{draftStatus.label}</span>
                    {startAt ? fmtDateTime(startAt) : "Starts as soon as it's saved"} → {endAt ? fmtDateTime(endAt) : "no end date"}
                    {startAt && endAt && <span className="font-semibold"> · runs {fmtDuration(endAt.getTime() - startAt.getTime())}</span>}
                    {!startAt && endAt && endAt > new Date() && <span className="font-semibold"> · {fmtDuration(endAt.getTime() - Date.now())} left</span>}
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Times are Bangladesh time. A campaign shows on the homepage only while it&apos;s live and doesn&apos;t need a promo code.</p>
            </div>

            <div className="flex gap-3 border-t border-slate-200 pt-4">
              <button onClick={save} disabled={saving || Boolean(windowError)}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Campaign"}
              </button>
              <button onClick={closeForm} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
            No campaigns yet. Create your first discount, BOGO deal, or promo code.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const st = campaignStatus(c);
              const thumbs = c.product_ids.map((id) => productById.get(id)).filter(Boolean).slice(0, 5) as Product[];
              return (
                <div key={c.id} className={`flex items-start justify-between gap-4 rounded-2xl border bg-white p-5 ${editingId === c.id ? "border-teal-400" : "border-slate-200"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        {mechanicLabel(c)}
                      </span>
                    </div>
                    {c.headline && <p className="mt-1 text-sm text-slate-600">{c.headline}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {c.start_date ? fmtDateTime(new Date(c.start_date)) : "No start"} → {c.end_date ? fmtDateTime(new Date(c.end_date)) : "no end"}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      {thumbs.length > 0 && (
                        <div className="flex -space-x-2">
                          {thumbs.map((p) => p.image
                            ? <img key={p.id} src={p.image} alt="" title={p.name} className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                            : <div key={p.id} title={p.name} className="h-7 w-7 rounded-full border-2 border-white bg-slate-200" />)}
                        </div>
                      )}
                      <span>{c.product_ids.length === 0 ? "Applies to all products" : `${c.product_ids.length} product(s)`}</span>
                      {c.requires_code && c.code && (
                        <span>· Code <span className="font-mono font-semibold">{c.code}</span> ({c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""} used)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button onClick={() => openEdit(c)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                      Edit
                    </button>
                    <button onClick={() => toggle(c)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${c.is_active ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                      {c.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => remove(c.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
