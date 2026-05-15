"use client";

import { useMemo } from 'react';
import type { FaqRecord } from '@/lib/slices/apiSlice';

type Props = {
  pageTitle?: string | null;
  mode: 'create' | 'edit';
  draft: Partial<FaqRecord>;
  onChange: <K extends keyof FaqRecord>(key: K, value: FaqRecord[K]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving?: boolean;
};

export default function FaqForm({ pageTitle, mode, draft, onChange, onSubmit, onCancel, isSaving }: Props) {
  const payload = useMemo(() => draft, [draft]);

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">FAQ</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{mode === 'create' ? 'Create FAQ' : 'Edit FAQ'}</h2>
          <p className="mt-1 text-sm text-slate-500">{pageTitle ? `For ${pageTitle}` : 'Select a page'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">Question</span>
          <input value={draft.question ?? ''} onChange={(e) => onChange('question' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">Short answer</span>
          <input value={draft.short_answer ?? ''} onChange={(e) => onChange('short_answer' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">Answer</span>
          <textarea value={draft.answer ?? ''} onChange={(e) => onChange('answer' as any, e.target.value as any)} rows={6} className="w-full rounded-xl border px-3 py-2" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Answer type</span>
            <select value={draft.answer_type ?? ''} onChange={(e) => onChange('answer_type' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2">
              <option value="">(select)</option>
              <option value="TEXT">TEXT</option>
              <option value="SHORT">SHORT</option>
              <option value="LIST">LIST</option>
              <option value="STEPS">STEPS</option>
              <option value="COMPARISON">COMPARISON</option>
              <option value="TABLE">TABLE</option>
              <option value="DEFINITION">DEFINITION</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Intent type</span>
            <select value={draft.intent_type ?? ''} onChange={(e) => onChange('intent_type' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2">
              <option value="">(select)</option>
              <option value="DEFINITION">DEFINITION</option>
              <option value="PRICING">PRICING</option>
              <option value="HOW_TO">HOW_TO</option>
              <option value="COMPARISON">COMPARISON</option>
              <option value="SHIPPING">SHIPPING</option>
              <option value="CARE">CARE</option>
              <option value="RETURN_POLICY">RETURN_POLICY</option>
              <option value="AVAILABILITY">AVAILABILITY</option>
              <option value="TROUBLESHOOTING">TROUBLESHOOTING</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">SEO title</span>
            <input value={draft.seo_title ?? ''} onChange={(e) => onChange('seo_title' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">SEO description</span>
            <input value={draft.seo_description ?? ''} onChange={(e) => onChange('seo_description' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Slug</span>
            <input value={draft.slug ?? ''} onChange={(e) => onChange('slug' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2" />
          </label>
          <label className="space-y-1 flex flex-col">
            <span className="text-xs font-semibold text-slate-500">Schema enabled</span>
            <input type="checkbox" checked={Boolean(draft.schema_enabled)} onChange={(e) => onChange('schema_enabled' as any, e.target.checked as any)} />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">Entity tags (comma separated)</span>
          <input value={(draft.entity_tags ?? []).join(', ')} onChange={(e) => onChange('entity_tags' as any, e.target.value.split(',').map(s => s.trim()).filter(Boolean) as any)} className="w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">Source URL</span>
          <input value={draft.source_url ?? ''} onChange={(e) => onChange('source_url' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">Context</span>
          <textarea value={draft.context ?? ''} onChange={(e) => onChange('context' as any, e.target.value as any)} rows={3} className="w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">AI summary</span>
          <textarea value={draft.ai_summary ?? ''} onChange={(e) => onChange('ai_summary' as any, e.target.value as any)} rows={3} className="w-full rounded-xl border px-3 py-2" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Fact check status</span>
            <select value={draft.fact_check_status ?? ''} onChange={(e) => onChange('fact_check_status' as any, e.target.value as any)} className="w-full rounded-xl border px-3 py-2">
              <option value="">(unset)</option>
              <option value="PENDING">PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Last verified at</span>
            <input type="datetime-local" value={draft.last_verified_at ? draft.last_verified_at.replace('Z', '') : ''} onChange={(e) => onChange('last_verified_at' as any, e.target.value ? new Date(e.target.value).toISOString() : '' as any)} className="w-full rounded-xl border px-3 py-2" />
          </label>
        </div>

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onSubmit} disabled={isSaving} className="rounded-full bg-slate-950 px-4 py-2 text-white">{isSaving ? 'Saving...' : mode === 'create' ? 'Create FAQ' : 'Save FAQ'}</button>
          <button type="button" onClick={onCancel} className="rounded-full border px-4 py-2">Cancel</button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500">Payload preview</p>
          <pre className="mt-2 rounded-lg bg-slate-100 p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
    </section>
  );
}
