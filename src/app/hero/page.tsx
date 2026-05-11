"use client";

import { useMemo, useState } from "react";

type HeroDraft = {
  type: "IMAGE" | "VIDEO";
  backgroundImageUrl: string;
  slogan: string;
  title: string;
  subtitle: string;
  keyPoints: string[];
  isActive: boolean;
  order: number;
};

const INITIAL_DRAFT: HeroDraft = {
  type: "IMAGE",
  backgroundImageUrl: "https://cdn.example.com/banners/home.jpg",
  slogan: "Discover more",
  title: "Step Into Comfort",
  subtitle: "New arrivals for every season",
  keyPoints: ["Free shipping", "30-day return", "Premium materials"],
  isActive: true,
  order: 1,
};

export default function HeroPage() {
  const [draft, setDraft] = useState<HeroDraft>(INITIAL_DRAFT);

  const payload = useMemo(
    () => ({
      ...draft,
      keyPoints: draft.keyPoints.filter((point) => point.trim().length > 0),
    }),
    [draft],
  );

  function updateDraft<K extends keyof HeroDraft>(key: K, value: HeroDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updatePoint(index: number, value: string) {
    setDraft((current) => {
      const nextPoints = [...current.keyPoints];
      nextPoints[index] = value;
      return { ...current, keyPoints: nextPoints };
    });
  }

  function addPoint() {
    setDraft((current) => ({ ...current, keyPoints: [...current.keyPoints, ""] }));
  }

  function removePoint(index: number) {
    setDraft((current) => ({
      ...current,
      keyPoints: current.keyPoints.filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  const backgroundFieldLabel = draft.type === "VIDEO" ? "Background video URL" : "Background image URL";
  const backgroundFieldPlaceholder = draft.type === "VIDEO" ? "https://...video.mp4" : "https://...image.jpg";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">Hero</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create the exact hero JSON payload.</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                This screen is structured around the payload you provided, so the editor stays aligned with the JSON contract.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-teal-300">type</p>
                  <h2 className="mt-1 text-xl font-semibold">{draft.type}</h2>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${draft.isActive ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-slate-300"}`}>
                  {draft.isActive ? "Active" : "Inactive"}
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">{draft.slogan}</p>
                <p className="mt-2 text-lg font-semibold text-white">{draft.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{draft.subtitle}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Editor</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Hero payload</h2>
                <p className="mt-1 text-sm text-slate-500">Only the fields from your JSON are exposed here.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                Order {draft.order}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Type</span>
                <select
                  value={draft.type}
                  onChange={(event) => updateDraft("type", event.target.value as HeroDraft["type"])}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                >
                  <option value="IMAGE">IMAGE</option>
                  <option value="VIDEO">VIDEO</option>
                </select>
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{backgroundFieldLabel}</span>
                <input
                  value={draft.backgroundImageUrl}
                  onChange={(event) => updateDraft("backgroundImageUrl", event.target.value)}
                  placeholder={backgroundFieldPlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slogan</span>
                <input
                  value={draft.slogan}
                  onChange={(event) => updateDraft("slogan", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order</span>
                <input
                  type="number"
                  value={draft.order}
                  onChange={(event) => updateDraft("order", Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subtitle</span>
                <textarea
                  value={draft.subtitle}
                  onChange={(event) => updateDraft("subtitle", event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Key points</h3>
                  <p className="text-sm text-slate-500">These map directly to the JSON array.</p>
                </div>
                <button
                  type="button"
                  onClick={addPoint}
                  className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
                >
                  Add point
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {draft.keyPoints.map((point, index) => (
                  <div key={`${index}-${point}`} className="flex gap-2">
                    <input
                      value={point}
                      onChange={(event) => updatePoint(index, event.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removePoint(index)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Active</p>
                <p className="text-xs text-slate-500">Toggle whether this hero is visible on its page.</p>
              </div>
              <button
                type="button"
                onClick={() => updateDraft("isActive", !draft.isActive)}
                aria-pressed={draft.isActive}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${draft.isActive ? "bg-teal-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${draft.isActive ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">JSON</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Payload preview</h2>
              </div>

              <div className="p-5">
                <pre className="overflow-auto rounded-[28px] bg-slate-950 p-5 text-xs leading-6 text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
{JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Preview</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Hero snapshot</h2>
              </div>

              <div className="p-5">
                <div
                  className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.88), rgba(15,23,42,0.52)), url(${draft.backgroundImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.32),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.24),transparent_36%)]" />
                  <div className="relative space-y-4">
                    <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                      {draft.type}
                    </span>
                    <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">
                      {draft.slogan}
                    </span>
                    <h3 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">{draft.title}</h3>
                    <p className="max-w-lg text-sm leading-6 text-slate-200">{draft.subtitle}</p>

                    <div className="grid gap-2 pt-1 text-sm text-slate-100 sm:grid-cols-1">
                      {payload.keyPoints.map((point) => (
                        <div key={point} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
