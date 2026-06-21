"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

const PAGES = [
  { key: "home", label: "Homepage", path: "/" },
  { key: "catalog", label: "Shop / Catalog", path: "/brand/catalog" },
  { key: "about", label: "About", path: "/about" },
  { key: "contact", label: "Contact", path: "/contact" },
  { key: "returns", label: "Return Policy", path: "/policies/returns" },
  { key: "shipping", label: "Shipping Policy", path: "/policies/shipping" },
  { key: "terms", label: "Terms of Service", path: "/policies/terms" },
];

type SeoData = {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonical: string;
};

const EMPTY: SeoData = {
  title: "", description: "", keywords: "", ogTitle: "", ogDescription: "", ogImage: "", canonical: "",
};

export default function SeoPage() {
  const [activeKey, setActiveKey] = useState("home");
  const [seoMap, setSeoMap] = useState<Record<string, SeoData>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const activePage = PAGES.find((p) => p.key === activeKey)!;
  const current = seoMap[activeKey] ?? EMPTY;

  function update(key: keyof SeoData, val: string) {
    setSeoMap((m) => ({ ...m, [activeKey]: { ...(m[activeKey] ?? EMPTY), [key]: val } }));
  }

  useEffect(() => {
    if (seoMap[activeKey]) return;
    setLoading(true);
    fetch(`${API}/seo/${activeKey}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setSeoMap((m) => ({ ...m, [activeKey]: { ...EMPTY, ...data } }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeKey]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/seo/${activeKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setMsg("SEO settings saved.");
    } catch {
      setMsg("Failed to save. Check API.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
  const fieldLabel = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

  const titleLen = current.title.length;
  const descLen = current.description.length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Content</p>
          <h1 className="mt-1 text-2xl font-semibold">SEO Settings</h1>
          <p className="mt-1 text-sm text-slate-400">Edit meta title, description, OG tags and canonical URL per page.</p>
        </header>

        {msg && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{msg}</div>}

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          {/* Page selector */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 h-fit">
            {PAGES.map((p) => (
              <button
                key={p.key}
                onClick={() => setActiveKey(p.key)}
                className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                  activeKey === p.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <p>{p.label}</p>
                <p className={`text-xs mt-0.5 ${activeKey === p.key ? "text-slate-400" : "text-slate-400"}`}>{p.path}</p>
              </button>
            ))}
          </div>

          {/* Editor */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{activePage.label}</h2>
              <code className="text-xs text-slate-400 bg-slate-100 rounded px-2 py-1">{activePage.path}</code>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={fieldLabel}>Meta Title</p>
                    <span className={`text-xs ${titleLen > 60 ? "text-rose-500" : "text-slate-400"}`}>{titleLen}/60</span>
                  </div>
                  <input value={current.title} onChange={(e) => update("title", e.target.value)} placeholder="RIZZ — Luxury Leather Footwear" className={field} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={fieldLabel}>Meta Description</p>
                    <span className={`text-xs ${descLen > 160 ? "text-rose-500" : "text-slate-400"}`}>{descLen}/160</span>
                  </div>
                  <textarea
                    value={current.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={3}
                    placeholder="Handcrafted leather footwear from Chittagong..."
                    className={field + " resize-none"}
                  />
                </div>

                <div>
                  <p className={fieldLabel}>Keywords (comma separated)</p>
                  <input value={current.keywords} onChange={(e) => update("keywords", e.target.value)} placeholder="leather shoes, loafers, Bangladesh" className={field} />
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Graph (Social Sharing)</p>
                  <div>
                    <p className={fieldLabel}>OG Title</p>
                    <input value={current.ogTitle} onChange={(e) => update("ogTitle", e.target.value)} placeholder="Same as meta title if empty" className={field} />
                  </div>
                  <div>
                    <p className={fieldLabel}>OG Description</p>
                    <textarea value={current.ogDescription} onChange={(e) => update("ogDescription", e.target.value)} rows={2} placeholder="Same as meta description if empty" className={field + " resize-none"} />
                  </div>
                  <div>
                    <p className={fieldLabel}>OG Image URL</p>
                    <input value={current.ogImage} onChange={(e) => update("ogImage", e.target.value)} placeholder="https://rizzleather.com/og-home.jpg" className={field} />
                    {current.ogImage && (
                      <img src={current.ogImage} alt="OG Preview" className="mt-2 h-28 w-full rounded-xl object-cover bg-slate-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                  </div>
                </div>

                <div>
                  <p className={fieldLabel}>Canonical URL</p>
                  <input value={current.canonical} onChange={(e) => update("canonical", e.target.value)} placeholder="https://rizzleather.com/" className={field} />
                </div>

                {/* Google Preview */}
                {(current.title || current.description) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Google Preview</p>
                    <p className="text-[18px] text-blue-700 font-normal leading-tight">{current.title || "Page Title"}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{current.canonical || `rizzleather.com${activePage.path}`}</p>
                    <p className="text-sm text-slate-600 mt-1 leading-snug line-clamp-2">{current.description || "Page description..."}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-slate-200">
                  <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50">
                    {saving ? "Saving....." : "Save SEO"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
