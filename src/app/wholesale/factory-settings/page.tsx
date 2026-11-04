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
import {
  calcFactoryAllocation,
  calcFactoryLinePool,
  CostFieldLike,
  FactoryEmployee,
  LABOUR_FIELD_KEY,
  PRODUCT_LINE_LABELS,
  PRODUCT_LINES,
  ProductLineKey,
  WELFARE_FIELD_KEY,
} from "@/lib/costing-calc";

const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400";

/** Capacities to preview the allocation at, so the effect is visible at a glance. */
const PREVIEW_CAPACITIES = [300, 600, 1000];

/** Quick-pick roles; anything else can be typed. */
const ROLE_SUGGESTIONS = ["Upperman", "Sewing man", "Finishing man", "Helper", "Fitting man", "Shoe maker", "Cutting man", "Supervisor"];

/** An employee row while editing — salary kept as typed text. */
type EmployeeRow = Omit<FactoryEmployee, "monthly_salary"> & { monthly_salary: string };

function newRow(): EmployeeRow {
  return { id: `new-${Math.random().toString(36).slice(2, 10)}`, name: "", role: "", monthly_salary: "", lines: ["SHOE", "SANDAL"], active: true };
}

function lineTag(lines: ProductLineKey[]): { text: string; cls: string } {
  if (lines.includes("SHOE") && lines.includes("SANDAL")) return { text: "Common", cls: "bg-violet-50 text-violet-700" };
  if (lines.includes("SHOE")) return { text: "Shoe only", cls: "bg-sky-50 text-sky-700" };
  if (lines.includes("SANDAL")) return { text: "Sandal only", cls: "bg-amber-50 text-amber-700" };
  return { text: "No line", cls: "bg-rose-50 text-rose-700" };
}

/**
 * The factory's monthly bills, entered once.
 *
 * Wages come from the employee list: each person is tagged Shoe, Sandal or
 * both, and a design is charged only the wages of people on its line. Snacks
 * and welfare follow headcount; rent, electricity and the rest are shared.
 * Each design then divides its pool by its own standard capacity.
 */
export default function FactoryCostSettingsPage() {
  const [fields, setFields] = useState<CostField[]>([]);
  const [monthly, setMonthly] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
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
      setEmployees((s.employees ?? []).map((e) => ({ ...e, role: e.role ?? "", monthly_salary: String(e.monthly_salary ?? "") })));
    } catch (e: any) { setError(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const staff: FactoryEmployee[] = useMemo(
    () => employees.map((e) => ({ ...e, monthly_salary: Number(e.monthly_salary) || 0 })),
    [employees],
  );
  const activeStaff = staff.filter((e) => e.active !== false);
  const usesEmployees = activeStaff.length > 0;
  const salaryTotal = activeStaff.reduce((sum, e) => sum + e.monthly_salary, 0);

  // What the salary box shows: the list's total once anyone is on it.
  const monthlyNumbers = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of fields) out[f.key] = Number(monthly[f.key]) || 0;
    if (usesEmployees) out[LABOUR_FIELD_KEY] = salaryTotal;
    return out;
  }, [fields, monthly, usesEmployees, salaryTotal]);

  const totalMonthly = useMemo(() => Object.values(monthlyNumbers).reduce((a, b) => a + b, 0), [monthlyNumbers]);

  const pools = useMemo(() => {
    const cf = fields as unknown as CostFieldLike[];
    return Object.fromEntries(PRODUCT_LINES.map((line) => [line, calcFactoryLinePool(monthlyNumbers, cf, staff, line)])) as Record<
      ProductLineKey,
      ReturnType<typeof calcFactoryLinePool>
    >;
  }, [fields, monthlyNumbers, staff]);

  function updateRow(id: string, patch: Partial<EmployeeRow>) {
    setEmployees((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setMessage(null);
  }

  function toggleLine(row: EmployeeRow, line: ProductLineKey) {
    const has = row.lines.includes(line);
    updateRow(row.id, { lines: has ? row.lines.filter((l) => l !== line) : [...row.lines, line] });
  }

  function removeRow(row: EmployeeRow) {
    if (row.name && !confirm(`Remove ${row.name} from the list? Mark them inactive instead if you want to keep the record.`)) return;
    setEmployees((rows) => rows.filter((r) => r.id !== row.id));
    setMessage(null);
  }

  async function save() {
    setError(null); setMessage(null);
    const problem = employees.find((e) => !e.name.trim() || e.lines.length === 0);
    if (problem) {
      setError(!problem.name.trim() ? "Every employee needs a name." : `${problem.name}: choose Shoe, Sandal, or both.`);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, number> = {};
      for (const f of fields) payload[f.key] = monthlyNumbers[f.key] ?? 0;
      const saved = await saveFactorySettings({
        monthly: payload,
        // New rows get their real id from the server.
        employees: staff.map((e) => ({ ...e, id: e.id.startsWith("new-") ? "" : e.id })),
      });
      setEmployees((saved.employees ?? []).map((e) => ({ ...e, role: e.role ?? "", monthly_salary: String(e.monthly_salary ?? "") })));
      setMessage("Saved. Every product costing uses these figures from its next save.");
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
            Production staff and the factory&apos;s monthly bills, entered once. A shoe carries only the wages of people
            who make shoes; a sandal only of people who make sandals.
          </p>
        </header>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

        {loading ? (
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
        ) : (
          <>
            {/* ── Production staff ── */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Production Staff</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Tick the lines each person works on. Upperman, sewing, finishing and helpers usually work on both.
                  </p>
                </div>
                <button onClick={() => { setEmployees((r) => [...r, newRow()]); setMessage(null); }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  + Add employee
                </button>
              </div>

              {employees.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No staff added yet, so the single salary figure below is charged to every design.
                  Add your production staff to split wages between shoes and sandals.
                </p>
              ) : (
                <div className="space-y-2">
                  <datalist id="employee-roles">{ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
                  {employees.map((row) => {
                    const tag = lineTag(row.lines);
                    const inactive = row.active === false;
                    return (
                      <div key={row.id} className={`rounded-2xl border p-3 ${inactive ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200"}`}>
                        <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
                          <input value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} placeholder="Name" className={input} />
                          <input value={row.role ?? ""} onChange={(e) => updateRow(row.id, { role: e.target.value })} placeholder="Role" list="employee-roles" className={input} />
                          <input type="number" inputMode="decimal" min="0" step="any" value={row.monthly_salary}
                            onChange={(e) => updateRow(row.id, { monthly_salary: e.target.value })} placeholder="Monthly salary ৳" className={input} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {PRODUCT_LINES.map((line) => {
                            const on = row.lines.includes(line);
                            return (
                              <button key={line} type="button" onClick={() => toggleLine(row, line)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  on ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-slate-500 hover:border-slate-400"
                                }`}>
                                {on ? "✓ " : ""}{PRODUCT_LINE_LABELS[line]}
                              </button>
                            );
                          })}
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tag.cls}`}>{tag.text}</span>
                          <div className="ml-auto flex items-center gap-3">
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                              <input type="checkbox" checked={!inactive} onChange={(e) => updateRow(row.id, { active: e.target.checked })} />
                              Active
                            </label>
                            <button type="button" onClick={() => removeRow(row)} className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="text-slate-600">{activeStaff.length} active {activeStaff.length === 1 ? "person" : "people"}</span>
                    <span className="font-bold tabular-nums text-slate-900">Total salary {taka(salaryTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Monthly bills ── */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Monthly Factory Expenses</h2>
              <p className="mb-4 text-xs text-slate-500">
                Enter the whole month&apos;s bill for each line, not a per-dozen figure.
              </p>
              {fields.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No monthly factory fields yet — add them in{" "}
                  <Link href="/wholesale/cost-fields" className="font-semibold text-teal-700 hover:underline">Cost Fields</Link>{" "}
                  with section Factory and basis Per Month.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((f) => {
                    const fromList = f.key === LABOUR_FIELD_KEY && usesEmployees;
                    return (
                      <div key={f.id}>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</p>
                        <input type="number" inputMode="decimal" step="any" placeholder="0"
                          value={fromList ? String(salaryTotal) : (monthly[f.key] ?? "")}
                          readOnly={fromList}
                          onChange={(e) => { setMonthly((s) => ({ ...s, [f.key]: e.target.value })); setMessage(null); }}
                          className={`${input} ${fromList ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`} />
                        <p className="mt-1 text-[11px] text-slate-400">
                          {fromList
                            ? "Total of the Production Staff list above"
                            : f.key === WELFARE_FIELD_KEY && usesEmployees
                              ? "Split by headcount — each line pays for its own people"
                              : f.help_text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── What each line is charged ── */}
            <div className="rounded-[28px] border border-teal-200 bg-teal-50 p-6">
              <div className="flex items-baseline justify-between border-b border-teal-300 pb-3">
                <span className="font-semibold text-teal-900">Total Monthly Factory Cost</span>
                <span className="text-2xl font-bold tabular-nums text-teal-800">{taka(totalMonthly)}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PRODUCT_LINES.map((line) => {
                  const p = pools[line];
                  return (
                    <div key={line} className="rounded-2xl bg-white/70 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">{PRODUCT_LINE_LABELS[line]} designs pay</p>
                      <div className="mt-2 space-y-1 text-sm text-teal-900">
                        <div className="flex justify-between">
                          <span>Wages{p.usesEmployees ? ` (${p.labourHeadcount} of ${p.totalHeadcount} people)` : ""}</span>
                          <span className="tabular-nums">{taka(p.labour)}</span>
                        </div>
                        <div className="flex justify-between"><span>Snacks / welfare</span><span className="tabular-nums">{taka(p.welfare)}</span></div>
                        <div className="flex justify-between"><span>Rent, electricity and other bills</span><span className="tabular-nums">{taka(p.shared)}</span></div>
                        <div className="flex justify-between border-t border-teal-200 pt-1 font-bold"><span>Monthly pool</span><span className="tabular-nums">{taka(p.total)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-teal-700">Factory and labour cost per pair</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-teal-700">
                      <th className="py-2 font-semibold">Standard capacity</th>
                      {PRODUCT_LINES.map((line) => (
                        <th key={line} className="py-2 text-right font-semibold">{PRODUCT_LINE_LABELS[line]} / pair</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-teal-900">
                    {PREVIEW_CAPACITIES.map((pairs) => (
                      <tr key={pairs} className="border-t border-teal-200">
                        <td className="py-2">{pairs.toLocaleString()} pairs / month</td>
                        {PRODUCT_LINES.map((line) => (
                          <td key={line} className="py-2 text-right font-bold tabular-nums">
                            {taka(calcFactoryAllocation(pools[line].total, pairs).perPair)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-teal-800">
                Capacity = pairs of that one design the factory could make in a month if it made nothing else. A common
                worker&apos;s full salary sits over those pairs on both lines — that isn&apos;t double counting, because in a mixed
                month their time splits but the cost per pair stays the same.
              </p>
            </div>

            <button onClick={save} disabled={saving}
              className="w-full rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50">
              {saving ? "Saving…" : "Save Factory Cost Settings"}
            </button>

            <p className="pb-6 text-center text-xs text-slate-500">
              Each product&apos;s line and capacity are set on its costing record, under{" "}
              <Link href="/wholesale/production" className="font-semibold text-teal-700 hover:underline">Production</Link>{" "}
              → Factory &amp; Labour.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
