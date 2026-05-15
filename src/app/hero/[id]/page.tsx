"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetHeroByIdQuery,
  usePatchHeroByIdMutation,
  type HeroPayload,
} from "@/lib/slices/apiSlice";

export default function HeroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heroId = String(params.id);

  const { data: hero, isLoading, error, refetch } = useGetHeroByIdQuery(heroId);
  const [patchHeroById, { isLoading: isPatching }] = usePatchHeroByIdMutation();

  const [isEditMode, setIsEditMode] = useState(false);
  const [draft, setDraft] = useState<Partial<HeroPayload>>({});
  const [message, setMessage] = useState<string | null>(null);

  function getErrorStatus(error: unknown): number | null {
    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status?: unknown }).status;
      return typeof status === "number" ? status : null;
    }
    return null;
  }

  function openEditMode() {
    if (hero) {
      setDraft({ ...hero });
      setIsEditMode(true);
      setMessage(null);
    }
  }

  function closeEditMode() {
    setIsEditMode(false);
    setDraft({});
    setMessage(null);
  }

  function updateDraft<K extends keyof HeroPayload>(key: K, value: HeroPayload[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addPoint() {
    const currentPoints = (draft.keyPoints as string[]) || [];
    setDraft((current) => ({
      ...current,
      keyPoints: [...currentPoints, ""],
    }));
  }

  function updatePoint(index: number, value: string) {
    const currentPoints = (draft.keyPoints as string[]) || [];
    const nextPoints = [...currentPoints];
    nextPoints[index] = value;
    setDraft((current) => ({ ...current, keyPoints: nextPoints }));
  }

  function removePoint(index: number) {
    const currentPoints = (draft.keyPoints as string[]) || [];
    setDraft((current) => ({
      ...current,
      keyPoints: currentPoints.filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  async function handleSaveChanges() {
    try {
      const cleanedDraft = {
        ...draft,
        keyPoints: ((draft.keyPoints as string[]) || []).filter(
          (point) => point.trim().length > 0
        ),
      };

      await patchHeroById({
        heroId,
        data: cleanedDraft,
      }).unwrap();

      setMessage("Hero updated successfully!");
      closeEditMode();
      await refetch();
    } catch (submitError) {
      const submitMessage =
        submitError instanceof Error ? submitError.message : "Unable to update hero.";
      setMessage(submitMessage);
    }
  }

  const errorStatus = getErrorStatus(error);
  const backgroundFieldLabel =
    (draft.type as string) === "VIDEO"
      ? "Background video URL"
      : "Background image URL";
  const backgroundFieldPlaceholder =
    (draft.type as string) === "VIDEO"
      ? "https://...video.mp4"
      : "https://...image.jpg";

  const displayHero = hero;
  const keyPoints = (draft.keyPoints as string[]) || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="space-y-4 p-6 lg:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">
                  Hero Details
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Hero ID {heroId}
                </h1>
              </div>
              <div className="flex gap-2">
                {isEditMode ? (
                  <button
                    onClick={closeEditMode}
                    className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
                  >
                    ← Back
                  </button>
                ) : (
                  <button
                    onClick={() => router.back()}
                    className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
                  >
                    ← Back
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {message ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              message.includes("success") || message.includes("successfully")
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {message}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        ) : errorStatus === 404 ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="text-sm font-semibold text-rose-900">Hero not found</p>
            <p className="mt-2 text-sm text-rose-700">
              No hero exists with ID {heroId}.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="text-sm font-semibold text-rose-900">Error loading hero</p>
            <p className="mt-2 text-sm text-rose-700">Unable to fetch hero details.</p>
          </div>
        ) : displayHero ? (
          isEditMode ? (
            /* EDIT FORM */
            <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">
                    Edit hero
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    Hero ID {heroId}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Make changes and save them.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Type
                  </span>
                  <select
                    value={(draft.type as string) || "IMAGE"}
                    onChange={(event) =>
                      updateDraft("type", event.target.value as HeroPayload["type"])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                  >
                    <option value="IMAGE">IMAGE</option>
                    <option value="VIDEO">VIDEO</option>
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {backgroundFieldLabel}
                  </span>
                  <input
                    value={(draft.backgroundImageUrl as string) || ""}
                    onChange={(event) =>
                      updateDraft("backgroundImageUrl", event.target.value)
                    }
                    placeholder={backgroundFieldPlaceholder}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Slogan
                  </span>
                  <input
                    value={(draft.slogan as string) || ""}
                    onChange={(event) => updateDraft("slogan", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Order
                  </span>
                  <input
                    type="number"
                    value={(draft.order as number) || 1}
                    onChange={(event) =>
                      updateDraft("order", Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Title
                  </span>
                  <input
                    value={(draft.title as string) || ""}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Subtitle
                  </span>
                  <textarea
                    value={(draft.subtitle as string) || ""}
                    onChange={(event) =>
                      updateDraft("subtitle", event.target.value)
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Key points</h3>
                    <p className="text-sm text-slate-500">
                      These map directly to the JSON array.
                    </p>
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
                  {keyPoints.map((point, index) => (
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
                  <p className="text-xs text-slate-500">
                    Toggle whether this hero is visible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateDraft("isActive", !(draft.isActive as boolean))
                  }
                  aria-pressed={draft.isActive}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                    draft.isActive ? "bg-teal-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
                      draft.isActive ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isPatching}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPatching ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={closeEditMode}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </section>
          ) : (
            /* VIEW MODE */
            <div className="space-y-6">
              {/* Hero Preview */}
              <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <div className="relative h-64 bg-gradient-to-br from-slate-100 to-slate-200 sm:h-80">
                  {displayHero.backgroundImageUrl && (
                    <img
                      src={displayHero.backgroundImageUrl}
                      alt={displayHero.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">
                      {displayHero.type}
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                      {displayHero.title}
                    </h2>
                    {displayHero.slogan && (
                      <p className="mt-2 text-lg text-white/90">{displayHero.slogan}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Hero Information */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column - Main Info */}
                <div className="space-y-6">
                  {/* Subtitle */}
                  <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Subtitle
                    </p>
                    <p className="mt-3 text-lg leading-relaxed text-slate-900">
                      {displayHero.subtitle}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Status
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              displayHero.isActive ? "bg-teal-500" : "bg-slate-300"
                            }`}
                          />
                          <span className="text-sm font-medium text-slate-900">
                            {displayHero.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Order
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {displayHero.order}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Key Points */}
                <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Key Points
                  </p>
                  <ul className="mt-4 space-y-3">
                    {displayHero.keyPoints.length > 0 ? (
                      displayHero.keyPoints.map((point, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 rounded-full bg-teal-100 p-2">
                            <span className="text-xs font-semibold text-teal-700">✓</span>
                          </span>
                          <span className="text-sm text-slate-700">{point}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">No key points defined</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Background URL */}
              <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {displayHero.type === "VIDEO"
                    ? "Background Video URL"
                    : "Background Image URL"}
                </p>
                <div className="mt-3 break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-600">
                  {displayHero.backgroundImageUrl}
                </div>
              </div>

              {/* Full Payload */}
              <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
                  Full Payload
                </p>
                <pre className="mt-4 overflow-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-200">
                  {JSON.stringify(displayHero, null, 2)}
                </pre>
              </div>

              {/* Edit Button */}
              <div className="flex gap-3">
                <button
                  onClick={openEditMode}
                  className="rounded-full border border-teal-200 bg-teal-50 px-6 py-2.5 text-sm font-semibold text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
                >
                  Edit Hero
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <p className="text-sm text-slate-500">No hero data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
