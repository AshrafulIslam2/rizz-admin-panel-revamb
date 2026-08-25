"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type OptionsPayload = {
  sizes: string[];
  colors: string[];
  usedSizes?: string[];
  usedColors?: string[];
};

type Kind = "sizes" | "colors";

const LABELS: Record<Kind, { title: string; singular: string; hint: string; placeholder: string }> = {
  sizes: {
    title: "Sizes",
    singular: "size",
    hint: "Shown in the Size dropdown when adding or editing a product variant.",
    placeholder: "e.g. 46",
  },
  colors: {
    title: "Colors",
    singular: "color",
    hint: "Shown in the Color dropdown when adding or editing a product variant.",
    placeholder: "e.g. Navy",
  },
};

// ── One editable list (sizes or colors) ───────────────────────────────────────
function OptionList({
  kind,
  values,
  used,
  onChange,
}: {
  kind: Kind;
  values: string[];
  used: string[];
  onChange: (next: string[]) => void;
}) {
  const [newValue, setNewValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [warn, setWarn] = useState<string | null>(null);

  const usedSet = useMemo(() => new Set(used.map((u) => u.toLowerCase())), [used]);
  const meta = LABELS[kind];

  function add() {
    const v = newValue.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setWarn(`"${v}" is already in the list.`);
      return;
    }
    setWarn(null);
    onChange([...values, v]);
    setNewValue("");
  }

  function commitEdit(i: number) {
    const v = editingText.trim();
    if (!v) { setEditingIndex(null); return; }
    if (values.some((x, xi) => xi !== i && x.toLowerCase() === v.toLowerCase())) {
      setWarn(`"${v}" is already in the list.`);
      return;
    }
    const next = [...values];
    next[i] = v;
    setWarn(null);
    onChange(next);
    setEditingIndex(null);
  }

  function remove(i: number) {
    const v = values[i];
    // Removing a value that products actually use would make those variants'
    // dropdowns fall back to a value that is no longer offered, so confirm.
    if (usedSet.has(v.toLowerCase())) {
      const ok = window.confirm(
        `"${v}" is used by existing product variants.\n\n` +
        `Removing it from this list does NOT change those products — they keep their ${meta.singular}. ` +
        `It just stops being offered for new variants.\n\nRemove it?`,
      );
      if (!ok) return;
    }
    setWarn(null);
    onChange(values.filter((_, xi) => xi !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Variant option</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{meta.title}</h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {values.length}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{meta.hint}</p>

      {/* Add box */}
      <div className="mt-5 flex gap-2">
        <input
          value={newValue}
          onChange={(e) => { setNewValue(e.target.value); setWarn(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={meta.placeholder}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newValue.trim()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {warn && <p className="mt-2 text-xs text-amber-700">{warn}</p>}

      {/* List */}
      <div className="mt-5 grid gap-2">
        {values.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No {meta.title.toLowerCase()} yet — add one above.
          </div>
        ) : values.map((v, i) => {
          const inUse = usedSet.has(v.toLowerCase());
          return (
            <div key={`${v}-${i}`} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="px-1 text-[10px] leading-none text-slate-400 hover:text-slate-700 disabled:opacity-25">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === values.length - 1}
                  className="px-1 text-[10px] leading-none text-slate-400 hover:text-slate-700 disabled:opacity-25">▼</button>
              </div>

              {editingIndex === i ? (
                <input
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={() => commitEdit(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitEdit(i); }
                    if (e.key === "Escape") setEditingIndex(null);
                  }}
                  className="flex-1 rounded-lg border border-teal-400 px-2 py-1 text-sm outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditingIndex(i); setEditingText(v); setWarn(null); }}
                  className="flex-1 text-left text-sm font-medium text-slate-800 hover:text-teal-700"
                  title="Click to rename"
                >
                  {v}
                </button>
              )}

              {inUse && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  in use
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function VariantSettingsPage() {
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [usedSizes, setUsedSizes] = useState<string[]>([]);
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // 'all' also reports which values existing variants already use, so the
      // page can flag them before you delete one.
      const res = await fetch(`${API}/variant-options/all`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Server returned ${res.status} — is the backend running at ${API}?`);
      const data: OptionsPayload = await res.json();
      setSizes(data.sizes ?? []);
      setColors(data.colors ?? []);
      setUsedSizes(data.usedSizes ?? []);
      setUsedColors(data.usedColors ?? []);
      setDirty(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load variant options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const res = await fetch(`${API}/variant-options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizes, colors }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Save failed (${res.status}). ${body.slice(0, 200)}`);
      }
      const saved: OptionsPayload = await res.json();
      setSizes(saved.sizes ?? []);
      setColors(saved.colors ?? []);
      setDirty(false);
      setMessage("Saved. These options now appear in every product's variant dropdowns.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        <header className="rounded-[32px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-400">Commerce</p>
          <h1 className="mt-2 text-3xl font-semibold">Variant Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Manage the sizes and colors offered when creating product variants. Add a new size or color once here,
            and it becomes available in the dropdowns on every product page.
          </p>
        </header>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !dirty}
            className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-40"
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={saving || loading}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
          >
            Reload
          </button>
          {dirty && <span className="text-xs font-semibold text-amber-700">Unsaved changes</span>}
          {message && <span className="text-xs font-semibold text-emerald-700">{message}</span>}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-96 animate-pulse rounded-[28px] border border-slate-200 bg-slate-100" />
            <div className="h-96 animate-pulse rounded-[28px] border border-slate-200 bg-slate-100" />
          </div>
        ) : (
          <section className="grid gap-6 lg:grid-cols-2">
            <OptionList
              kind="sizes"
              values={sizes}
              used={usedSizes}
              onChange={(next) => { setSizes(next); setDirty(true); setMessage(null); }}
            />
            <OptionList
              kind="colors"
              values={colors}
              used={usedColors}
              onChange={(next) => { setColors(next); setDirty(true); setMessage(null); }}
            />
          </section>
        )}

        <p className="px-2 pb-4 text-xs text-slate-500">
          Click any value to rename it. Use ▲ ▼ to change the order they appear in the dropdowns.
          Values marked <span className="font-semibold text-emerald-700">in use</span> belong to existing product
          variants — removing one here never changes those products, it only stops offering it for new variants.
        </p>
      </div>
    </div>
  );
}
