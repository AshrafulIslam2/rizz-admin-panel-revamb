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

const INITIAL_DRAFT: Partial<FaqRecord> = {
  question: '',
  answer: '',
  short_answer: '',
  slug: '',
  schema_enabled: true,
};

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

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
  const isSaving = isCreating || isPatching;

  function openCreate() {
    setSelectedFaq(null); setDraft(INITIAL_DRAFT); setFormMode('create'); setShowForm(true); setMessage(null);
  }
  function openEdit(faq: FaqRecord) {
    setSelectedFaq(faq); setDraft({ ...faq }); setFormMode('edit'); setShowForm(true); setMessage(null);
  }
  function closeForm() {
    setShowForm(false); setSelectedFaq(null); setDraft(INITIAL_DRAFT); setFormMode('create');
  }
  function updateDraft<K extends keyof FaqRecord>(key: K, value: FaqRecord[K]) {
    setDraft((cur) => ({ ...(cur as FaqRecord), [key]: value }));
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
    } catch (e: any) {
      setMessage(e?.message ?? 'Unable to save FAQ');
    }
  }

  async function handleDelete(faq: FaqRecord) {
    if (!pageId) return;
    try {
      await deletePageFaq({ pageId, faqId: faq.id }).unwrap();
      setMessage('FAQ deleted');
      if (selectedFaq?.id === faq.id) closeForm();
    } catch (e: any) {
      setMessage(e?.message ?? 'Unable to delete FAQ');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">FAQ</p>
              <h1 className="mt-1 text-2xl font-semibold">{pageLabel}</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push('/faq')} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                ← Back to FAQ list
              </button>
              <button onClick={openCreate} className="rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-300">
                + Create FAQ
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          {/* FAQ list */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900 mb-4">FAQs for {pageLabel}</h2>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Unable to load FAQs.</div>
            ) : faqs.length > 0 ? (
              <div className="space-y-2">
                {faqs.map((faq) => (
                  <div key={faq.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{faq.question}</p>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{faq.short_answer || faq.answer}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEdit(faq)} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100">Edit</button>
                        <button onClick={() => handleDelete(faq)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-500">No FAQs yet. Create the first one.</p>
                <button onClick={openCreate} className="mt-3 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Create FAQ
                </button>
              </div>
            )}
          </section>

          {/* Form panel */}
          <div>
            {showForm ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">{formMode === 'create' ? 'New FAQ' : 'Edit FAQ'}</h2>
                  <button onClick={closeForm} className="text-sm text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <div>
                  <p className={lbl}>Question *</p>
                  <input value={draft.question ?? ''} onChange={(e) => updateDraft('question', e.target.value)} placeholder="How do I return an item?" className={field} />
                </div>
                <div>
                  <p className={lbl}>Full Answer *</p>
                  <textarea value={draft.answer ?? ''} onChange={(e) => updateDraft('answer', e.target.value)} rows={4} placeholder="Detailed answer..." className={field + " resize-none"} />
                </div>
                <div>
                  <p className={lbl}>Short Answer</p>
                  <input value={draft.short_answer ?? ''} onChange={(e) => updateDraft('short_answer', e.target.value)} placeholder="1–2 sentence summary" className={field} />
                </div>
                <div>
                  <p className={lbl}>Slug (optional)</p>
                  <input value={draft.slug ?? ''} onChange={(e) => updateDraft('slug', e.target.value)} placeholder="how-to-return" className={field} />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={draft.schema_enabled ?? true} onChange={(e) => updateDraft('schema_enabled', e.target.checked)} className="h-4 w-4" />
                  Include in FAQPage JSON-LD schema
                </label>
                <div className="flex gap-3 pt-2 border-t border-slate-200">
                  <button onClick={handleSubmit} disabled={isSaving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                    {isSaving ? 'Saving…' : formMode === 'create' ? 'Create FAQ' : 'Save Changes'}
                  </button>
                  <button onClick={closeForm} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50">Cancel</button>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-2">FAQ Editor</p>
                <h3 className="text-xl font-semibold text-slate-950">Create or edit a FAQ</h3>
                <p className="mt-2 text-sm text-slate-500">Click Edit on any FAQ or create a new one for this page.</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
