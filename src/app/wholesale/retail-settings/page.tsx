"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CostField, RetailSettings, getRetailSettings, listCostFields, saveRetailSettings, taka } from "@/lib/costing-api";

const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400";

/**
 * Shop-wide retail overhead.
 *
 * These are the bills that keep the showroom open but belong to no single
 * product, so they are spread across expected monthly sales to reach a
 * per-pair figure every retail costing then inherits.
 */
export default function RetailCostSettingsPage() {
  const [fields, setFields] = useState<CostField[]>([]);
  const [monthly, setMonthly] = useState<Record<string, string>>({});
  const [expected, setExpected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [f, s]: [CostField[], RetailSettings] = await Promise.all([listCostFields(), getRetailSettings()]);
      setFields(f.filter((x) => x.section === "RETAIL_COMMON" && x.is_active && !x.is_archived));
      const m: Record<string, string> = {};
      for (const [k, v] of Object.entries(s.monthly ?? {})) m[k] = String(v ?? "");
      setMonthly(m);
      setExpected(String(s.expected_monthly_sales_pairs || ""));
    } catch (e: any) { setError(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalMonthly = useMemo(
    () => fields.reduce((sum, f) => sum + (Number(monthly[f.key]) || 0), 0),
    [fields, monthly],
  );
  const expectedPairs = Number(expected) || 0;
  const perPair = expectedPairs > 0 ? totalMonthly / expectedPairs : 0;

  async function save() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload: Record<string, number> = {};
      for (const f of fields) payload[f.key] = Number(monthly[f.key]) || 0;
      await saveRetailSettings({ monthly: payload, expected_monthly_sales_pairs: expectedPairs });
      setMessage("Saved. New retail costings will use this common cost per pair.");
    } catch (e: any) { setError(e?.message ?? "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[32px] bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Wholesale · Retail</p>
          <h1 className="mt-2 text-2xl font-semibold">Retail Cost Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monthly showroom expenses, spread across expected sales to get a retail cost per pair.
          </p>
        </header>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

        {loading ? (
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
        ) : (
          <>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Monthly Retail Expenses</h2>
              {fields.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No retail expense fields yet — add them in{" "}
                  <Link href="/wholesale/cost-fields" className="font-semibold text-teal-700 hover:underline">Cost Fields</Link>.
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Expected Monthly Retail Sales</h2>
              <div className="max-w-xs">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pairs per month</p>
                <input type="number" inputMode="decimal" step="any" placeholder="500"
                  value={expected}
                  onChange={(e) => { setExpected(e.target.value); setMessage(null); }}
                  className={input} />
                <p className="mt-1 text-[11px] text-slate-400">
                  Leave at 0 and the retail common cost stays 0 — no cost is invented from an unknown sales figure.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-teal-200 bg-teal-50 p-6">
              <div className="flex items-baseline justify-between py-1"><span className="text-sm text-teal-900">Total Monthly Retail Expenses</span><span className="text-lg font-bold tabular-nums text-teal-900">{taka(totalMonthly)}</span></div>
              <div className="flex items-baseline justify-between py-1"><span className="text-sm text-teal-900">÷ Expected Monthly Sales</span><span className="text-sm font-medium tabular-nums text-teal-900">{expectedPairs.toLocaleString()} pairs</span></div>
              <div className="mt-3 flex items-baseline justify-between border-t border-teal-300 pt-3"><span className="font-semibold text-teal-900">Retail Common Cost / Pair</span><span className="text-2xl font-bold tabular-nums text-teal-800">{taka(perPair)}</span></div>
            </div>

            <button onClick={save} disabled={saving}
              className="w-full rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50">
              {saving ? "Saving…" : "Save Retail Cost Settings"}
            </button>

            <p className="pb-6 text-center text-xs text-slate-500">
              Existing costing records keep the common cost they were saved with, so changing these figures never silently reprices past products.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
