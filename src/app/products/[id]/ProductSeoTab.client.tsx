"use client";

import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/api-response";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400";
const label = "mb-1.5 block text-xs font-semibold text-slate-600";
const stringFields = ["meta_title", "meta_description", "focus_keyword", "seo_heading", "seo_content", "seo_content_bn"] as const;
const arrayFields = ["secondary_keywords", "long_tail_keywords", "geo_keywords"] as const;
type StringKey = typeof stringFields[number];
type ArrayKey = typeof arrayFields[number];
type SeoDraft = Record<StringKey, string> & Record<ArrayKey, string[]>;
type AiInput = { en?: Partial<SeoDraft> };
const names: Record<keyof SeoDraft, string> = {
  meta_title: "Meta title", meta_description: "Meta description", focus_keyword: "Focus keyword / মূল keyword",
  secondary_keywords: "Supporting keywords / সহায়ক keywords", long_tail_keywords: "Long-tail keywords",
  geo_keywords: "GEO / location keywords", seo_heading: "Product guide heading (English)",
  seo_content: "Product guide (English)", seo_content_bn: "Product guide (বাংলা)",
};
const cleanList = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === "string").map(v => v.trim()).filter(Boolean))] : [];
const parseList = (value: string) => cleanList(value.split(/[,\n]+/));
const readDraft = (source: Record<string, unknown>): SeoDraft => ({
  meta_title: String(source.meta_title ?? ""), meta_description: String(source.meta_description ?? ""),
  focus_keyword: String(source.focus_keyword ?? ""), secondary_keywords: cleanList(source.secondary_keywords),
  long_tail_keywords: cleanList(source.long_tail_keywords), geo_keywords: cleanList(source.geo_keywords),
  seo_heading: String(source.seo_heading ?? ""), seo_content: String(source.seo_content ?? ""), seo_content_bn: String(source.seo_content_bn ?? ""),
});

export default function ProductSeoTab({ productId, initial, aiData }: {
  productId: string; initial: Record<string, unknown>; aiData?: AiInput;
}) {
  const [draft, setDraft] = useState(() => readDraft(initial));
  const [listText, setListText] = useState(() => Object.fromEntries(arrayFields.map(key => [key, cleanList(initial[key]).join("\n")])) as Record<ArrayKey, string>);
  const [product, setProduct] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [preview, setPreview] = useState<Partial<SeoDraft> | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`${API}/products/${productId}`, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load saved SEO. Reopen this tab to retry.");
      return response.json();
    }).then(data => {
      if (!active) return;
      const loaded = readDraft(data);
      setProduct(data); setDraft(loaded); setLoaded(true);
      setListText(Object.fromEntries(arrayFields.map(key => [key, loaded[key].join("\n")])) as Record<ArrayKey, string>);
    }).catch(error => { if (active) setMsg({ text: error.message, ok: false }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  const payload = (): SeoDraft => ({ ...draft, ...Object.fromEntries(arrayFields.map(key => [key, parseList(listText[key])])) });
  function usePreview() {
    if (!preview) return;
    setDraft(current => ({ ...current, ...preview }));
    setListText(current => ({ ...current, ...Object.fromEntries(arrayFields.filter(key => preview[key] !== undefined).map(key => [key, cleanList(preview[key]).join("\n")])) }));
    setPreview(null); setMsg({ text: "Draft applied. Review your fields, then click Save SEO.", ok: true });
  }
  async function generate() {
    setGenerating(true); setMsg(null);
    try {
      const category = product.category as { name?: string } | null;
      const response = await fetch("/api/generate-product-seo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { name: product.name, material: product.material, specs: product.specs, craftsmanship: product.craftsmanship, tags: product.tags, category: category?.name ?? "", description: product.description || product.short_description || "" }, draft: payload(), instructions }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.error || "SEO generation failed.");
      setPreview(result.data);
    } catch (error) { setMsg({ text: error instanceof Error ? error.message : "Generation failed.", ok: false }); }
    finally { setGenerating(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const response = await fetch(`${API}/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(Array.isArray(result?.message) ? result.message.join(" ") : result?.message || "Could not save SEO.");
      setProduct(result); setMsg({ text: "SEO saved. Refresh the storefront product page to see the changes.", ok: true });
    } catch (error) { setMsg({ text: error instanceof Error ? error.message : "Could not save SEO.", ok: false }); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="space-y-5">
    {msg && <p role="status" className={`rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}
    <p className="text-xs leading-relaxed text-slate-500">Write your own SEO or generate a draft from this product and your notes. Keywords guide your content; they do not guarantee rankings. Product tags and URL slug are edited in the Tags and Basic Info tabs.</p>
    <fieldset disabled={loading || !loaded || saving || generating} className="space-y-5 disabled:opacity-60">
      <section className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
        <label className={label} htmlFor="seo-notes">AI notes / তোমার নির্দেশনা (optional)</label>
        <textarea id="seo-notes" value={instructions} onChange={e => setInstructions(e.target.value)} maxLength={2000} rows={3} className={field} placeholder="Describe the actual product, preferred keywords and target market. Example: black leather sandal, woven-pattern strap, buckle; Bangladesh shopping intent." />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generate} className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white">{generating ? "Generating…" : "AI Generate SEO + Keywords + Guide"}</button>
          {aiData?.en && <button type="button" onClick={() => { const generated: Partial<SeoDraft> = {}; for (const key of stringFields) if (typeof aiData.en?.[key] === "string") generated[key] = aiData.en[key]; for (const key of arrayFields) if (aiData.en?.[key]) generated[key] = cleanList(aiData.en[key]); setPreview(generated); }} className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-800">Preview main AI generator SEO</button>}
        </div>
        <p className="text-xs text-violet-800">Generate → Review draft → Use draft → Save SEO. AI generation never saves automatically.</p>
      </section>
      {preview && <section className="space-y-3 rounded-xl border border-violet-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">AI draft — review before applying</h3>
        {([...stringFields, ...arrayFields] as const).filter(key => preview[key] !== undefined).map(key => <div key={key}><p className={label}>{names[key]}</p><p className="whitespace-pre-line text-sm text-slate-700">{Array.isArray(preview[key]) ? preview[key].join("\n") : preview[key]}</p></div>)}
        <button type="button" onClick={usePreview} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white">Use this draft</button>
        <button type="button" onClick={() => setPreview(null)} className="ml-3 text-xs text-slate-600">Discard draft</button>
      </section>}
      <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">rizzleather.com/brand/catalog/{String(product.slug ?? "")}</p><p className="mt-1 text-base text-blue-700">{draft.meta_title || `${product.name} | RIZZ Leather`}</p><p className="mt-1 text-sm text-slate-600">{draft.meta_description || String(product.short_description ?? "")}</p></div>
      {stringFields.slice(0, 3).map(key => <div key={key}><label htmlFor={`seo-${key}`} className={label}>{names[key]}{key === "meta_title" ? ` (${draft[key].length}/60)` : key === "meta_description" ? ` (${draft[key].length}/160)` : ""}</label>{key === "meta_description" ? <textarea id={`seo-${key}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} rows={3} maxLength={1000} className={field} /> : <input id={`seo-${key}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} maxLength={500} className={field} />}</div>)}
      {arrayFields.map(key => <div key={key}><label htmlFor={`seo-${key}`} className={label}>{names[key]}</label><textarea id={`seo-${key}`} value={listText[key]} onChange={e => setListText({ ...listText, [key]: e.target.value })} rows={4} className={field} placeholder="One phrase per line, or separate with commas" /><p className="mt-1 text-xs text-slate-500">{parseList(listText[key]).length} unique phrases. {key === "geo_keywords" ? "Use relevant Bangladesh/local shopping phrases, not unverified factory or shop locations." : ""}</p></div>)}
      <section className="space-y-4 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Visible product guide / customer-facing content</h3>
        <p className="text-xs text-slate-500">Naturally answer what this product is and how to buy it. This appears on the product page; blank content stays hidden. No raw keyword list is displayed to shoppers.</p>
        {stringFields.slice(3).map(key => <div key={key}><label htmlFor={`seo-${key}`} className={label}>{names[key]}</label>{key === "seo_heading" ? <input id={`seo-${key}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} maxLength={500} className={field} /> : <textarea id={`seo-${key}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} rows={5} maxLength={12000} className={field} />}</div>)}
      </section>
      <button disabled={loading || !loaded || saving || generating} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white">{loading ? "Loading saved SEO…" : saving ? "Saving…" : "Save SEO"}</button>
    </fieldset>
  </form>;
}
