"use client";

import { useState } from "react";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  usePatchCategoryMutation,
  type CategoryRecord,
} from "@/lib/slices/apiSlice";

type CreateCategoryDraft = {
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  is_active: boolean;
  is_featured: boolean;
  show_on_homepage: boolean;
  thumbnail_image: string;
  banner_image: string;
  seo_title: string;
  seo_description: string;
  order: string;
};

const EMPTY_DRAFT: CreateCategoryDraft = {
  name: "",
  slug: "",
  description: "",
  parent_id: "",
  is_active: true,
  is_featured: false,
  show_on_homepage: false,
  thumbnail_image: "",
  banner_image: "",
  seo_title: "",
  seo_description: "",
  order: "",
};

const CATEGORIES = [
  {
    id: "cat-01",
    name: "Men's Loafers",
    slug: "mens-loafers",
    description: "Full-grain leather loafers handcrafted in Chittagong.",
    parent_id: null,
    is_active: true,
    is_featured: true,
    show_on_homepage: true,
    seo_title: "Men's Leather Loafers | RIZZ",
    seo_description: "Handcrafted genuine leather loafers for men. Made in Bangladesh.",
    order: 1,
  },
  {
    id: "cat-02",
    name: "Men's Sandals",
    slug: "mens-sandals",
    description: "Premium leather sandals — casual and formal styles.",
    parent_id: null,
    is_active: true,
    is_featured: true,
    show_on_homepage: true,
    seo_title: "Men's Leather Sandals | RIZZ",
    seo_description: "Genuine leather sandals for men, made in Chittagong.",
    order: 2,
  },
  {
    id: "cat-03",
    name: "Men's Belts",
    slug: "mens-belts",
    description: "Full-grain leather belts with brass hardware.",
    parent_id: null,
    is_active: true,
    is_featured: false,
    show_on_homepage: false,
    seo_title: "Men's Leather Belts | RIZZ",
    seo_description: "Genuine leather belts handcrafted in Bangladesh.",
    order: 3,
  },
  {
    id: "cat-04",
    name: "Men's Wallets",
    slug: "mens-wallets",
    description: "Slim and bifold leather wallets.",
    parent_id: null,
    is_active: true,
    is_featured: false,
    show_on_homepage: false,
    seo_title: "Men's Leather Wallets | RIZZ",
    seo_description: "Slim genuine leather wallets made in Chittagong.",
    order: 4,
  },
  {
    id: "cat-05",
    name: "Men's Half Loafers",
    slug: "mens-half-loafers",
    description: "Open-back slip-on loafers — comfort meets craft.",
    parent_id: null,
    is_active: true,
    is_featured: false,
    show_on_homepage: false,
    seo_title: "Men's Half Loafers | RIZZ",
    seo_description: "Leather half loafers handcrafted in Bangladesh.",
    order: 5,
  },
];

const STATUS_STYLES: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-900",
  Draft: "border-amber-200 bg-amber-50 text-amber-900",
};

export default function CategoriesPage() {
  const { data: categoriesData, isLoading, error } = useGetCategoriesQuery();
  const categories = (categoriesData ?? CATEGORIES) as CategoryRecord[];
  const totalItems = categories.length;
  const activeCount = categories.filter((category) => category.is_active).length;
  const draftCount = categories.filter((category) => !category.is_active).length;
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<CreateCategoryDraft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);
  const [createCategory, { isLoading: isSaving }] = useCreateCategoryMutation();
  const [patchCategory, { isLoading: isUpdating }] = usePatchCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const isSubmitting = isSaving || isUpdating;

  function updateDraft<K extends keyof CreateCategoryDraft>(key: K, value: CreateCategoryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const orderValue = draft.order.trim() === "" ? undefined : Number(draft.order);
    const payload = {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim() || undefined,
      parent_id: draft.parent_id.trim() || undefined,
      is_active: draft.is_active,
      is_featured: draft.is_featured,
      show_on_homepage: draft.show_on_homepage,
      thumbnail_image: draft.thumbnail_image.trim() || undefined,
      banner_image: draft.banner_image.trim() || undefined,
      seo_title: draft.seo_title.trim() || undefined,
      seo_description: draft.seo_description.trim() || undefined,
      order: typeof orderValue === "number" && !Number.isNaN(orderValue) ? orderValue : undefined,
    };

    try {
      if (editingId) {
        await patchCategory({ id: editingId, data: payload }).unwrap();
        setMessage("Category updated successfully.");
      } else {
        await createCategory(payload).unwrap();
        setMessage("Category created successfully.");
      }
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      const details = error && typeof error === "object" && "data" in error ? (error as any).data : null;
      const fallback = error instanceof Error ? error.message : "Unable to create category";
      setMessage(details?.error ?? fallback);
    }
  }

  function handleReset() {
    setDraft(EMPTY_DRAFT);
    setMessage(null);
    setEditingId(null);
  }

  function handleEdit(category: CategoryRecord) {
    setDraft({
      name: category.name ?? "",
      slug: category.slug ?? "",
      description: category.description ?? "",
      parent_id: category.parent_id ?? "",
      is_active: Boolean(category.is_active),
      is_featured: Boolean(category.is_featured),
      show_on_homepage: Boolean(category.show_on_homepage),
      thumbnail_image: category.thumbnail_image ?? "",
      banner_image: category.banner_image ?? "",
      seo_title: category.seo_title ?? "",
      seo_description: category.seo_description ?? "",
      order: category.order !== undefined && category.order !== null ? String(category.order) : "",
    });
    setEditingId(category.id);
    setShowForm(true);
    setMessage(null);
  }

  async function handleDelete(category: CategoryRecord) {
    if (!confirm(`Delete ${category.name}?`)) {
      return;
    }

    setMessage(null);
    try {
      await deleteCategory(category.id).unwrap();
      if (editingId === category.id) {
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
        setShowForm(false);
      }
      setMessage("Category deleted successfully.");
    } catch (error) {
      const details = error && typeof error === "object" && "data" in error ? (error as any).data : null;
      const fallback = error instanceof Error ? error.message : "Unable to delete category";
      setMessage(details?.error ?? fallback);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[32px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-400">Commerce</p>
          <h1 className="mt-2 text-3xl font-semibold">Product Categories</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Manage RIZZ product categories — loafers, sandals, belts, wallets, and accessories.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Total categories</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{totalItems}</p>
            <p className="mt-2 text-sm text-slate-500">All categories synced from the API.</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Active now</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{activeCount}</p>
            <p className="mt-2 text-sm text-slate-500">Ready to publish or already live.</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Draft queue</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{draftCount}</p>
            <p className="mt-2 text-sm text-slate-500">Needs review before it goes live.</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Directory</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Category list</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Create category
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Loading categories...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  Unable to load categories. Showing fallback data.
                </div>
              ) : null}

              {categories.map((category) => {
                const statusLabel = category.is_active ? "Active" : "Draft";
                return (
                <div
                  key={category.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition hover:border-teal-200 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{category.name}</p>
                      <p className="mt-1 text-sm text-slate-500">/{category.slug}</p>
                      {category.description ? (
                        <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${STATUS_STYLES[statusLabel] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      Order {category.order ?? 0}
                    </span>
                    <span>Parent {category.parent_id ?? "None"}</span>
                    <span>ID {category.id}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(category)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      disabled={isDeleting}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                    {editingId ? "Edit category" : "Create category"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">
                    {editingId ? "Update category" : "New category form"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm((current) => !current)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {showForm ? "Hide" : "Show"}
                </button>
              </div>

              {showForm ? (
                <form onSubmit={handleSubmit} className="mt-5 grid gap-4 text-sm text-slate-600">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Name</span>
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                      placeholder="Category name"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      required
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Slug</span>
                    <input
                      value={draft.slug}
                      onChange={(event) => updateDraft("slug", event.target.value)}
                      placeholder="category-slug"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      required
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft("description", event.target.value)}
                      placeholder="Short summary for the category"
                      className="min-h-[90px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Parent ID</span>
                    <select
                      value={draft.parent_id}
                      onChange={(event) => updateDraft("parent_id", event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="">None</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name} ({category.id})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(event) => updateDraft("is_active", event.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">Active category</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={draft.is_featured}
                      onChange={(event) => updateDraft("is_featured", event.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">Featured category</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={draft.show_on_homepage}
                      onChange={(event) => updateDraft("show_on_homepage", event.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">Show on homepage</span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Thumbnail image</span>
                    <input
                      value={draft.thumbnail_image}
                      onChange={(event) => updateDraft("thumbnail_image", event.target.value)}
                      placeholder="https://.../thumbnail.jpg"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Banner image</span>
                    <input
                      value={draft.banner_image}
                      onChange={(event) => updateDraft("banner_image", event.target.value)}
                      placeholder="https://.../banner.jpg"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">SEO title</span>
                    <input
                      value={draft.seo_title}
                      onChange={(event) => updateDraft("seo_title", event.target.value)}
                      placeholder="SEO title"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">SEO description</span>
                    <textarea
                      value={draft.seo_description}
                      onChange={(event) => updateDraft("seo_description", event.target.value)}
                      placeholder="SEO description"
                      className="min-h-[80px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Order</span>
                    <input
                      type="number"
                      value={draft.order}
                      onChange={(event) => updateDraft("order", event.target.value)}
                      placeholder="0"
                      min={0}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {isSubmitting ? "Saving..." : editingId ? "Update category" : "Save category"}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Reset
                    </button>
                  </div>

                  {message ? (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                      {message}
                    </div>
                  ) : null}
                </form>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Open the form to create a new category using the DTO fields.
                </p>
              )}
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Checklist</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Before publishing</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Confirm naming matches the page structure.</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Verify each item has an owner and priority.</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Schedule review if status is Draft.</div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.2)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-300">Next step</p>
              <h3 className="mt-2 text-xl font-semibold">Connect your data source</h3>
              <p className="mt-3 text-sm text-slate-300">
                Replace the static list with live categories from your backend or CMS when ready.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
