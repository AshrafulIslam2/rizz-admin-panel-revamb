"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateCosting } from "@/lib/costing-api";

/**
 * "Copy this costing onto a new product."
 *
 * A new design is usually a small edit of one already costed — same leather,
 * same sole, a different upper. Copying means changing the three rows that
 * differ instead of retyping forty.
 *
 * The copy is NOT linked to the original's catalog product: it is a different
 * product, and inheriting the link would quietly attach two costings to one
 * catalog item. The new record opens straight into edit mode.
 */
export default function DuplicateCostingDialog({
  costingId,
  sourceName,
  sourceCode,
  onClose,
}: {
  costingId: string;
  sourceName: string;
  sourceCode?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(`${sourceName} (Copy)`);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Land in the name box with the text selected — renaming is the whole job.
  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Give the new product a name."); return; }
    setSaving(true); setError(null);
    try {
      const created = await duplicateCosting(costingId, {
        product_name: trimmed,
        product_code: code.trim() || null,
      });
      router.push(`/wholesale/production/${created.id}/edit`);
    } catch (e: any) {
      setError(e?.message ?? "Could not copy this costing.");
      setSaving(false);
    }
  }

  const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400";
  const lbl = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900">Copy this costing</h2>
        <p className="mt-1 text-xs text-slate-500">
          Every material, calculator row, capacity and profit percentage is copied from{" "}
          <b className="text-slate-700">{sourceName}</b>. Change what differs afterwards.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className={lbl} htmlFor="dup-name">New product name *</label>
            <input
              id="dup-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              className={input}
            />
          </div>
          <div>
            <label className={lbl} htmlFor="dup-code">Product / style code</label>
            <input
              id="dup-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder={sourceCode ? `Original: ${sourceCode}` : "optional"}
              className={input}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Left blank on purpose — two products should not share a style code.
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          The copy is not linked to a catalog product yet, and is priced against today&apos;s factory settings —
          not the ones the original was saved with.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim()}
            className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? "Copying…" : "Create copy"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
