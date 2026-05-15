"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  useGetPagesQuery,
  useGetPageFaqsQuery,
  useCreatePageFaqMutation,
  usePatchPageFaqMutation,
  useDeletePageFaqMutation,
  type FaqRecord,
} from '@/lib/slices/apiSlice';
import FaqForm from '@/components/FaqForm';

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
  return pages.flatMap((page) => [ { ...page, depth }, ...flattenPages(page.children ?? [], depth + 1) ]);
}

const INITIAL_DRAFT: Partial<FaqRecord> = {
  question: '',
  answer: '',
  short_answer: '',
  answer_type: 'text',
  intent_type: '',
  seo_title: '',
  seo_description: '',
  slug: '',
  schema_enabled: true,
  ai_summary: '',
  entity_tags: [],
  source_url: '',
  fact_check_status: '',
  last_verified_at: '',
  context: '',
};

export default function FaqPage() {
  const router = useRouter();
  const { data: pagesData, isLoading: pagesLoading } = useGetPagesQuery();
  const [selectedPage, setSelectedPage] = useState<PageRecord | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<FaqRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [draft, setDraft] = useState<Partial<FaqRecord>>(INITIAL_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const pages = useMemo(() => sortPages(pagesData ?? []), [pagesData]);
  const flatPages = useMemo(() => flattenPages(pages), [pages]);

  const { data: faqsData } = useGetPageFaqsQuery(selectedPage?.id ?? skipToken);
  const [createPageFaq, { isLoading: isCreating }] = useCreatePageFaqMutation();
  const [patchPageFaq, { isLoading: isPatching }] = usePatchPageFaqMutation();
  const [deletePageFaq] = useDeletePageFaqMutation();

  function selectPage(page: PageRecord) {
    setSelectedPage(page);
    setSelectedFaq(null);
    setShowForm(false);
    setFormMode('create');
    setDraft(INITIAL_DRAFT);
    setMessage(null);
  }

  function openCreate(page: PageRecord) {
    setSelectedPage(page);
    setSelectedFaq(null);
    setDraft(INITIAL_DRAFT);
    setFormMode('create');
    setShowForm(true);
    setMessage(null);
  }

  function openEdit(page: PageRecord, faq: FaqRecord) {
    setSelectedPage(page);
    setSelectedFaq(faq);
    setDraft({ ...faq });
    setFormMode('edit');
    setShowForm(true);
    setMessage(null);
  }

  function closeForm() {
    setShowForm(false);
    setSelectedFaq(null);
    setDraft(INITIAL_DRAFT);
    setFormMode('create');
  }

  function updateDraft<K extends keyof FaqRecord>(key: K, value: FaqRecord[K]) {
    setDraft((cur) => ({ ...(cur as any), [key]: value }));
  }

  async function handleSubmit() {
    if (!selectedPage) return;
    try {
      if (formMode === 'create') {
        await createPageFaq({ pageId: selectedPage.id, data: draft as any }).unwrap();
        setMessage('FAQ created');
      } else if (selectedFaq) {
        await patchPageFaq({ pageId: selectedPage.id, faqId: selectedFaq.id, data: draft as any }).unwrap();
        setMessage('FAQ updated');
      }
      closeForm();
    } catch (err: any) {
      setMessage(err?.message ?? 'Unable to save FAQ');
    }
  }

  async function handleDelete(page: PageRecord, faq: FaqRecord) {
    try {
      await deletePageFaq({ pageId: page.id, faqId: faq.id }).unwrap();
      setMessage('FAQ deleted');
      if (selectedFaq?.id === faq.id) closeForm();
    } catch (err: any) {
      setMessage(err?.message ?? 'Unable to delete FAQ');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[32px] border border-white/70 bg-slate-950 text-white p-6 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">FAQ</p>
            <h1 className="text-3xl font-semibold">FAQ list for pages</h1>
            <p className="mt-2 text-sm text-slate-300">Manage FAQs per page. Create, edit, patch, or delete entries.</p>
          </div>
        </header>

        {message ? <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 mb-4 text-teal-900">{message}</div> : null}

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
          <section className="rounded-[28px] border bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">All pages</h2>
              <p className="text-sm text-slate-500">Click a page to manage its FAQs.</p>
            </div>

            <div className="space-y-3">
              {pagesLoading ? (
                <div>Loading pages...</div>
              ) : (
                flatPages.map((page) => (
                  <div
                    key={page.id}
                    style={{ marginLeft: page.depth * 16 }}
                    className={`rounded-xl border p-3 bg-slate-50 transition ${selectedPage?.id === page.id ? 'border-teal-300 ring-1 ring-teal-200' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{page.title}</div>
                        <div className="text-sm text-slate-500">/{page.slug} — ID {page.id}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => selectPage(page)} className="rounded-full border px-3 py-1 text-sm">View FAQs</button>
                        <button onClick={() => openCreate(page)} className="rounded-full border px-3 py-1 text-sm">Add FAQ</button>
                        <button onClick={() => router.push(`/faq/${page.id}`)} className="rounded-full border px-3 py-1 text-sm">View page</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div>
            <section className="rounded-[28px] border bg-white p-5 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Selected page</h3>
                  <p className="text-sm text-slate-500">
                    {selectedPage ? `${selectedPage.title} / ${selectedPage.slug}` : 'Select a page to view its FAQs.'}
                  </p>
                </div>
                {selectedPage ? (
                  <button
                    onClick={() => setShowForm(true)}
                    className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900"
                  >
                    Create FAQ
                  </button>
                ) : null}
              </div>
            </section>

            {showForm ? (
              <FaqForm
                pageTitle={selectedPage?.title ?? null}
                mode={formMode}
                draft={draft}
                onChange={updateDraft}
                onSubmit={handleSubmit}
                onCancel={closeForm}
                isSaving={isCreating || isPatching}
              />
            ) : (
              <section className="rounded-[28px] border bg-white p-6">
                <h3 className="text-lg font-semibold">FAQ editor</h3>
                <p className="text-sm text-slate-500">Open the form by clicking Add FAQ on a page.</p>
              </section>
            )}

            <section className="mt-4 rounded-[28px] border bg-white p-4">
              <h4 className="font-semibold">Page FAQs</h4>
              <div className="mt-3 space-y-2">
                {selectedPage ? (
                  (faqsData?.faqs ?? []).length > 0 ? (
                    (faqsData?.faqs ?? []).map((faq) => (
                      <div key={faq.id} className="rounded-md border p-3 bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{faq.question}</div>
                            <div className="text-sm text-slate-600">{faq.short_answer}</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(selectedPage as PageRecord, faq)} className="rounded-full border px-3 py-1 text-sm">Edit</button>
                            <button onClick={() => handleDelete(selectedPage as PageRecord, faq)} className="rounded-full border px-3 py-1 text-sm text-rose-600">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-sm text-slate-500">
                      <p>No FAQ found for this page.</p>
                      <button
                        type="button"
                        onClick={() => openCreate(selectedPage)}
                        className="mt-3 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900"
                      >
                        Create FAQ
                      </button>
                    </div>
                  )
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-sm text-slate-500">Select a page to load its FAQs.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
