"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useGetPagesQuery,
  useGetPageFaqsQuery,
  useCreatePageFaqMutation,
  usePatchPageFaqMutation,
  useDeletePageFaqMutation,
  type FaqRecord,
} from "@/lib/slices/apiSlice";

type PageId = number | string;
type PageRecord = {
  id: PageId;
  title: string;
  slug: string;
  parentId: PageId | null;
  isVisible: boolean;
  order: number;
  children?: PageRecord[];
};

function sortPages(pages: PageRecord[]): PageRecord[] {
  return [...pages]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map((p) => ({ ...p, children: p.children ? sortPages(p.children) : [] }));
}

function flattenPages(pages: PageRecord[], depth = 0): Array<PageRecord & { depth: number }> {
  return pages.flatMap((page) => [{ ...page, depth }, ...flattenPages(page.children ?? [], depth + 1)]);
}

const EMPTY_DRAFT: Partial<FaqRecord> = {
  question: "",
  answer: "",
  short_answer: "",
  slug: "",
  schema_enabled: true,
};

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

export default function FaqPage() {
  const { data: pagesData, isLoading: pagesLoading } = useGetPagesQuery();
  const [selectedPage, setSelectedPage] = useState<PageRecord | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<FaqRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<Partial<FaqRecord>>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const pages = useMemo(() => sortPages(pagesData ?? []), [pagesData]);
  const flatPages = useMemo(() => flattenPages(pages), [pages]);

  const { data: faqsData } = useGetPageFaqsQuery(selectedPage?.id ?? skipToken);
  const [createPageFaq, { isLoading: isCreating }] = useCreatePageFaqMutation();
  const [patchPageFaq, { isLoading: isPatching }] = usePatchPageFaqMutation();
  const [deletePageFaq] = useDeletePageFaqMutation();

  const isSaving = isCreating || isPatching;

  function openCreate(page: PageRecord) {
    setSelectedPage(page);
    setSelectedFaq(null);
    setDraft(EMPTY_DRAFT);
    setFormMode("create");
    setShowForm(true);
    setMessage(null);
  }

  function openEdit(page: PageRecord, faq: FaqRecord) {
    setSelectedPage(page);
    setSelectedFaq(faq);
    setDraft({ ...faq });
    setFormMode("edit");
    setShowForm(true);
    setMessage(null);
  }

  function closeForm() {
    setShowForm(false);
    setSelectedFaq(null);
    setDraft(EMPTY_DRAFT);
  }

  function updateDraft<K extends keyof FaqRecord>(key: K, value: FaqRecord[K]) {
    setDraft((cur) => ({ ...(cur as any), [key]: value }));
  }

  async function handleSubmit() {
    if (!selectedPage) return;
    setMessage(null);
    try {
      if (formMode === "create") {
        await createPageFaq({ pageId: selectedPage.id, data: draft as any }).unwrap();
        setMessage("FAQ created.");
      } else if (selectedFaq) {
        await patchPageFaq({ pageId: selectedPage.id, faqId: selectedFaq.id, data: draft as any }).unwrap();
        setMessage("FAQ updated.");
      }
      closeForm();
    } catch {
      setMessage("Unable to save FAQ. Check API connection.");
    }
  }

  async function handleDelete(page: PageRecord, faq: FaqRecord) {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await deletePageFaq({ pageId: page.id, faqId: faq.id }).unwrap();
      setMessage("FAQ deleted.");
      if (selectedFaq?.id === faq.id) closeForm();
    } catch {
      setMessage("Unable to delete.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Content</p>
          <h1 className="mt-1 text-2xl font-semibold">FAQ Manager</h1>
          <p className="mt-1 text-sm text-slate-400">Manage FAQ entries per page. Select a page, then add or edit its FAQs.</p>
        </header>

        {message && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          {/* Pages list */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Pages</h2>
            {pagesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : flatPages.length === 0 ? (
              <p className="text-sm text-slate-400">No pages found. Connect the Pages API.</p>
            ) : (
              <div className="space-y-2">
                {flatPages.map((page) => (
                  <div
                    key={page.id}
                    style={{ marginLeft: page.depth * 16 }}
                    className={`rounded-xl border p-3 transition ${
                      selectedPage?.id === page.id
                        ? "border-teal-300 bg-teal-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{page.title}</p>
                        <p className="text-xs text-slate-500">/{page.slug}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { setSelectedPage(page); setShowForm(false); }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium hover:bg-slate-50"
                        >
                          View FAQs
                        </button>
                        <button
                          onClick={() => openCreate(page)}
                          className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                        >
                          + Add FAQ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Right panel */}
          <div className="space-y-4">
            {/* FAQ Form */}
            {showForm && selectedPage ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">
                    {formMode === "create" ? "New FAQ" : "Edit FAQ"} — {selectedPage.title}
                  </h2>
                  <button onClick={closeForm} className="text-sm text-slate-400 hover:text-slate-700">✕ Cancel</button>
                </div>

                <div>
                  <p className={lbl}>Question *</p>
                  <input
                    value={draft.question ?? ""}
                    onChange={(e) => updateDraft("question", e.target.value)}
                    placeholder="What is your return policy?"
                    className={field}
                  />
                </div>
                <div>
                  <p className={lbl}>Full Answer *</p>
                  <textarea
                    value={draft.answer ?? ""}
                    onChange={(e) => updateDraft("answer", e.target.value)}
                    rows={4}
                    placeholder="Detailed answer shown on the FAQ page..."
                    className={field + " resize-none"}
                  />
                </div>
                <div>
                  <p className={lbl}>Short Answer (for schema/AEO)</p>
                  <input
                    value={draft.short_answer ?? ""}
                    onChange={(e) => updateDraft("short_answer", e.target.value)}
                    placeholder="1-2 sentence summary"
                    className={field}
                  />
                </div>
                <div>
                  <p className={lbl}>Slug (optional)</p>
                  <input
                    value={draft.slug ?? ""}
                    onChange={(e) => updateDraft("slug", e.target.value)}
                    placeholder="what-is-return-policy"
                    className={field}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.schema_enabled ?? true}
                    onChange={(e) => updateDraft("schema_enabled", e.target.checked)}
                    className="h-4 w-4"
                  />
                  Include in FAQPage schema (JSON-LD)
                </label>

                <div className="flex gap-3 pt-2 border-t border-slate-200">
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : formMode === "create" ? "Create FAQ" : "Save Changes"}
                  </button>
                  <button onClick={closeForm} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </section>
            ) : null}

            {/* FAQs list for selected page */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">
                  {selectedPage ? `${selectedPage.title} FAQs` : "Select a page"}
                </h2>
                {selectedPage && !showForm && (
                  <button
                    onClick={() => openCreate(selectedPage)}
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                  >
                    + Add FAQ
                  </button>
                )}
              </div>

              {!selectedPage ? (
                <p className="text-sm text-slate-400">Click "View FAQs" on any page to load its FAQ list.</p>
              ) : (faqsData?.faqs ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  No FAQs for this page yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {(faqsData?.faqs ?? []).map((faq) => (
                    <div key={faq.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{faq.question}</p>
                          {faq.short_answer && (
                            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{faq.short_answer}</p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => openEdit(selectedPage as PageRecord, faq)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(selectedPage as PageRecord, faq)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
