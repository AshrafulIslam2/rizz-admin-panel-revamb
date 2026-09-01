"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CostBasis, CostField, CostSection,
  archiveCostField, createCostField, listCostFields, reorderCostFields, updateCostField,
} from "@/lib/costing-api";

const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400";

const SECTIONS: { id: CostSection; title: string; note: string }[] = [
  { id: "UPPER", title: "Upper", note: "Upper materials — Tab 2 of the costing form" },
  { id: "SOLE", title: "Sole", note: "Sole materials — Tab 3" },
  { id: "FACTORY", title: "Factory & Labour", note: "Labour and factory overhead — Tab 4" },
  { id: "RETAIL_COMMON", title: "Retail Common (monthly)", note: "Shop-wide monthly bills, set on the Retail Cost Settings page" },
  { id: "RETAIL_PRODUCT", title: "Retail Product-Specific", note: "Per-pair extras like a box or bag — Tab 6" },
];

const BASIS_LABEL: Record<CostBasis, string> = {
  PER_DOZEN: "Per dozen",
  PER_PAIR: "Per pair",
  PER_MONTH: "Per month (divided by output)",
};

/**
 * Manager for the dynamic costing fields.
 *
 * Fields are archived rather than deleted: saved costing records store amounts
 * against a field's key, so removing the row outright would quietly change
 * historic totals.
 */
export default function CostFieldsPage() {
  const [fields, setFields] = useState<CostField[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [draft, setDraft] = useState<{ label: string; section: CostSection; basis: CostBasis }>({
    label: "", section: "UPPER", basis: "PER_DOZEN",
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setFields(await listCostFields(true)); }
    catch (e: any) { setError(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const m: Record<string, CostField[]> = {};
    for (const f of fields) {
      if (!showArchived && f.is_archived) continue;
      (m[f.section] ||= []).push(f);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [fields, showArchived]);

  async function add() {
    if (!draft.label.trim()) return;
    setBusy("add"); setError(null);
    try {
      const created = await createCostField(draft);
      setFields((f) => [...f, created]);
      setDraft((d) => ({ ...d, label: "" }));
    } catch (e: any) { setError(e?.message ?? "Failed to add"); }
    finally { setBusy(null); }
  }

  async function patch(f: CostField, dto: Partial<CostField>) {
    setBusy(f.id); setError(null);
    try {
      const updated = await updateCostField(f.id, dto);
      setFields((list) => list.map((x) => (x.id === f.id ? updated : x)));
    } catch (e: any) { setError(e?.message ?? "Failed to update"); }
    finally { setBusy(null); }
  }

  async function archive(f: CostField) {
    if (!window.confirm(`Archive "${f.label}"?\n\nIt disappears from the costing form, but amounts already saved against it are kept so past totals do not change.`)) return;
    setBusy(f.id);
    try {
      const updated = await archiveCostField(f.id);
      setFields((list) => list.map((x) => (x.id === f.id ? updated : x)));
    } catch (e: any) { setError(e?.message ?? "Failed to archive"); }
    finally { setBusy(null); }
  }

  async function move(section: CostSection, index: number, dir: -1 | 1) {
    const list = [...(grouped[section] ?? [])];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    setFields((all) => all.map((f) => {
      const i = list.findIndex((x) => x.id === f.id);
      return i === -1 ? f : { ...f, sort_order: i };
    }));
    try { await reorderCostFields(list.map((f) => f.id)); }
    catch (e: any) { setError(e?.message ?? "Failed to reorder"); load(); }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[32px] bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Wholesale · Settings</p>
          <h1 className="mt-2 text-2xl font-semibold">Cost Fields</h1>
          <p className="mt-1 text-sm text-slate-400">
            Add, rename, reorder, disable or archive any costing field. The costing form is built from this list.
          </p>
        </header>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        {/* Add */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Add a field</h2>
          <div className="grid gap-3 sm:grid-cols-[2fr_1.4fr_1.4fr_auto]">
            <input value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              placeholder="Field name, e.g. Buckle" className={input} />
            <select value={draft.section} onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value as CostSection }))} className={input}>
              {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <select value={draft.basis} onChange={(e) => setDraft((d) => ({ ...d, basis: e.target.value as CostBasis }))} className={input}>
              {(Object.keys(BASIS_LABEL) as CostBasis[]).map((b) => <option key={b} value={b}>{BASIS_LABEL[b]}</option>)}
            </select>
            <button onClick={add} disabled={!draft.label.trim() || busy === "add"}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40">
              {busy === "add" ? "Adding…" : "Add"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            &ldquo;Per month&rdquo; amounts are divided by monthly output — use it for rent and utility bills, not materials.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4" />
          Show archived fields
        </label>

        {loading ? (
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
        ) : SECTIONS.map((s) => (
          <div key={s.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">{s.title}</h2>
              <p className="text-[11px] text-slate-400">{s.note}</p>
            </div>
            <div className="space-y-2">
              {(grouped[s.id] ?? []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">No fields here yet.</p>
              ) : (grouped[s.id] ?? []).map((f, i) => (
                <div key={f.id} className={`flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 ${f.is_archived ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-col">
                    <button onClick={() => move(s.id, i, -1)} disabled={i === 0} className="px-1 text-[10px] leading-none text-slate-400 hover:text-slate-700 disabled:opacity-25">▲</button>
                    <button onClick={() => move(s.id, i, 1)} disabled={i === (grouped[s.id] ?? []).length - 1} className="px-1 text-[10px] leading-none text-slate-400 hover:text-slate-700 disabled:opacity-25">▼</button>
                  </div>
                  <input defaultValue={f.label} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== f.label) patch(f, { label: v }); }}
                    className="min-w-40 flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-teal-400 focus:outline-none" />
                  <select value={f.basis} onChange={(e) => patch(f, { basis: e.target.value as CostBasis })}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600">
                    {(Object.keys(BASIS_LABEL) as CostBasis[]).map((b) => <option key={b} value={b}>{BASIS_LABEL[b]}</option>)}
                  </select>
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{f.key}</code>
                  {!f.is_archived && (
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <input type="checkbox" checked={f.is_active} onChange={(e) => patch(f, { is_active: e.target.checked })} className="h-3.5 w-3.5" />
                      Active
                    </label>
                  )}
                  {f.is_archived ? (
                    <button onClick={() => patch(f, { is_archived: false, is_active: true })} disabled={busy === f.id}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50">Restore</button>
                  ) : (
                    <button onClick={() => archive(f)} disabled={busy === f.id}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50">Archive</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="pb-6 text-center text-xs text-slate-500">
          A field&apos;s internal key never changes when you rename it, so saved costing data always stays attached.{" "}
          <Link href="/wholesale/production" className="font-semibold text-teal-700 hover:underline">Back to Production</Link>
        </p>
      </div>
    </div>
  );
}
