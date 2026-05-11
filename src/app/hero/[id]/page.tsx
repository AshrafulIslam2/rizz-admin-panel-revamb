"use client";

import { useParams, useRouter } from "next/navigation";
import { useGetHeroByIdQuery } from "@/lib/slices/apiSlice";

export default function HeroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heroId = String(params.id);

  const { data: hero, isLoading, error } = useGetHeroByIdQuery(heroId);

  function getErrorStatus(error: unknown): number | null {
    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status?: unknown }).status;
      return typeof status === "number" ? status : null;
    }
    return null;
  }

  const errorStatus = getErrorStatus(error);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="space-y-4 p-6 lg:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">Hero Details</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Hero ID {heroId}</h1>
              </div>
              <button
                onClick={() => router.back()}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
              >
                ← Back
              </button>
            </div>
          </div>
        </header>

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
            <p className="mt-2 text-sm text-rose-700">No hero exists with ID {heroId}.</p>
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="text-sm font-semibold text-rose-900">Error loading hero</p>
            <p className="mt-2 text-sm text-rose-700">Unable to fetch hero details.</p>
          </div>
        ) : hero ? (
          <div className="space-y-6">
            {/* Hero Preview */}
            <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="relative h-64 bg-gradient-to-br from-slate-100 to-slate-200 sm:h-80">
                {hero.backgroundImageUrl && (
                  <img
                    src={hero.backgroundImageUrl}
                    alt={hero.title}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">{hero.type}</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{hero.title}</h2>
                  {hero.slogan && <p className="mt-2 text-lg text-white/90">{hero.slogan}</p>}
                </div>
              </div>
            </div>

            {/* Hero Information */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Main Info */}
              <div className="space-y-6">
                {/* Subtitle */}
                <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Subtitle</p>
                  <p className="mt-3 text-lg leading-relaxed text-slate-900">{hero.subtitle}</p>
                </div>

                {/* Status */}
                <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Status</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${hero.isActive ? "bg-teal-500" : "bg-slate-300"}`}
                        />
                        <span className="text-sm font-medium text-slate-900">
                          {hero.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Order</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{hero.order}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Key Points */}
              <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Key Points</p>
                <ul className="mt-4 space-y-3">
                  {hero.keyPoints.length > 0 ? (
                    hero.keyPoints.map((point, index) => (
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
                {hero.type === "VIDEO" ? "Background Video URL" : "Background Image URL"}
              </p>
              <div className="mt-3 break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-600">
                {hero.backgroundImageUrl}
              </div>
            </div>

            {/* Full Payload */}
            <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Full Payload</p>
              <pre className="mt-4 overflow-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-200">
                {JSON.stringify(hero, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <p className="text-sm text-slate-500">No hero data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
