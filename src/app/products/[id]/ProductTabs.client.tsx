"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

const TABS = [
  { id: "basic",    label: "Basic Info" },
  { id: "category", label: "Categories" },
  { id: "variants", label: "Variants" },
  { id: "price",    label: "Price & Discount" },
  { id: "tags",     label: "Tags" },
  { id: "seo",      label: "SEO" },
  { id: "images",   label: "Images" },
  { id: "videos",   label: "Videos" },
  { id: "faq",      label: "FAQ" },
  { id: "reviews",  label: "Reviews" },
  { id: "status",   label: "Status" },
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

// ─── Basic Info ──────────────────────────────────────────────────────────────

function BasicTab({ productId, initial }: { productId: string; initial: Record<string, unknown> }) {
  const [form, setForm] = useState({
    name: (initial.name as string) ?? "",
    slug: (initial.slug as string) ?? "",
    sku: (initial.sku as string) ?? "",
    short_description: (initial.short_description as string) ?? "",
    description: (initial.description as string) ?? "",
    material: (initial.material as string) ?? "",
    gender: (initial.gender as string) ?? "unisex",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

function TagsTab({ productId, initial }: { productId: string; initial: Record<string, unknown> }) {
  const initTags = Array.isArray(initial.tags) ? (initial.tags as string[]).join(", ") : String(initial.tags ?? "");
  const [tags, setTags] = useState(initTags);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

function SeoTab({ productId, initial }: { productId: string; initial: Record<string, unknown> }) {
  const [metaTitle, setMetaTitle] = useState((initial.meta_title as string) ?? "");
  const [metaDescription, setMetaDescription] = useState((initial.meta_description as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

type FaqItem = { id?: string; question: string; answer: string };

function FaqTab({ productId }: { productId: string }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [draft, setDraft] = useState<FaqItem>({ question: "", answer: "" });
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`${API}/products/${productId}/faqs`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setFaqs(Array.isArray(d) ? d : d?.faqs ?? []))
      .catch(() => {});
  }, [productId]);

  function openEdit(faq: FaqItem) { setEditing(faq); setDraft({ ...faq }); setMode("edit"); }
  function openCreate() { setEditing(null); setDraft({ question: "", answer: "" }); setMode("create"); }

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
      {faqs.length > 0 && (
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={faq.id ?? i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
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

// ─── Status ──────────────────────────────────────────────────────────────────

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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ProductTabs({
  productId,
  initialData,
}: {
  productId: string;
  initialData: Record<string, unknown>;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  return (
    <div>
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
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {activeTab === "basic"    && <BasicTab    productId={productId} initial={initialData} />}
        {activeTab === "category" && <CategoryTab productId={productId} initial={initialData} />}
        {activeTab === "variants" && <VariantsTab productId={productId} />}
        {activeTab === "price"    && <PriceTab    productId={productId} initial={initialData} />}
        {activeTab === "tags"     && <TagsTab     productId={productId} initial={initialData} />}
        {activeTab === "seo"      && <SeoTab      productId={productId} initial={initialData} />}
        {activeTab === "images"   && <ImagesTab   productId={productId} />}
        {activeTab === "videos"   && <VideosTab   productId={productId} />}
        {activeTab === "faq"      && <FaqTab      productId={productId} />}
        {activeTab === "reviews"  && <ReviewsTab  productId={productId} />}
        {activeTab === "status"   && <StatusTab   productId={productId} initial={initialData} />}
      </div>
    </div>
  );
}
