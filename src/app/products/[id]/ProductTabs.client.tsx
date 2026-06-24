"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

// ─── AI Generated Data Type ───────────────────────────────────────────────────
type AiLang = {
  name?: string;
  short_description?: string;
  description?: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  og_title?: string;
  og_description?: string;
  focus_keyword?: string;
  secondary_keywords?: string[];
  alt_text?: string;
  tags?: string[];
  faq?: { question: string; answer: string }[];
};

type AiData = {
  en?: AiLang;
  bn?: AiLang;
  schema?: {
    product?: Record<string, unknown>;
    faq_schema?: Record<string, unknown>;
  };
};

// ─── AI Generate Bar ──────────────────────────────────────────────────────────
function AiGenerateBar({
  productId,
  productName,
  onGenerated,
}: {
  productId: string;
  productName?: string;
  onGenerated: (data: AiData) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function generate() {
    setLoading(true); setError(null); setDone(false);
    try {
      // 1. Fetch product media to get primary image
      const mediaRes = await fetch(`${API}/products/${productId}/media`, { cache: "no-store" });
      const mediaData = mediaRes.ok ? await mediaRes.json() : [];
      const mediaList: any[] = Array.isArray(mediaData)
        ? mediaData
        : mediaData?.media ?? mediaData?.images ?? [];

      const primary =
        mediaList.find((m: any) => m.is_primary) ?? mediaList[0];
      const imageUrl = primary?.media_url ?? primary?.url ?? primary?.image_url;

      if (!imageUrl) {
        setError("No product image found. Please upload an image first (Images tab).");
        return;
      }

      // 2. Call our AI API
      const res = await fetch("/api/generate-product-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, productName }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Generation failed");

      const raw = json.data;
      // Support both old flat format and new bilingual format
      const normalized: AiData = raw.en
        ? raw
        : {
            en: {
              name: raw.name,
              short_description: raw.short_description,
              description: raw.description,
              slug: raw.slug,
              meta_title: raw.seo?.meta_title,
              meta_description: raw.seo?.meta_description,
              focus_keyword: raw.seo?.focus_keyword,
              secondary_keywords: raw.seo?.secondary_keywords,
              alt_text: raw.alt_text,
              tags: raw.tags,
              faq: raw.faq,
            },
          };
      onGenerated(normalized);
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-violet-900">✨ AI Content Generator</p>
          <p className="text-xs text-violet-600 mt-0.5">
            Product image থেকে English + বাংলা title, description, SEO, tags ও FAQ — সব একসাথে generate হবে।
            {done && <span className="ml-2 font-semibold text-green-700">✅ Applied! নিচের tabs এ দেখো।</span>}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="shrink-0 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition whitespace-nowrap"
        >
          {loading ? "⏳ Generating… (15-25s)" : "✨ Generate AI Content"}
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          ❌ {error}
        </p>
      )}
    </div>
  );
}

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

const TABS = [
  { id: "basic",        label: "Basic Info" },
  { id: "category",     label: "Categories" },
  { id: "variants",     label: "Variants" },
  { id: "price",        label: "Price & Discount" },
  { id: "tags",         label: "Tags" },
  { id: "seo",          label: "SEO" },
  { id: "translations", label: "🌐 Translations" },
  { id: "images",       label: "Images" },
  { id: "videos",       label: "Videos" },
  { id: "faq",          label: "FAQ" },
  { id: "reviews",      label: "Reviews" },
  { id: "status",       label: "Status" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SIZES = ["40", "41", "42", "43", "44"];
const COLORS = ["Tan", "Brown", "Black", "Dark Brown", "Cognac", "Oxblood"];

async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}`);
  return r.json();
}

async function uploadFile(path: string, file: File, fields: Record<string, string | undefined> = {}) {
  const form = new FormData();
  form.append("file", file);
  Object.entries(fields).forEach(([k, v]) => { if (v) form.append(k, v); });
  const r = await fetch(`${API}${path}`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}`);
  return r.json();
}

function Msg({ text, ok = true }: { text: string; ok?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-sm ${ok ? "border-teal-200 bg-teal-50 text-teal-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
      {text}
    </div>
  );
}

function SaveBtn({ saving, label = "Save Changes" }: { saving: boolean; label?: string }) {
  return (
    <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition">
      {saving ? "Saving…" : label}
    </button>
  );
}

// ─── Refinable Textarea (write a draft, AI refines it on click) ──────────────

function RefinableTextarea({
  label,
  fieldType,
  value,
  onChange,
  productName,
  category,
  placeholder,
}: {
  label: string;
  fieldType: "specs" | "craftsmanship";
  value: string;
  onChange: (v: string) => void;
  productName?: string;
  category?: string;
  placeholder?: string;
}) {
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRefine() {
    if (!value.trim()) { setError("Write a few notes first, then click AI Generate."); return; }
    setRefining(true); setError(null);
    try {
      const res = await fetch("/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldType, draft: value, productName, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refine failed");
      setRefined(data.refined);
    } catch (e: any) {
      setError(e.message || "Failed to refine. Check API.");
    } finally {
      setRefining(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className={lbl}>{label}</p>
        <button
          type="button"
          onClick={handleRefine}
          disabled={refining}
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
        >
          {refining ? "Refining…" : "✨ AI Generate"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        className={field + " resize-none"}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {refined && (
        <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">AI-Refined Version</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{refined}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onChange(refined); setRefined(null); }}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              Use This Version
            </button>
            <button
              type="button"
              onClick={() => setRefined(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Basic Info ──────────────────────────────────────────────────────────────

function BasicTab({
  productId,
  initial,
  aiData,
}: {
  productId: string;
  initial: Record<string, unknown>;
  aiData?: AiData;
}) {
  const [form, setForm] = useState({
    name: (initial.name as string) ?? "",
    slug: (initial.slug as string) ?? "",
    sku: (initial.sku as string) ?? "",
    short_description: (initial.short_description as string) ?? "",
    description: (initial.description as string) ?? "",
    material: (initial.material as string) ?? "",
    gender: (initial.gender as string) ?? "unisex",
    specs: (initial.specs as string) ?? "",
    craftsmanship: (initial.craftsmanship as string) ?? "",
    free_delivery: (initial.free_delivery as boolean) ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  // Apply AI data when it arrives (use EN content)
  useEffect(() => {
    if (!aiData?.en) return;
    setForm((f) => ({
      ...f,
      name: aiData.en?.name ?? f.name,
      slug: aiData.en?.slug ?? f.slug,
      short_description: aiData.en?.short_description ?? f.short_description,
      description: aiData.en?.description ?? f.description,
    }));
    setAiApplied(true);
  }, [aiData]);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await api(`/products/${productId}/basic-info`, "PATCH", form);
      setMsg({ text: "Basic info saved.", ok: true });
    } catch {
      setMsg({ text: "Failed to save. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      {aiApplied && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs text-violet-800">
          ✨ AI content applied! Review the fields below and click <strong>Save Changes</strong>.
        </div>
      )}
      <div>
        <p className={lbl}>Product Name</p>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={lbl}>SKU</p>
          <input value={form.sku} onChange={(e) => set("sku", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Slug</p>
          <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={field} />
        </div>
      </div>
      <div>
        <p className={lbl}>Short Description</p>
        <input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} className={field} />
      </div>
      <div>
        <p className={lbl}>Description</p>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} className={field + " resize-none"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={lbl}>Material</p>
          <input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Full-grain leather" className={field} />
        </div>
        <div>
          <p className={lbl}>Gender</p>
          <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={field}>
            <option value="male">Men</option>
            <option value="female">Women</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>
      </div>
      <RefinableTextarea
        label="Specs & Dimensions"
        fieldType="specs"
        value={form.specs}
        onChange={(v) => set("specs", v)}
        productName={form.name}
        placeholder="Write rough notes — sizes, weight, dimensions — then click AI Generate to clean it up."
      />
      <RefinableTextarea
        label="Craftsmanship & Materials"
        fieldType="craftsmanship"
        value={form.craftsmanship}
        onChange={(v) => set("craftsmanship", v)}
        productName={form.name}
        placeholder="Write rough notes — materials, how it's made — then click AI Generate to clean it up."
      />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          checked={form.free_delivery}
          onChange={(e) => setForm((f) => ({ ...f, free_delivery: e.target.checked }))}
          className="mt-0.5 h-4 w-4 accent-violet-600"
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">Free Delivery for this product</span>
          <span className="block text-xs text-slate-500">If a customer orders this product, delivery is free for that order — regardless of the sitewide delivery fee.</span>
        </span>
      </label>
      <SaveBtn saving={saving} />
    </form>
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────

function CategoryTab({ productId, initial }: { productId: string; initial: Record<string, unknown> }) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string>((initial.category_id as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`${API}/categories`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setCategories(Array.isArray(d) ? d : d?.categories ?? d?.data ?? []))
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      await api(`/products/${productId}`, "PATCH", { category_id: selected });
      setMsg({ text: "Category saved.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <div>
        <p className={lbl}>Assign Category</p>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className={field}>
          <option value="">— Select category —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {categories.length === 0 && <p className="mt-2 text-xs text-slate-400">No categories loaded. Add categories first.</p>}
      </div>
      <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Category"}
      </button>
    </div>
  );
}

// ─── Variants ────────────────────────────────────────────────────────────────

type Variant = { id?: string; size: string; color: string; price: string; salePrice?: string; stock: string };

function VariantsTab({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<any[]>([]);
  const [draft, setDraft] = useState<Variant>({ size: "41", color: "Tan", price: "", salePrice: "", stock: "0" });
  const [edits, setEdits] = useState<Record<string, { price: string; sale_price: string }>>({});
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`${API}/products/${productId}/variants`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.variants ?? [];
        setVariants(list);
        const init: Record<string, { price: string; sale_price: string }> = {};
        list.forEach((v: any) => { if (v.id) init[v.id] = { price: String(v.price ?? ""), sale_price: String(v.sale_price ?? "") }; });
        setEdits(init);
      })
      .catch(() => {});
  }, [productId]);

  async function addVariant() {
    if (!draft.price) { setMsg({ text: "Price is required.", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const variantName = `${draft.size} / ${draft.color}`;
      const created = await api(`/products/${productId}/variants`, "POST", {
        sku: `RIZZ-${productId.slice(-6)}-${draft.size}-${draft.color.replace(/\s+/g, "")}-${Date.now()}`,
        variant_name: variantName,
        price: Number(draft.price),
        sale_price: draft.salePrice ? Number(draft.salePrice) : null,
        stock_qty: Number(draft.stock),
        attributes: { size: draft.size, color: draft.color },
        is_default: false,
        status: "ACTIVE",
      });
      setVariants((v) => [...v, created]);
      setEdits((e) => ({ ...e, [created.id]: { price: String(created.price ?? ""), sale_price: String(created.sale_price ?? "") } }));
      setMsg({ text: "Variant added.", ok: true });
      setDraft({ size: "41", color: "Tan", price: "", salePrice: "", stock: "0" });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  async function savePricing(id: string) {
    const e = edits[id];
    if (!e) return;
    setSavingRow(id); setMsg(null);
    try {
      const updated = await api(`/products/${productId}/variants/${id}`, "PATCH", {
        price: Number(e.price),
        sale_price: e.sale_price ? Number(e.sale_price) : null,
      });
      setVariants((vs) => vs.map((v) => v.id === id ? updated : v));
      setMsg({ text: "Variant pricing updated.", ok: true });
    } catch {
      setMsg({ text: "Failed to update pricing. Check API.", ok: false });
    } finally { setSavingRow(null); }
  }

  async function deleteVariant(id: string) {
    if (!confirm("Delete this variant?")) return;
    try {
      await api(`/products/${productId}/variants/${id}`, "DELETE");
      setVariants((v) => v.filter((x) => x.id !== id));
    } catch { setMsg({ text: "Delete failed.", ok: false }); }
  }

  return (
    <div className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <p className="text-xs text-slate-400">
        The storefront always shows the <strong>lowest price across these variants</strong> on product cards. Set a
        Sale Price on any variant to discount it — the card and product page automatically reflect whichever variant is cheapest.
      </p>
      {variants.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{["Size", "Color", "Price (৳)", "Sale Price (৳)", "Stock", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v, i) => {
                const id = v.id ?? String(i);
                const rowEdit = edits[id] ?? { price: String(v.price ?? ""), sale_price: String(v.sale_price ?? "") };
                const dirty = v.id && (rowEdit.price !== String(v.price ?? "") || rowEdit.sale_price !== String(v.sale_price ?? ""));
                return (
                  <tr key={id}>
                    <td className="px-4 py-2.5 font-medium">{v.attributes?.size ?? v.size}</td>
                    <td className="px-4 py-2.5">{v.attributes?.color ?? v.color}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={rowEdit.price}
                        onChange={(e) => setEdits((ed) => ({ ...ed, [id]: { ...rowEdit, price: e.target.value } }))}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-teal-400"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        placeholder="—"
                        value={rowEdit.sale_price}
                        onChange={(e) => setEdits((ed) => ({ ...ed, [id]: { ...rowEdit, sale_price: e.target.value } }))}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-teal-400"
                      />
                    </td>
                    <td className="px-4 py-2.5">{v.stock_qty ?? v.stock ?? 0}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {dirty && (
                        <button onClick={() => savePricing(id)} disabled={savingRow === id} className="mr-3 text-xs font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-50">
                          {savingRow === id ? "Saving…" : "Save"}
                        </button>
                      )}
                      {v.id && <button onClick={() => deleteVariant(v.id!)} className="text-xs text-rose-600 hover:text-rose-800">Delete</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Add Variant</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={lbl}>Size</p>
            <select value={draft.size} onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))} className={field}>
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <p className={lbl}>Color</p>
            <select value={draft.color} onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))} className={field}>
              {COLORS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p className={lbl}>Price (BDT)</p>
            <input type="number" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} placeholder="4500" className={field} />
          </div>
          <div>
            <p className={lbl}>Sale Price (BDT, optional)</p>
            <input type="number" value={draft.salePrice} onChange={(e) => setDraft((d) => ({ ...d, salePrice: e.target.value }))} placeholder="3999" className={field} />
          </div>
          <div>
            <p className={lbl}>Stock Qty</p>
            <input type="number" value={draft.stock} onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))} placeholder="10" className={field} />
          </div>
        </div>
        <button onClick={addVariant} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Adding…" : "+ Add Variant"}
        </button>
      </div>
    </div>
  );
}

// ─── Price & Discount ────────────────────────────────────────────────────────

function PriceTab({ productId, initial }: { productId: string; initial: Record<string, unknown> }) {
  const [form, setForm] = useState({
    price: String(initial.price ?? ""),
    compare_at_price: String(initial.compare_at_price ?? ""),
    sale_price: String(initial.sale_price ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await api(`/products/${productId}`, "PATCH", {
        price: form.price ? Number(form.price) : undefined,
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : undefined,
        sale_price: form.sale_price ? Number(form.sale_price) : undefined,
      });
      setMsg({ text: "Pricing saved.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  const discount = form.compare_at_price && form.price
    ? Math.round((1 - Number(form.price) / Number(form.compare_at_price)) * 100) : 0;

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        This is a <strong>fallback price</strong>, only shown when this product has no variants. If you&apos;ve added
        Size/Color variants in the <strong>Variants</strong> tab, the storefront always shows the lowest variant price
        (and any per-variant sale price) instead — set discounts there for variant-based products.
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className={lbl}>Base Price (BDT)</p>
          <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="4500" className={field} />
        </div>
        <div>
          <p className={lbl}>Compare-at Price</p>
          <input type="number" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} placeholder="5500" className={field} />
          <p className="mt-1 text-xs text-slate-400">Crossed-out original price.</p>
        </div>
        <div>
          <p className={lbl}>Sale Price</p>
          <input type="number" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} placeholder="3999" className={field} />
        </div>
      </div>
      {discount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Effective discount: <strong>{discount}% off</strong> vs compare-at price.
        </div>
      )}
      <SaveBtn saving={saving} label="Save Pricing" />
    </form>
  );
}

// ─── Tags ────────────────────────────────────────────────────────────────────

function TagsTab({
  productId,
  initial,
  aiData,
}: {
  productId: string;
  initial: Record<string, unknown>;
  aiData?: AiData;
}) {
  const initTags = Array.isArray(initial.tags) ? (initial.tags as string[]).join(", ") : String(initial.tags ?? "");
  const [tags, setTags] = useState(initTags);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (aiData?.en?.tags?.length) setTags(aiData.en.tags.join(", "));
  }, [aiData]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const parsed = tags.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      await api(`/products/${productId}`, "PATCH", { tags: parsed });
      setMsg({ text: "Tags saved.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  const preview = tags.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <div>
        <p className={lbl}>Tags (comma-separated)</p>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="leather, loafer, mens, formal, premium" className={field} />
      </div>
      {preview.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {preview.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">{t}</span>
          ))}
        </div>
      )}
      <SaveBtn saving={saving} label="Save Tags" />
    </form>
  );
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function SeoTab({
  productId,
  initial,
  aiData,
}: {
  productId: string;
  initial: Record<string, unknown>;
  aiData?: AiData;
}) {
  const [metaTitle, setMetaTitle] = useState((initial.meta_title as string) ?? "");
  const [metaDescription, setMetaDescription] = useState((initial.meta_description as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  useEffect(() => {
    if (!aiData?.en) return;
    if (aiData.en.meta_title) setMetaTitle(aiData.en.meta_title);
    if (aiData.en.meta_description) setMetaDescription(aiData.en.meta_description);
    setAiApplied(true);
  }, [aiData]);

  const fallbackTitle = `${initial.name ?? "Product"} — ${initial.material ?? "Genuine Leather"} | RIZZ`;
  const fallbackDescription = String(initial.short_description ?? initial.description ?? "").slice(0, 160);
  const previewTitle = metaTitle || fallbackTitle;
  const previewDescription = metaDescription || fallbackDescription;
  const previewUrl = `rizzleather.com/brand/catalog/${initial.slug ?? ""}`;

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await api(`/products/${productId}`, "PATCH", {
        meta_title: metaTitle || undefined,
        meta_description: metaDescription || undefined,
      });
      setMsg({ text: "SEO saved.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      {aiApplied && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs text-violet-800">
          ✨ AI SEO content applied! Review and click <strong>Save SEO</strong>.
          {aiData?.en?.focus_keyword && (
            <span className="ml-2 text-violet-600">Focus keyword: <strong>{aiData.en.focus_keyword}</strong></span>
          )}
        </div>
      )}
      <p className="text-xs text-slate-400">
        Leave blank to auto-generate from the product&apos;s name, material, and description — only set these if you want
        full control over how this product appears in Google search results and AI answer engines.
      </p>

      {/* Google-style preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">{previewUrl}</p>
        <p className="mt-0.5 text-base text-blue-700 truncate">{previewTitle}</p>
        <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{previewDescription || "No description set."}</p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className={lbl}>Meta Title</p>
          <span className={`text-xs ${metaTitle.length > 60 ? "text-rose-500" : "text-slate-400"}`}>{metaTitle.length}/60</span>
        </div>
        <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={fallbackTitle} className={field} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className={lbl}>Meta Description</p>
          <span className={`text-xs ${metaDescription.length > 160 ? "text-rose-500" : "text-slate-400"}`}>{metaDescription.length}/160</span>
        </div>
        <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} placeholder={fallbackDescription} className={field + " resize-none"} />
      </div>
      <SaveBtn saving={saving} label="Save SEO" />
    </form>
  );
}

// ─── Images ──────────────────────────────────────────────────────────────────

function ImagesTab({ productId }: { productId: string }) {
  const [images, setImages] = useState<{ id: string; url: string; is_primary: boolean; alt?: string }[]>([]);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`${API}/products/${productId}/media`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.media ?? d?.images ?? [];
        setImages(list.map((m: any) => ({ id: m.id, url: m.media_url ?? m.url ?? m.image_url, is_primary: m.is_primary ?? false, alt: m.alt_text ?? m.alt })));
      })
      .catch(() => {});
  }, [productId]);

  async function addImage() {
    if (!url.trim()) { setMsg({ text: "URL is required.", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const created = await api(`/products/${productId}/media`, "POST", {
        media_url: url,
        alt_text: alt || undefined,
        media_type: "IMAGE",
      });
      setImages((imgs) => [...imgs, { id: created.id, url: created.media_url, is_primary: created.is_primary ?? false, alt: created.alt_text }]);
      setUrl(""); setAlt("");
      setMsg({ text: "Image added.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  async function uploadImage() {
    if (!file) { setMsg({ text: "Choose a file first.", ok: false }); return; }
    setUploading(true); setMsg(null);
    try {
      const created = await uploadFile(`/products/${productId}/media/upload`, file, { alt_text: alt });
      setImages((imgs) => [...imgs, { id: created.id, url: created.media_url, is_primary: created.is_primary ?? false, alt: created.alt_text }]);
      setFile(null); setAlt("");
      setMsg({ text: "Image uploaded.", ok: true });
    } catch {
      setMsg({ text: "Upload failed. Check API.", ok: false });
    } finally { setUploading(false); }
  }

  async function setPrimary(id: string) {
    try {
      await api(`/products/${productId}/media/${id}`, "PATCH", { is_primary: true });
      setImages((imgs) => imgs.map((i) => ({ ...i, is_primary: i.id === id })));
    } catch { setMsg({ text: "Failed to set primary.", ok: false }); }
  }

  async function deleteImage(id: string) {
    if (!confirm("Delete this image?")) return;
    try {
      await api(`/products/${productId}/media/${id}`, "DELETE");
      setImages((imgs) => imgs.filter((i) => i.id !== id));
    } catch { setMsg({ text: "Delete failed.", ok: false }); }
  }

  return (
    <div className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className={`relative rounded-xl border overflow-hidden ${img.is_primary ? "border-teal-400 ring-2 ring-teal-200" : "border-slate-200"}`}>
              <img src={img.url} alt={img.alt ?? ""} className="aspect-square w-full object-cover" />
              {img.is_primary && (
                <div className="absolute top-2 left-2 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-bold text-white">PRIMARY</div>
              )}
              <div className="flex gap-1 p-1.5 bg-white border-t border-slate-200">
                {!img.is_primary && (
                  <button onClick={() => setPrimary(img.id)} className="flex-1 rounded-lg bg-slate-100 py-1 text-[11px] font-medium hover:bg-teal-50">Set Primary</button>
                )}
                <button onClick={() => deleteImage(img.id)} className="flex-1 rounded-lg bg-rose-50 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Upload Image</p>
        <div>
          <p className={lbl}>Choose File</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={field}
          />
        </div>
        <div>
          <p className={lbl}>Alt Text</p>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Men's tan loafer side view" className={field} />
        </div>
        <button onClick={uploadImage} disabled={uploading || !file} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {uploading ? "Uploading…" : "↑ Upload Image"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Add Image by URL</p>
        <div>
          <p className={lbl}>Image URL</p>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://cdn.example.com/product.jpg" className={field} />
        </div>
        <div>
          <p className={lbl}>Alt Text</p>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Men's tan loafer side view" className={field} />
        </div>
        <button onClick={addImage} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Adding…" : "+ Add Image"}
        </button>
      </div>
    </div>
  );
}

// ─── Videos ──────────────────────────────────────────────────────────────────

function VideosTab({ productId }: { productId: string }) {
  const [videos, setVideos] = useState<{ id: string; url: string; title?: string }[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`${API}/products/${productId}/media?type=video`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.media ?? d?.videos ?? [];
        setVideos(list.filter((m: any) => m.media_type === "VIDEO").map((m: any) => ({ id: m.id, url: m.media_url ?? m.url, title: m.title })));
      })
      .catch(() => {});
  }, [productId]);

  async function addVideo() {
    if (!url.trim()) { setMsg({ text: "URL is required.", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const created = await api(`/products/${productId}/media`, "POST", {
        media_url: url,
        title: title || undefined,
        media_type: "VIDEO",
      });
      setVideos((v) => [...v, { id: created.id, url: created.media_url, title: created.title }]);
      setUrl(""); setTitle("");
      setMsg({ text: "Video added.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  async function uploadVideo() {
    if (!file) { setMsg({ text: "Choose a file first.", ok: false }); return; }
    setUploading(true); setMsg(null);
    try {
      const created = await uploadFile(`/products/${productId}/media/upload`, file, { title });
      setVideos((v) => [...v, { id: created.id, url: created.media_url, title: created.title }]);
      setFile(null); setTitle("");
      setMsg({ text: "Video uploaded.", ok: true });
    } catch {
      setMsg({ text: "Upload failed. Check API.", ok: false });
    } finally { setUploading(false); }
  }

  async function deleteVideo(id: string) {
    if (!confirm("Delete this video?")) return;
    try {
      await api(`/products/${productId}/media/${id}`, "DELETE");
      setVideos((v) => v.filter((x) => x.id !== id));
    } catch { setMsg({ text: "Delete failed.", ok: false }); }
  }

  return (
    <div className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{v.title || "Video"}</p>
                <p className="text-xs text-slate-400 truncate">{(v as any).media_url ?? v.url}</p>
              </div>
              <button onClick={() => deleteVideo(v.id)} className="shrink-0 text-xs text-rose-600 hover:text-rose-800">Delete</button>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Upload Video File</p>
        <div>
          <p className={lbl}>Choose File</p>
          <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={field} />
        </div>
        <div>
          <p className={lbl}>Title</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product showcase video" className={field} />
        </div>
        <button onClick={uploadVideo} disabled={uploading || !file} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {uploading ? "Uploading…" : "↑ Upload Video"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Add Video by Link</p>
        <div>
          <p className={lbl}>Video URL (YouTube / Vimeo / direct)</p>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={field} />
        </div>
        <button onClick={addVideo} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Adding…" : "+ Add Video"}
        </button>
      </div>
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

type FaqItem = { id?: string; question: string; answer: string; lang_code?: string };

function FaqTab({ productId, aiData }: { productId: string; aiData?: AiData }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [draft, setDraft] = useState<FaqItem>({ question: "", answer: "", lang_code: "en" });
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState<"en" | "bn" | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function importAiFaqs(lang: "en" | "bn") {
    const faqList = aiData?.[lang]?.faq ?? [];
    if (!faqList.length) return;
    setImporting(lang); setMsg(null);
    try {
      const created: FaqItem[] = [];
      for (const item of faqList) {
        const result = await api(`/products/${productId}/faqs`, "POST", { ...item, lang_code: lang });
        created.push(result);
      }
      setFaqs((f) => [...f, ...created]);
      setMsg({ text: `✅ ${created.length} AI FAQs (${lang.toUpperCase()}) imported successfully!`, ok: true });
    } catch {
      setMsg({ text: "Failed to import FAQs. Check API.", ok: false });
    } finally { setImporting(null); }
  }

  useEffect(() => {
    fetch(`${API}/products/${productId}/faqs`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setFaqs(Array.isArray(d) ? d : d?.faqs ?? []))
      .catch(() => {});
  }, [productId]);

  function openEdit(faq: FaqItem) { setEditing(faq); setDraft({ ...faq, lang_code: faq.lang_code ?? "en" }); setMode("edit"); }
  function openCreate() { setEditing(null); setDraft({ question: "", answer: "", lang_code: "en" }); setMode("create"); }

  async function save() {
    if (!draft.question || !draft.answer) { setMsg({ text: "Question and answer are required.", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      if (mode === "create") {
        const created = await api(`/products/${productId}/faqs`, "POST", draft);
        setFaqs((f) => [...f, created]);
        setMsg({ text: "FAQ added.", ok: true }); openCreate();
      } else if (editing?.id) {
        const updated = await api(`/products/${productId}/faqs/${editing.id}`, "PATCH", draft);
        setFaqs((f) => f.map((x) => (x.id === editing.id ? updated : x)));
        setMsg({ text: "FAQ updated.", ok: true }); openCreate();
      }
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  async function deleteFaq(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await api(`/products/${productId}/faqs/${id}`, "DELETE");
      setFaqs((f) => f.filter((x) => x.id !== id));
    } catch { setMsg({ text: "Delete failed.", ok: false }); }
  }

  return (
    <div className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      {(["en", "bn"] as const).map((lang) => {
        const faqList = aiData?.[lang]?.faq ?? [];
        if (faqList.length === 0) return null;
        return (
          <div key={lang} className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-violet-900">✨ AI-Generated FAQs ({lang === "en" ? "English" : "Bangla"}) Ready</p>
                <p className="text-xs text-violet-600 mt-0.5">{faqList.length} FAQs — একবারে সব import করো</p>
              </div>
              <button
                onClick={() => importAiFaqs(lang)}
                disabled={importing === lang}
                className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {importing === lang ? "Importing…" : `Import ${faqList.length} FAQs`}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {faqList.map((f, i) => (
                <div key={i} className="rounded-lg bg-white border border-violet-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800">Q: {f.question}</p>
                  <p className="text-xs text-slate-500 mt-0.5">A: {f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {faqs.length > 0 && (
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={faq.id ?? i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${faq.lang_code === "bn" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {(faq.lang_code ?? "en").toUpperCase()}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 text-sm">{faq.question}</p>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{faq.answer}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(faq)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Edit</button>
                  {faq.id && <button onClick={() => deleteFaq(faq.id!)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">Delete</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">{mode === "create" ? "Add FAQ" : "Edit FAQ"}</p>
        <div>
          <p className={lbl}>Language</p>
          <select value={draft.lang_code ?? "en"} onChange={(e) => setDraft((d) => ({ ...d, lang_code: e.target.value }))} className={field}>
            <option value="en">English</option>
            <option value="bn">Bangla</option>
          </select>
        </div>
        <div>
          <p className={lbl}>Question</p>
          <input value={draft.question} onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))} placeholder="Is this available in wide fit?" className={field} />
        </div>
        <div>
          <p className={lbl}>Answer</p>
          <textarea value={draft.answer} onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))} rows={3} placeholder="Yes, we offer wide fit in sizes 42–44..." className={field + " resize-none"} />
        </div>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Saving…" : mode === "create" ? "+ Add FAQ" : "Save Changes"}
          </button>
          {mode === "edit" && <button onClick={openCreate} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50">Cancel</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

type Review = {
  id: string;
  customer_name: string;
  customer_image_url?: string | null;
  comment?: string | null;
  rating?: number | null;
  status: string;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="text-xl leading-none">
          <span className={n <= value ? "text-amber-400" : "text-slate-300"}>★</span>
        </button>
      ))}
    </div>
  );
}

function ReviewsTab({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [draft, setDraft] = useState({ customer_name: "", comment: "", rating: 5, customer_image_url: "" });

  useEffect(() => {
    fetch(`${API}/reviews?productId=${productId}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setReviews(Array.isArray(d) ? d : d?.reviews ?? d?.data ?? []))
      .catch(() => {});
  }, [productId]);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile("/uploads", file);
      setDraft((d) => ({ ...d, customer_image_url: result.url }));
    } catch {
      setMsg({ text: "Image upload failed.", ok: false });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function addReview() {
    if (!draft.customer_name.trim()) { setMsg({ text: "Customer name is required.", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const created = await api(`/products/${productId}/reviews`, "POST", {
        customer_name: draft.customer_name,
        comment: draft.comment || undefined,
        rating: draft.rating,
        customer_image_url: draft.customer_image_url || undefined,
        status: "active",
      });
      setReviews((r) => [created, ...r]);
      setDraft({ customer_name: "", comment: "", rating: 5, customer_image_url: "" });
      setMsg({ text: "Review added.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  async function toggleStatus(r: Review) {
    const next = r.status === "active" ? "inactive" : "active";
    try {
      await api(`/reviews/${r.id}`, "PATCH", { status: next });
      setReviews((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    } catch { setMsg({ text: "Failed to update status.", ok: false }); }
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await api(`/reviews/${id}`, "DELETE");
      setReviews((r) => r.filter((x) => x.id !== id));
    } catch { setMsg({ text: "Delete failed.", ok: false }); }
  }

  return (
    <div className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Add Customer Review</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={lbl}>Customer Name</p>
            <input value={draft.customer_name} onChange={(e) => setDraft((d) => ({ ...d, customer_name: e.target.value }))} placeholder="Rafiqul H." className={field} />
          </div>
          <div>
            <p className={lbl}>Rating</p>
            <StarPicker value={draft.rating} onChange={(v) => setDraft((d) => ({ ...d, rating: v }))} />
          </div>
        </div>
        <div>
          <p className={lbl}>Review Text</p>
          <textarea value={draft.comment} onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))} rows={3} placeholder="Exceptional quality..." className={field + " resize-none"} />
        </div>
        <div>
          <p className={lbl}>Customer Photo (optional)</p>
          <div className="flex items-center gap-3">
            {draft.customer_image_url && (
              <img src={draft.customer_image_url} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
            )}
            <label className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer transition">
              {uploading ? "Uploading…" : draft.customer_image_url ? "Change Photo" : "Upload Photo"}
              <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>
        <button onClick={addReview} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Adding…" : "+ Add Review"}
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
          No reviews for this product yet.
        </div>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 min-w-0 gap-3">
                {r.customer_image_url && (
                  <img src={r.customer_image_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-900">{r.customer_name}</span>
                    <span className="text-amber-400 text-xs">{"★".repeat(r.rating ?? 0)}{"☆".repeat(5 - (r.rating ?? 0))}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.status === "active" ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                  </div>
                  <p className="text-sm text-slate-600">{r.comment}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleStatus(r)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${r.status === "active" ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"}`}>
                  {r.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => deleteReview(r.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">Delete</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Translations (Bangla) ───────────────────────────────────────────────────

function TranslationTab({
  productId,
  aiData,
}: {
  productId: string;
  aiData?: AiData;
}) {
  const [langTab, setLangTab] = useState<"bn">("bn");
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    seo_title: "",
    seo_description: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Load existing BN translation
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/products/${productId}/translations`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        const list: any[] = Array.isArray(d) ? d : d?.translations ?? [];
        const bn = list.find((t: any) => t.lang_code === "bn");
        if (bn) {
          setExistingId(bn.id ?? null);
          setForm({
            name: bn.name ?? "",
            short_description: bn.short_description ?? "",
            description: bn.description ?? "",
            seo_title: bn.seo_title ?? "",
            seo_description: bn.seo_description ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  // Apply AI BN content when aiData changes
  useEffect(() => {
    if (!aiData?.bn) return;
    setForm((f) => ({
      name: aiData.bn?.name ?? f.name,
      short_description: aiData.bn?.short_description ?? f.short_description,
      description: aiData.bn?.description ?? f.description,
      seo_title: aiData.bn?.meta_title ?? f.seo_title,
      seo_description: aiData.bn?.meta_description ?? f.seo_description,
    }));
    setAiApplied(true);
  }, [aiData]);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const payload = { ...form, lang_code: "bn" };
      if (existingId) {
        await api(`/products/${productId}/translations/bn`, "PATCH", payload);
      } else {
        const created = await api(`/products/${productId}/translations`, "POST", payload);
        setExistingId(created?.id ?? null);
      }
      setMsg({ text: "বাংলা translation saved ✅", ok: true });
    } catch {
      setMsg({ text: "Failed to save. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  if (loading) return <p className="text-sm text-slate-400 py-4">Loading translations…</p>;

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      {aiApplied && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs text-violet-800">
          ✨ AI বাংলা content applied! Review করো এবং <strong>Save Translation</strong> চাপো।
        </div>
      )}
      {!aiData?.bn && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          💡 উপরের <strong>Generate AI Content</strong> বাটনে চাপলে বাংলা content automatically fill হবে।
        </div>
      )}

      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span className="text-lg">🇧🇩</span> বাংলা (Bengali) Translation
      </div>

      <div>
        <p className={lbl}>নাম (Name)</p>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="যেমন: প্রিমিয়াম চামড়ার লোফার" className={field} />
      </div>
      <div>
        <p className={lbl}>সংক্ষিপ্ত বিবরণ (Short Description)</p>
        <input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="২-৩ বাক্যে পণ্যের বিবরণ" className={field} />
      </div>
      <div>
        <p className={lbl}>বিস্তারিত বিবরণ (Description)</p>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={6} placeholder="পণ্যের বিস্তারিত বিবরণ লিখুন…" className={field + " resize-none"} />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">🔍 বাংলা SEO</p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <p className={lbl}>Meta Title (বাংলা)</p>
              <span className={`text-xs ${form.seo_title.length > 60 ? "text-rose-500" : "text-slate-400"}`}>{form.seo_title.length}/60</span>
            </div>
            <input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder="যেমন: বাংলাদেশের সেরা চামড়ার জুতা | RIZZ Leather" className={field} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className={lbl}>Meta Description (বাংলা)</p>
              <span className={`text-xs ${form.seo_description.length > 160 ? "text-rose-500" : "text-slate-400"}`}>{form.seo_description.length}/160</span>
            </div>
            <textarea value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} rows={3} placeholder="বাংলায় meta description লিখুন..." className={field + " resize-none"} />
          </div>
        </div>
      </div>

      {(form.seo_title || form.name) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">rizzleather.com/brand/catalog/...?lang=bn</p>
          <p className="mt-0.5 text-base text-blue-700 truncate">{form.seo_title || form.name}</p>
          <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{form.seo_description || form.short_description || "No description."}</p>
        </div>
      )}

      <SaveBtn saving={saving} label="Save Translation" />
    </form>
  );
}

// --- Status -----------------------------------------------------------------

function StatusTab({ productId, initial }: { productId: string; initial: Record<string, unknown> }) {
  const [form, setForm] = useState({
    status: ((initial.status as string) ?? "DRAFT").toUpperCase(),
    is_published: Boolean(initial.is_published),
    is_featured: Boolean(initial.is_featured),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await api(`/products/${productId}`, "PATCH", form);
      setMsg({ text: "Status saved.", ok: true });
    } catch {
      setMsg({ text: "Failed. Check API.", ok: false });
    } finally { setSaving(false); }
  }

  const STATUS_OPTS = [
    { value: "ACTIVE", label: "Active", desc: "Visible in the store catalog." },
    { value: "DRAFT", label: "Draft", desc: "Hidden from customers, editing in progress." },
    { value: "ARCHIVED", label: "Archived", desc: "Removed from store but data is kept." },
  ];

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <div>
        <p className={lbl}>Product Status</p>
        <div className="space-y-2">
          {STATUS_OPTS.map((opt) => (
            <label key={opt.value} className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${form.status === opt.value ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <input type="radio" name="status" value={opt.value} checked={form.status === opt.value} onChange={() => setForm((f) => ({ ...f, status: opt.value }))} className="mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-slate-900">{opt.label}</p>
                <p className="text-xs text-slate-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} className="h-4 w-4" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Published</p>
            <p className="text-xs text-slate-500">Show on storefront (requires Active status).</p>
          </div>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50">
          <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} className="h-4 w-4" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Featured</p>
            <p className="text-xs text-slate-500">Show in homepage featured products section.</p>
          </div>
        </label>
      </div>
      <SaveBtn saving={saving} label="Save Status" />
    </form>
  );
}

// --- Root -------------------------------------------------------------------

export default function ProductTabs({
  productId,
  initialData,
}: {
  productId: string;
  initialData: Record<string, unknown>;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [aiData, setAiData] = useState<AiData | undefined>(undefined);

  const handleAiGenerated = useCallback((data: AiData) => {
    setAiData(data);
  }, []);

  return (
    <div>
      <AiGenerateBar
        productId={productId}
        productName={initialData.name as string | undefined}
        onGenerated={handleAiGenerated}
      />

      <div className="flex gap-1.5 flex-wrap mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === tab.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {tab.label}
            {aiData && ["basic", "seo", "tags", "faq", "translations"].includes(tab.id) && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-violet-500 align-middle" title="AI content available" />
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {activeTab === "basic"        && <BasicTab       productId={productId} initial={initialData} aiData={aiData} />}
        {activeTab === "category"     && <CategoryTab    productId={productId} initial={initialData} />}
        {activeTab === "variants"     && <VariantsTab    productId={productId} />}
        {activeTab === "price"        && <PriceTab       productId={productId} initial={initialData} />}
        {activeTab === "tags"         && <TagsTab        productId={productId} initial={initialData} aiData={aiData} />}
        {activeTab === "seo"          && <SeoTab         productId={productId} initial={initialData} aiData={aiData} />}
        {activeTab === "translations" && <TranslationTab productId={productId} aiData={aiData} />}
        {activeTab === "images"       && <ImagesTab      productId={productId} />}
        {activeTab === "videos"       && <VideosTab      productId={productId} />}
        {activeTab === "faq"          && <FaqTab         productId={productId} aiData={aiData} />}
        {activeTab === "reviews"      && <ReviewsTab     productId={productId} />}
        {activeTab === "status"       && <StatusTab      productId={productId} initial={initialData} />}
      </div>
    </div>
  );
}
