"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CostField,
  FactorySettings,
  getFactorySettings,
  listCostFields,
  saveFactorySettings,
  taka,
} from "@/lib/costing-api";
import { calcFactoryAllocation } from "@/lib/costing-calc";

const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400";

/** Capacities to preview the allocation at, so the effect is visible at a glance. */
const PREVIEW_CAPACITIES = [300, 600, 1000];

/**
 * The factory's monthly bills, entered once.
 *
 * Unlike the retail pool there is no expected-output figure here to divide by.
 * These costs reach each product through that product's own standard capacity,
 * because the same eight workers turn out far fewer pairs of a difficult
 * design than an easy one — and that difference IS the labour cost.
 */
export default function FactoryCostSettingsPage() {
  const [fields, setFields] = useState<CostField[]>([]);
  const [monthly, setMonthly] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [f, s]: [CostField[], FactorySettings] = await Promise.all([listCostFields(), getFactorySettings()]);
      // Only the monthly bills live here; per-dozen factory costs such as
      // packaging stay on the product itself.
      setFields(f.filter((x) => x.section === "FACTORY" && x.basis === "PER_MONTH" && x.is_active && !x.is_archived));
      const m: Record<string, string> = {};
      for (const [k, v] of Object.entries(s.monthly ?? {})) m[k] = String(v ?? "");
      setMonthly(m);
    } catch (e: any) { setError(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalMonthly = useMemo(
    () => fields.reduce((sum, f) => sum + (Number(monthly[f.key]) || 0), 0),
    [fields, monthly],
  );

  async function save() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload: Record<string, number> = {};
      for (const f of fields) payload[f.key] = Number(monthly[f.key]) || 0;
      await saveFactorySettings({ monthly: payload });
      setMessage("Saved. Every product costing will use this pool from its next save.");
    } catch (e: any) { setError(e?.message ?? "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[32px] bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Wholesale · Factory</p>
          <h1 className="mt-2 text-2xl font-semibold">Factory Cost Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            The factory&apos;s monthly bills, entered once. Each product carries a share worked out from its own
            standard production capacity.
          </p>
        </header>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

        {loading ? (
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
        ) : (
          <>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Monthly Factory Expenses</h2>
              <p className="mb-4 text-xs text-slate-500">
                Enter the whole month&apos;s bill for each line — the full production wage bill, not a per-dozen figure.
              </p>
              {fields.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No monthly factory fields yet — add them in{" "}
                  <Link href="/wholesale/cost-fields" className="font-semibold text-teal-700 hover:underline">Cost Fields</Link>{" "}
                  with section Factory and basis Per Month.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.id}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</p>
                      <input type="number" inputMode="decimal" step="any" placeholder="0"
                        value={monthly[f.key] ?? ""}
                        onChange={(e) => { setMonthly((s) => ({ ...s, [f.key]: e.target.value })); setMessage(null); }}
                        className={input} />
                      {f.help_text && <p className="mt-1 text-[11px] text-slate-400">{f.help_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-teal-200 bg-teal-50 p-6">
              <div className="flex items-baseline justify-between border-b border-teal-300 pb-3">
                <span className="font-semibold text-teal-900">Total Monthly Factory Cost</span>
                <span className="text-2xl font-bold tabular-nums text-teal-800">{taka(totalMonthly)}</span>
              </div>

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                What that works out to per design
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-teal-700">
                      <th className="py-2 font-semibold">Standard capacity</th>
                      <th className="py-2 text-right font-semibold">Dozen / month</th>
                      <th className="py-2 text-right font-semibold">Cost / dozen</th>
                      <th className="py-2 text-right font-semibold">Cost / pair</th>
                    </tr>
                  </thead>
                  <tbody className="text-teal-900">
                    {PREVIEW_CAPACITIES.map((pairs) => {
                      const a = calcFactoryAllocation(totalMonthly, pairs);
                      return (
                        <tr key={pairs} className="border-t border-teal-200">
                          <td className="py-2">{pairs.toLocaleString()} pairs / month</td>
                          <td className="py-2 text-right tabular-nums">{a.capacityDozen.toLocaleString()}</td>
                          <td className="py-2 text-right font-semibold tabular-nums">{taka(a.perDozen)}</td>
                          <td className="py-2 text-right font-bold tabular-nums">{taka(a.perPair)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-teal-800">
                Same wages, same month — fewer pairs. A design at {PREVIEW_CAPACITIES[0].toLocaleString()} pairs carries{" "}
                {Math.round((PREVIEW_CAPACITIES[2] / PREVIEW_CAPACITIES[0]) * 10) / 10}× the overhead per pair of one at{" "}
                {PREVIEW_CAPACITIES[2].toLocaleString()}.
              </p>
            </div>

            <button onClick={save} disabled={saving}
              className="w-full rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50">
              {saving ? "Saving…" : "Save Factory Cost Settings"}
            </button>

            <p className="pb-6 text-center text-xs text-slate-500">
              Each product&apos;s own capacity is set on its costing record, under{" "}
              <Link href="/wholesale/production" className="font-semibold text-teal-700 hover:underline">Production</Link>{" "}
              → Factory &amp; Labour.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
