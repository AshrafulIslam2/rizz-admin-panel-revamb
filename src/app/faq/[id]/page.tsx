"use client";

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  useCreatePageFaqMutation,
  useDeletePageFaqMutation,
  useGetPageFaqsQuery,
  usePatchPageFaqMutation,
  type FaqRecord,
} from '@/lib/slices/apiSlice';
import FaqForm from '@/components/FaqForm';

const INITIAL_DRAFT: Partial<FaqRecord> = {
  question: '',
  answer: '',
  short_answer: '',
  answer_type: 'TEXT',
  intent_type: '',
  seo_title: '',
  seo_description: '',
  slug: '',
  schema_enabled: true,
  ai_summary: '',
  entity_tags: [],
  source_url: '',
  fact_check_status: 'PENDING',
  last_verified_at: '',
  context: '',
};

export default function FaqByPageId() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const pageId = typeof params?.id === 'string' ? params.id : '';

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedFaq, setSelectedFaq] = useState<FaqRecord | null>(null);
  const [draft, setDraft] = useState<Partial<FaqRecord>>(INITIAL_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useGetPageFaqsQuery(pageId ? pageId : skipToken);
  const [createPageFaq, { isLoading: isCreating }] = useCreatePageFaqMutation();
  const [patchPageFaq, { isLoading: isPatching }] = usePatchPageFaqMutation();
  const [deletePageFaq] = useDeletePageFaqMutation();

  const faqs = data?.faqs ?? [];

  const pageLabel = useMemo(() => (pageId ? `Page ID ${pageId}` : 'Selected page'), [pageId]);

  function openCreate() {
    setSelectedFaq(null);
    setDraft(INITIAL_DRAFT);
    setFormMode('create');
    setShowForm(true);
    setMessage(null);
  }

  function openEdit(faq: FaqRecord) {
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
    setDraft((current) => ({ ...(current as FaqRecord), [key]: value }));
  }

  async function handleSubmit() {
    if (!pageId) return;

    try {
      if (formMode === 'create') {
        await createPageFaq({ pageId, data: draft as Partial<FaqRecord> }).unwrap();
        setMessage('FAQ created');
      } else if (selectedFaq) {
        await patchPageFaq({ pageId, faqId: selectedFaq.id, data: draft as Partial<FaqRecord> }).unwrap();
        setMessage('FAQ updated');
      }
      closeForm();
    } catch (submitError: any) {
      setMessage(submitError?.message ?? 'Unable to save FAQ');
    }
  }

  async function handleDelete(faq: FaqRecord) {
    if (!pageId) return;

    try {
      await deletePageFaq({ pageId, faqId: faq.id }).unwrap();
      setMessage('FAQ deleted');
      if (selectedFaq?.id === faq.id) closeForm();
    } catch (deleteError: any) {
      setMessage(deleteError?.message ?? 'Unable to delete FAQ');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[32px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">FAQ</p>
              <h1 className="text-3xl font-semibold tracking-tight">{pageLabel}</h1>
              <p className="mt-2 text-sm text-slate-300">All FAQs connected to this page appear here.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/faq')}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Back to FAQ list
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
              >
                Create FAQ
              </button>
            </div>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Page FAQs</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">FAQs for {pageLabel}</h2>
                <p className="mt-1 text-sm text-slate-500">Use create, edit, or delete on this page only.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading FAQs...</div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Unable to load FAQs for this page.</div>
              ) : faqs.length > 0 ? (
                faqs.map((faq) => (
                  <article key={faq.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-200 hover:bg-teal-50/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">{faq.answer_type ?? 'FAQ'}</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">{faq.question}</h3>
                        <p className="mt-1 text-sm text-slate-600">{faq.short_answer || faq.answer}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          {faq.intent_type ? <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{faq.intent_type}</span> : null}
                          {faq.fact_check_status ? <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{faq.fact_check_status}</span> : null}
                          {faq.slug ? <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">/{faq.slug}</span> : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(faq)}
                          className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(faq)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
                  <p className="text-sm font-medium text-slate-900">No FAQ found for this page.</p>
                  <p className="mt-1 text-sm text-slate-500">Create the first FAQ for this page now.</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Create FAQ
                  </button>
                </div>
              )}
            </div>
          </section>

          <div>
            {showForm ? (
              <FaqForm
                pageTitle={pageLabel}
                mode={formMode}
                draft={draft}
                onChange={updateDraft}
                onSubmit={handleSubmit}
                onCancel={closeForm}
                isSaving={isCreating || isPatching}
              />
            ) : (
              <section className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">FAQ editor</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Create or edit a FAQ</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Use the buttons beside each FAQ or create a new one for this page.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
