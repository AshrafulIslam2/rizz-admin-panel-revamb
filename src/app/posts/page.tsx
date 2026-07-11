"use client";

import { useState, useRef } from "react";
import {
  useGetBlogPostsQuery,
  useCreateBlogPostMutation,
  useUpdateBlogPostMutation,
  useDeleteBlogPostMutation,
  type BlogPostRecord,
  type CreateBlogPostPayload,
} from "@/lib/slices/apiSlice";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type SectionType = "p" | "h2" | "h3" | "ul" | "ol" | "callout" | "table";

type Section =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "table"; head: string[]; rows: string[][] };

const EMPTY_FORM: CreateBlogPostPayload = {
  title: "",
  slug: "",
  description: "",
  category: "Buying Guide",
  reading_time: 5,
  cover_image: "",
  cover_alt: "",
  body: [],
  is_published: false,
};

const CATEGORIES = [
  "Buying Guide",
  "Care & Maintenance",
  "Craftsmanship",
  "Brand Comparison",
  "Style Guide",
  "General",
];

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: Section;
  index: number;
  onChange: (s: Section) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const inputCls =
    "w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none";

  const renderFields = () => {
    if (section.type === "p" || section.type === "h2" || section.type === "h3" || section.type === "callout") {
      return (
        <textarea
          className={inputCls + " resize-none"}
          rows={section.type === "p" ? 3 : 2}
          value={section.text}
          placeholder={
            section.type === "p"
              ? "Paragraph text..."
              : section.type === "callout"
              ? "Callout / tip text..."
              : "Heading text..."
          }
          onChange={(e) => onChange({ ...section, text: e.target.value } as Section)}
        />
      );
    }

    if (section.type === "ul" || section.type === "ol") {
      return (
        <div className="space-y-1">
          {section.items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputCls + " flex-1"}
                value={item}
                placeholder={`Item ${i + 1}`}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = e.target.value;
                  onChange({ ...section, items } as Section);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const items = section.items.filter((_, j) => j !== i);
                  onChange({ ...section, items } as Section);
                }}
                className="px-2 text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...section, items: [...section.items, ""] } as Section)}
            className="text-xs text-teal-400 hover:text-teal-300"
          >
            + Add item
          </button>
        </div>
      );
    }

    if (section.type === "table") {
      return (
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-xs text-slate-400">Headers (comma-separated)</p>
            <input
              className={inputCls}
              value={section.head.join(", ")}
              placeholder="Column 1, Column 2, Column 3"
              onChange={(e) => {
                const head = e.target.value.split(",").map((h) => h.trim());
                onChange({ ...section, head } as Section);
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-400">Rows (one row per line, cells comma-separated)</p>
            <textarea
              className={inputCls + " resize-none font-mono text-xs"}
              rows={4}
              value={section.rows.map((r) => r.join(", ")).join("\n")}
              placeholder={"Cell 1, Cell 2, Cell 3\nCell 4, Cell 5, Cell 6"}
              onChange={(e) => {
                const rows = e.target.value
                  .split("\n")
                  .map((line) => line.split(",").map((c) => c.trim()));
                onChange({ ...section, rows } as Section);
              }}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  const typeLabels: Record<SectionType, string> = {
    p: "Paragraph",
    h2: "Heading 2",
    h3: "Heading 3",
    ul: "Bullet List",
    ol: "Numbered List",
    callout: "Callout",
    table: "Table",
  };

  const typeColors: Record<SectionType, string> = {
    p: "bg-slate-700",
    h2: "bg-indigo-800",
    h3: "bg-violet-800",
    ul: "bg-emerald-900",
    ol: "bg-cyan-900",
    callout: "bg-amber-900",
    table: "bg-rose-900",
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white ${typeColors[section.type]}`}>
          {typeLabels[section.type]}
        </span>
        <span className="text-xs text-slate-500">#{index + 1}</span>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={onMoveUp} className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white" title="Move up">↑</button>
          <button type="button" onClick={onMoveDown} className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white" title="Move down">↓</button>
          <button type="button" onClick={onRemove} className="px-1.5 py-0.5 text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      </div>
      {renderFields()}
    </div>
  );
}

function makeSection(type: SectionType): Section {
  switch (type) {
    case "ul":
    case "ol":
      return { type, items: [""] };
    case "table":
      return { type, head: ["Column 1", "Column 2"], rows: [["", ""]] };
    default:
      return { type, text: "" } as Section;
  }
}

export default function PostsPage() {
  const { data: posts = [], isLoading, refetch } = useGetBlogPostsQuery();
  const [createPost] = useCreateBlogPostMutation();
  const [updatePost] = useUpdateBlogPostMutation();
  const [deletePost] = useDeleteBlogPostMutation();

  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<BlogPostRecord | null>(null);
  const [form, setForm] = useState<CreateBlogPostPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setView("form");
  }

  function openEdit(post: BlogPostRecord) {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      description: post.description ?? "",
      category: post.category,
      reading_time: post.reading_time,
      cover_image: post.cover_image ?? "",
      cover_alt: post.cover_alt ?? "",
      body: post.body ?? [],
      is_published: post.is_published,
      published_at: post.published_at ?? "",
    });
    setError("");
    setSuccess("");
    setView("form");
  }

  function setField<K extends keyof CreateBlogPostPayload>(key: K, value: CreateBlogPostPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const sections: Section[] = (form.body ?? []) as Section[];

  function setSections(newSections: Section[]) {
    setField("body", newSections);
  }

  function addSection(type: SectionType) {
    setSections([...sections, makeSection(type)]);
  }

  function updateSection(i: number, s: Section) {
    const arr = [...sections];
    arr[i] = s;
    setSections(arr);
  }

  function removeSection(i: number) {
    setSections(sections.filter((_, j) => j !== i));
  }

  function moveSection(i: number, dir: -1 | 1) {
    const arr = [...sections];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSections(arr);
  }

  async function handleAiGenerate() {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: aiTopic, category: form.category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      const d = json.data;
      setForm((f) => ({
        ...f,
        title: d.title ?? f.title,
        slug: d.slug ?? slugify(d.title ?? f.title),
        description: d.description ?? f.description,
        category: d.category ?? f.category,
        reading_time: d.reading_time ?? f.reading_time,
        body: d.body ?? f.body,
      }));
      setSuccess("AI content generated! Review and edit below.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/uploads`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setField("cover_image", json.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.slug) {
      setError("Title and slug are required.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: CreateBlogPostPayload = {
        ...form,
        published_at:
          form.is_published && !form.published_at
            ? new Date().toISOString()
            : form.published_at || undefined,
      };
      if (editing) {
        await updatePost({ id: editing.id, data: payload }).unwrap();
        setSuccess("Post updated successfully.");
      } else {
        await createPost(payload).unwrap();
        setSuccess("Post created successfully.");
        setForm(EMPTY_FORM);
        setEditing(null);
      }
      refetch();
    } catch (e: any) {
      setError(e?.data?.message || e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(post: BlogPostRecord) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await deletePost(post.id).unwrap();
      refetch();
    } catch (e: any) {
      alert(e?.data?.message || "Delete failed");
    }
  }

  const inputCls =
    "w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none";

  if (view === "form") {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setView("list")}
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Posts
            </button>
            <h1 className="text-xl font-semibold">
              {editing ? "Edit Post" : "New Post"}
            </h1>
          </div>

          {/* AI Generate */}
          <div className="mb-6 rounded-xl border border-teal-800 bg-slate-900 p-5">
            <p className="mb-3 text-sm font-semibold text-teal-400">✦ AI Generate</p>
            <div className="flex gap-3">
              <input
                className={inputCls + " flex-1"}
                placeholder='Enter topic or title, e.g. "How to clean leather sandals at home"'
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
              />
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiTopic.trim()}
                className="rounded bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {aiLoading ? "Generating…" : "Generate"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              AI will fill in the title, slug, description, and all body sections. You can edit everything after.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded bg-emerald-900/40 border border-emerald-700 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic fields */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300">Post Details</h2>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Title *</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => {
                    setField("title", e.target.value);
                    if (!editing) setField("slug", slugify(e.target.value));
                  }}
                  placeholder="Post title"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Slug *</label>
                <input
                  className={inputCls + " font-mono text-xs"}
                  value={form.slug}
                  onChange={(e) => setField("slug", slugify(e.target.value))}
                  placeholder="url-friendly-slug"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Description / Excerpt</label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={2}
                  value={form.description ?? ""}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Short summary shown in listings and meta description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Category</label>
                  <select
                    className={inputCls}
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Reading Time (min)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.reading_time ?? 5}
                    min={1}
                    max={60}
                    onChange={(e) => setField("reading_time", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-teal-500"
                    checked={form.is_published ?? false}
                    onChange={(e) => setField("is_published", e.target.checked)}
                  />
                  Published
                </label>
              </div>
            </div>

            {/* Cover image */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300">Cover Image</h2>

              <div className="flex gap-3">
                <input
                  className={inputCls + " flex-1"}
                  value={form.cover_image ?? ""}
                  onChange={(e) => setField("cover_image", e.target.value)}
                  placeholder="https://... (paste URL or upload below)"
                />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingImage}
                  className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-teal-500 hover:text-teal-400 disabled:opacity-50"
                >
                  {uploadingImage ? "Uploading…" : "Upload"}
                </button>
              </div>

              {form.cover_image && (
                <img
                  src={form.cover_image}
                  alt="Cover preview"
                  className="h-40 w-full rounded object-cover"
                />
              )}

              <div>
                <label className="mb-1 block text-xs text-slate-400">Alt Text</label>
                <input
                  className={inputCls}
                  value={form.cover_alt ?? ""}
                  onChange={(e) => setField("cover_alt", e.target.value)}
                  placeholder="Describe the image for accessibility and SEO"
                />
              </div>
            </div>

            {/* Body sections */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">
                  Body ({sections.length} section{sections.length !== 1 ? "s" : ""})
                </h2>
              </div>

              <div className="space-y-3">
                {sections.map((s, i) => (
                  <SectionEditor
                    key={i}
                    section={s}
                    index={i}
                    onChange={(updated) => updateSection(i, updated)}
                    onRemove={() => removeSection(i)}
                    onMoveUp={() => moveSection(i, -1)}
                    onMoveDown={() => moveSection(i, 1)}
                  />
                ))}
              </div>

              {/* Add section buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {(["p", "h2", "h3", "ul", "ol", "callout", "table"] as SectionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addSection(t)}
                    className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-teal-600 hover:text-teal-400 transition"
                  >
                    + {t === "p" ? "Paragraph" : t === "h2" ? "Heading 2" : t === "h3" ? "Heading 3" : t === "ul" ? "Bullet List" : t === "ol" ? "Numbered List" : t === "callout" ? "Callout" : "Table"}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Post"}
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded border border-slate-700 px-6 py-2.5 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Blog Posts</h1>
            <p className="mt-1 text-sm text-slate-400">
              {posts.length} post{posts.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
          >
            + New Post
          </button>
        </div>

        {isLoading ? (
          <p className="py-20 text-center text-slate-500">Loading…</p>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-24 text-center">
            <p className="text-slate-400">No blog posts yet.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 rounded bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500"
            >
              Create your first post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                {post.cover_image && (
                  <img
                    src={post.cover_image}
                    alt={post.cover_alt ?? post.title}
                    className="h-16 w-24 shrink-0 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-white">{post.title}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        post.is_published
                          ? "bg-emerald-900 text-emerald-300"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {post.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-mono">/journal/{post.slug}</p>
                  {post.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-400">{post.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500 uppercase tracking-wide">
                    <span>{post.category}</span>
                    <span>·</span>
                    <span>{post.reading_time} min read</span>
                    <span>·</span>
                    <span>{post.body?.length ?? 0} sections</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(post)}
                    className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-teal-500 hover:text-teal-400 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500 hover:text-red-400 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
