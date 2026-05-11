"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreatePageHeroMutation,
  useDeletePageHeroMutation,
  useGetPageHeroQuery,
  useGetPagesQuery,
  usePatchPageHeroMutation,
  type HeroPayload,
} from "@/lib/slices/apiSlice";

type PageId = number | string;

type PageRecord = {
  hero: HeroPayload;
  id: PageId;
  title: string;
  slug: string;
  parentId: PageId | null;
  isVisible: boolean;
  order: number;
  children?: PageRecord[];
};

const INITIAL_DRAFT: HeroPayload = {
  type: "IMAGE",
  backgroundImageUrl: "https://cdn.example.com/banners/home.jpg",
  slogan: "Discover more",
  title: "Step Into Comfort",
  subtitle: "New arrivals for every season",
  keyPoints: ["Free shipping", "30-day return", "Premium materials"],
  isActive: true,
  order: 1,
};

function sortPages(pages: PageRecord[]): PageRecord[] {
  return [...pages]
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
    .map((page) => ({
      ...page,
      children: page.children ? sortPages(page.children) : [],
    }));
}

function flattenPages(pages: PageRecord[], depth = 0): Array<PageRecord & { depth: number }> {
  return pages.flatMap((page) => [
    { ...page, depth },
    ...flattenPages(page.children ?? [], depth + 1),
  ]);
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }

  return null;
}

function PageHeroPanel({
  page,
  onCreateHero,
  onEditHero,
  onDeleteHero,
  onToggleActive,
  onViewDetails,
}: {
  page: PageRecord & { depth: number };
  onCreateHero: (page: PageRecord) => void;
  onEditHero: (page: PageRecord, hero: HeroPayload) => void;
  onDeleteHero: (page: PageRecord) => void;
  onToggleActive: (page: PageRecord, hero: HeroPayload) => void;
  onViewDetails: (heroId: PageId) => void;
}) {
  const { data: hero, error, isFetching } = useGetPageHeroQuery(page.id);
  const errorStatus = getErrorStatus(error);
  const hasHero = Boolean(hero);
  const missingHero = errorStatus === 404;
  const heroData = hasHero ? hero : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm shadow-slate-200/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{page.title}</h3>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              {page.isVisible ? "Visible" : "Hidden"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>/{page.slug}</span>
            <span>Order {page.order}</span>
            <span>ID {page.id}</span>
          </div>
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {isFetching ? "Checking hero" : hasHero ? "Hero exists" : missingHero ? "No hero" : "Hero error"}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        {heroData ? (
          <div className="space-y-4">
            <div 
              className="flex flex-wrap items-start justify-between gap-3 cursor-pointer rounded-xl border border-transparent hover:border-teal-200 hover:bg-teal-50/30 p-3 transition"
              onClick={() => onViewDetails(page.id)}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Current hero</p>
                <h4 className="mt-1 text-lg font-semibold text-slate-950">{heroData.title}</h4>
                <p className="mt-1 text-sm text-slate-500">{heroData.slogan}</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {heroData.type}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onViewDetails(page.hero.id)}
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 transition hover:border-blue-300 hover:bg-blue-100"
              >
                View Details
              </button>
              <button
                type="button"
                onClick={() => onEditHero(page, heroData)}
                className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
              >
                Edit Hero
              </button>
              <button
                type="button"
                onClick={() => onToggleActive(page, heroData)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                {heroData.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => onDeleteHero(page)}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                Delete
              </button>
            </div>
          </div>
        ) : missingHero ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">No hero yet</p>
              <p className="text-sm text-slate-500">Create the hero content for this page.</p>
            </div>
            <button
              type="button"
              onClick={() => onCreateHero(page)}
              className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
            >
              Add Hero
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Unable to load hero state for this page.
          </div>
        )}
      </div>
    </div>
  );
}

function HeroForm({
  page,
  mode,
  draft,
  onChange,
  onAddPoint,
  onUpdatePoint,
  onRemovePoint,
  onCancel,
  onSubmit,
  isSaving,
}: {
  page: PageRecord | null;
  mode: "create" | "edit";
  draft: HeroPayload;
  onChange: <K extends keyof HeroPayload>(key: K, value: HeroPayload[K]) => void;
  onAddPoint: () => void;
  onUpdatePoint: (index: number, value: string) => void;
  onRemovePoint: (index: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSaving: boolean;
}) {
  const backgroundFieldLabel = draft.type === "VIDEO" ? "Background video URL" : "Background image URL";
  const backgroundFieldPlaceholder = draft.type === "VIDEO" ? "https://...video.mp4" : "https://...image.jpg";

  const payload = useMemo(
    () => ({
      ...draft,
      keyPoints: draft.keyPoints.filter((point) => point.trim().length > 0),
    }),
    [draft],
  );

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">
            {mode === "create" ? "Create hero" : "Edit hero"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {page ? `For ${page.title}` : "Choose a page"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Fill the form, then save it for the selected page.
          </p>
        </div>
        {page ? (
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
            Page ID {page.id}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Type</span>
          <select
            value={draft.type}
            onChange={(event) => onChange("type", event.target.value as HeroPayload["type"])}
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
            onChange={(event) => onChange("backgroundImageUrl", event.target.value)}
            placeholder={backgroundFieldPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slogan</span>
          <input
            value={draft.slogan}
            onChange={(event) => onChange("slogan", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order</span>
          <input
            type="number"
            value={draft.order}
            onChange={(event) => onChange("order", Number(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Title</span>
          <input
            value={draft.title}
            onChange={(event) => onChange("title", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subtitle</span>
          <textarea
            value={draft.subtitle}
            onChange={(event) => onChange("subtitle", event.target.value)}
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
            onClick={onAddPoint}
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
                onChange={(event) => onUpdatePoint(index, event.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onRemovePoint(index)}
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
          onClick={() => onChange("isActive", !draft.isActive)}
          aria-pressed={draft.isActive}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${draft.isActive ? "bg-teal-600" : "bg-slate-300"}`}
        >
          <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${draft.isActive ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Payload</p>
        <pre className="mt-4 overflow-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-200">
{JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!page || isSaving}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : mode === "create" ? "Create hero" : "Save hero"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

export default function HeroPage() {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState<PageRecord | null>(null);
  const [selectedHero, setSelectedHero] = useState<HeroPayload | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<HeroPayload>(INITIAL_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const { data: pagesData, isLoading, error } = useGetPagesQuery();
  const [createPageHero, { isLoading: isCreating }] = useCreatePageHeroMutation();
  const [patchPageHero, { isLoading: isPatching }] = usePatchPageHeroMutation();
  const [deletePageHero] = useDeletePageHeroMutation();

  const pages = useMemo(() => sortPages(pagesData ?? []), [pagesData]);
  const flatPages = useMemo(() => flattenPages(pages), [pages]);
  const isSaving = isCreating || isPatching;

  function handleViewDetails(heroId: PageId) {
    router.push(`/hero/${heroId}`);
  }

  function openCreateHero(page: PageRecord) {
    setSelectedPage(page);
    setSelectedHero(null);
    setFormMode("create");
    setShowForm(true);
    setMessage(null);
    setDraft(INITIAL_DRAFT);
  }

  function openEditHero(page: PageRecord, hero: HeroPayload) {
    setSelectedPage(page);
    setSelectedHero(hero);
    setFormMode("edit");
    setShowForm(true);
    setMessage(null);
    setDraft({ ...hero, keyPoints: [...hero.keyPoints] });
  }

  function closeHeroForm() {
    setShowForm(false);
    setSelectedPage(null);
    setSelectedHero(null);
    setFormMode("create");
    setMessage(null);
    setDraft(INITIAL_DRAFT);
  }

  function updateDraft<K extends keyof HeroPayload>(key: K, value: HeroPayload[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addPoint() {
    setDraft((current) => ({ ...current, keyPoints: [...current.keyPoints, ""] }));
  }

  function updatePoint(index: number, value: string) {
    setDraft((current) => {
      const nextPoints = [...current.keyPoints];
      nextPoints[index] = value;
      return { ...current, keyPoints: nextPoints };
    });
  }

  function removePoint(index: number) {
    setDraft((current) => ({
      ...current,
      keyPoints: current.keyPoints.filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  async function handleSubmit() {
    if (!selectedPage) {
      return;
    }

    const payload = {
      ...draft,
      keyPoints: draft.keyPoints.filter((point) => point.trim().length > 0),
    };

    try {
      if (formMode === "create") {
        await createPageHero({ pageId: selectedPage.id, data: payload }).unwrap();
      } else {
        // Use PATCH for incremental edits (partial update)
        await patchPageHero({ pageId: selectedPage.id, data: payload }).unwrap();
      }

      setMessage(`Hero ${formMode === "create" ? "created" : "updated"} for ${selectedPage.title}.`);
      closeHeroForm();
    } catch (submitError) {
      const submitMessage = submitError instanceof Error ? submitError.message : "Unable to save hero.";
      setMessage(submitMessage);
    }
  }

  async function handleDeleteHero(page: PageRecord) {
    try {
      await deletePageHero(page.id).unwrap();
      if (selectedPage?.id === page.id) {
        closeHeroForm();
      }
      setMessage(`Hero deleted for ${page.title}.`);
    } catch (deleteError) {
      const deleteMessage = deleteError instanceof Error ? deleteError.message : "Unable to delete hero.";
      setMessage(deleteMessage);
    }
  }

  async function handleToggleActive(page: PageRecord, hero: HeroPayload) {
    try {
      await patchPageHero({ pageId: page.id, data: { isActive: !hero.isActive } }).unwrap();
      setMessage(`${page.title} hero is now ${hero.isActive ? "inactive" : "active"}.`);
    } catch (patchError) {
      const patchMessage = patchError instanceof Error ? patchError.message : "Unable to update hero.";
      setMessage(patchMessage);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">Hero</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Hero list for all pages</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Every page shows its hero state. If a hero already exists, you can edit, patch, or delete it from the same screen.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Pages</p>
                  <h2 className="mt-1 text-xl font-semibold">{flatPages.length} loaded</h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {showForm ? "Form open" : "Select a page"}
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">
                  {selectedPage ? `Ready for ${selectedPage.title}.` : "Choose a page below to view or create its hero."}
                </p>
              </div>
            </div>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Page list</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">All pages</h2>
                <p className="mt-1 text-sm text-slate-500">Hero status appears page by page.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  Unable to load pages.
                </div>
              ) : flatPages.length > 0 ? (
                flatPages.map((page) => (
                  <div key={page.id} style={{ marginLeft: page.depth * 16 }}>
                    <PageHeroPanel
                      page={page}
                      onCreateHero={openCreateHero}
                      onEditHero={openEditHero}
                      onDeleteHero={handleDeleteHero}
                      onToggleActive={handleToggleActive}
                      onViewDetails={handleViewDetails}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
                  No pages found. Load the page tree first.
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            {showForm ? (
              <HeroForm
                page={selectedPage}
                mode={formMode}
                draft={draft}
                onChange={updateDraft}
                onAddPoint={addPoint}
                onUpdatePoint={updatePoint}
                onRemovePoint={removePoint}
                onCancel={closeHeroForm}
                onSubmit={handleSubmit}
                isSaving={isSaving}
              />
            ) : (
              <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Hero editor</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Click Add Hero or Edit Hero on a page.</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                  The hero form appears here after you choose a page from the list.
                </p>
              </section>
            )}

            <section className="rounded-[28px] border border-white/70 bg-slate-950 px-5 py-5 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Flow</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">1. GET /api/pages gives the full page tree.</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">2. Each page checks its hero with GET /api/pages/:pageId/hero.</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">3. Use POST, PUT, PATCH, and DELETE from the same screen.</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
