"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type Value = { title: string; body: string };
type TimelineItem = { year: string; event: string };

type AboutData = {
  heroImage: string;
  storyParagraphs: string[];
  values: Value[];
  timeline: TimelineItem[];
  quoteText: string;
  quoteAuthor: string;
};

const DEFAULT: AboutData = {
  heroImage: "/assets/images/rizz_master_color_sandals/image01.jpg",
  storyParagraphs: [
    "RIZZ was founded in 2018 in a workshop in Chittagong's leather district — the same streets where Bangladeshi leather has been cut, stitched, and exported for over a century.",
    "We sell directly. We make everything ourselves. We stand behind every piece with a one-year warranty.",
    "Today, RIZZ makes footwear, belts, and wallets from genuine leather, with Cash on Delivery across Bangladesh and international shipping to Europe, USA, and the Middle East.",
  ],
  values: [
    { title: "Genuine Leather. Always.", body: "Every piece uses real leather — full-grain, vegetable-tanned, suede, or embossed calfskin." },
    { title: "Made by Hand.", body: "Our craftsmen cut, stitch, and finish each piece individually." },
    { title: "Direct to You.", body: "We sell directly to the customer, with no middlemen." },
    { title: "Made to Last.", body: "Properly cared for, our pieces improve with age. We back that with a one-year craftsmanship warranty." },
  ],
  timeline: [
    { year: "2018", event: "Founded in a small workshop in Chittagong's leather district." },
    { year: "2020", event: "Launched first retail collection — 3 styles, 80 pairs. Sold out in 6 weeks." },
    { year: "2022", event: "Expanded to full footwear, belts, and wallets. Began COD delivery nationwide." },
    { year: "2024", event: "Started international shipping to UAE, UK, and USA." },
    { year: "2025", event: "Launched the RIZZ digital store." },
  ],
  quoteText: "Every pair that leaves our workshop carries a piece of Chittagong with it.",
  quoteAuthor: "The Rizz Atelier",
};

export default function AboutPage() {
  const [data, setData] = useState<AboutData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"story" | "values" | "timeline">("story");

  useEffect(() => {
    fetch(`${API}/about`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/about`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error();
      setMsg("About page saved.");
    } catch {
      setMsg("Failed to save. (API not connected — changes saved locally)");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  function updateParagraph(i: number, val: string) {
    setData((d) => { const p = [...d.storyParagraphs]; p[i] = val; return { ...d, storyParagraphs: p }; });
  }
  function addParagraph() {
    setData((d) => ({ ...d, storyParagraphs: [...d.storyParagraphs, ""] }));
  }
  function removeParagraph(i: number) {
    setData((d) => ({ ...d, storyParagraphs: d.storyParagraphs.filter((_, idx) => idx !== i) }));
  }

  function updateValue(i: number, key: keyof Value, val: string) {
    setData((d) => { const v = [...d.values]; v[i] = { ...v[i], [key]: val }; return { ...d, values: v }; });
  }
  function addValue() { setData((d) => ({ ...d, values: [...d.values, { title: "", body: "" }] })); }
  function removeValue(i: number) { setData((d) => ({ ...d, values: d.values.filter((_, idx) => idx !== i) })); }

  function updateTimeline(i: number, key: keyof TimelineItem, val: string) {
    setData((d) => { const t = [...d.timeline]; t[i] = { ...t[i], [key]: val }; return { ...d, timeline: t }; });
  }
  function addTimeline() { setData((d) => ({ ...d, timeline: [...d.timeline, { year: "", event: "" }] })); }
  function removeTimeline(i: number) { setData((d) => ({ ...d, timeline: d.timeline.filter((_, idx) => idx !== i) })); }

  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
  const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Content</p>
          <h1 className="mt-1 text-2xl font-semibold">About Page</h1>
          <p className="mt-1 text-sm text-slate-400">Edit the brand story, values, and timeline shown on /about.</p>
        </header>

        {msg && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{msg}</div>}

        {/* Hero & Quote */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Hero & Quote</h2>
          <div>
            <p className={lbl}>Hero Image URL</p>
            <input value={data.heroImage} onChange={(e) => setData((d) => ({ ...d, heroImage: e.target.value }))} className={field} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={lbl}>Quote Text</p>
              <textarea value={data.quoteText} onChange={(e) => setData((d) => ({ ...d, quoteText: e.target.value }))} rows={2} className={field + " resize-none"} />
            </div>
            <div>
              <p className={lbl}>Quote Author</p>
              <input value={data.quoteAuthor} onChange={(e) => setData((d) => ({ ...d, quoteAuthor: e.target.value }))} className={field} />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["story", "values", "timeline"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                activeTab === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Story */}
        {activeTab === "story" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Brand Story Paragraphs</h2>
            {data.storyParagraphs.map((p, i) => (
              <div key={i} className="flex gap-3">
                <textarea
                  value={p}
                  onChange={(e) => updateParagraph(i, e.target.value)}
                  rows={3}
                  className={field + " resize-none flex-1"}
                  placeholder={`Paragraph ${i + 1}`}
                />
                <button onClick={() => removeParagraph(i)} className="self-start rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-100 transition">✕</button>
              </div>
            ))}
            <button onClick={addParagraph} className="text-sm text-teal-600 hover:text-teal-700 font-medium">+ Add paragraph</button>
          </section>
        )}

        {/* Values */}
        {activeTab === "values" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Brand Values (4 shown on /about)</h2>
            {data.values.map((v, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Value {i + 1}</p>
                  <button onClick={() => removeValue(i)} className="text-xs text-rose-500 hover:text-rose-700">Remove</button>
                </div>
                <input value={v.title} onChange={(e) => updateValue(i, "title", e.target.value)} placeholder="Value title" className={field} />
                <textarea value={v.body} onChange={(e) => updateValue(i, "body", e.target.value)} rows={2} placeholder="Value description" className={field + " resize-none"} />
              </div>
            ))}
            <button onClick={addValue} className="text-sm text-teal-600 hover:text-teal-700 font-medium">+ Add value</button>
          </section>
        )}

        {/* Timeline */}
        {activeTab === "timeline" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Brand Timeline</h2>
            {data.timeline.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <input value={t.year} onChange={(e) => updateTimeline(i, "year", e.target.value)} placeholder="2025" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-24 shrink-0" />
                <input value={t.event} onChange={(e) => updateTimeline(i, "event", e.target.value)} placeholder="Milestone description" className={field} />
                <button onClick={() => removeTimeline(i)} className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-100 transition">✕</button>
              </div>
            ))}
            <button onClick={addTimeline} className="text-sm text-teal-600 hover:text-teal-700 font-medium">+ Add milestone</button>
          </section>
        )}

        <div className="flex gap-3 pb-4">
          <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50">
            {saving ? "Saving..." : "Save About Page"}
          </button>
        </div>
      </div>
    </div>
  );
}
