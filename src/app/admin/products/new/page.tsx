"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    short_description: "",
    description: "",
    category_id: "",
    gender: "unisex",
    status: "DRAFT",
  });

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    if (key === "name" && !form.slug) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setForm((f) => ({ ...f, name: val, slug }));
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) { setError("Product name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || undefined,
        sku: form.sku || undefined,
        short_description: form.short_description || undefined,
        description: form.description || undefined,
      };
      const r = await fetch(`${API}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const id = data?.id ?? data?.product?.id ?? data?.data?.id;
      if (id) {
        router.push(`/products/${id}`);
      } else {
        throw new Error("No product ID returned from API.");
      }
    } catch (e: any) {
      setError(e.message || "Could not create product. Check API connection.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Products</p>
          <h1 className="mt-1 text-2xl font-semibold">New Product</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter basic info to create the product. You&apos;ll add variants, images, pricing, and more from the product detail page.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <p className={lbl}>Product Name *</p>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Men's Classic Tan Loafer"
              className={field}
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={lbl}>SKU</p>
              <input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="RIZZ-ML-TAN-001"
                className={field}
              />
            </div>
            <div>
              <p className={lbl}>Slug (URL)</p>
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="mens-classic-tan-loafer"
                className={field}
              />
            </div>
          </div>

          <div>
            <p className={lbl}>Short Description</p>
            <input
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              placeholder="Handcrafted full-grain leather loafer for everyday elegance."
              className={field}
            />
          </div>

          <div>
            <p className={lbl}>Description</p>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Detailed product description..."
              className={field + " resize-none"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={lbl}>Gender</p>
              <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={field}>
                <option value="male">Men</option>
                <option value="female">Women</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <div>
              <p className={lbl}>Status</p>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={field}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex gap-3 pb-6">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Product →"}
          </button>
          <button
            onClick={() => router.push("/products")}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
