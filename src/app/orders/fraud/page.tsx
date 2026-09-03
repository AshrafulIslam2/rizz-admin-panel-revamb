"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

/**
 * Phone numbers that keep producing orders the shop never gets paid for.
 *
 * This page deliberately does nothing. It blocks nobody and cancels nothing —
 * it is a list to glance at before confirming a large COD order. A customer
 * who once had an order marked fake may well be genuine the next time, and a
 * system that decided that on its own would lose real sales.
 */

type FraudCustomer = {
  phone: string;
  name: string;
  email: string;
  total: number;
  delivered: number;
  cancelled: number;
  fake: number;
  returned: number;
  fakeValue: number;
  deliveredValue: number;
  lastOrder: string;
  reasons: string[];
  score: number;
  fakeRate: number;
};

type FraudResponse = {
  customers: FraudCustomer[];
  totals: { flaggedNumbers: number; fakeOrders: number; valueKeptOutOfRevenue: number };
};

const card = "rounded-2xl border border-slate-200 bg-white p-5";
const taka = (n: number) => `৳${Math.round(n || 0).toLocaleString()}`;

/** Risk band from the score, so the table can be scanned rather than read. */
function band(score: number): { label: string; className: string } {
  if (score >= 6) return { label: "High", className: "bg-red-100 text-red-800 border-red-300" };
  if (score >= 3) return { label: "Elevated", className: "bg-amber-100 text-amber-800 border-amber-300" };
  return { label: "Watch", className: "bg-slate-100 text-slate-600 border-slate-300" };
}

export default function FraudPage() {
  const [data, setData] = useState<FraudResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/orders/fraud/customers`, { cache: "no-store" });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setError(e?.message ?? "Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = (data?.customers ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.phone.includes(q) || (c.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
          <h1 className="mt-1 text-2xl font-semibold">Fake Order History</h1>
          <p className="mt-1 text-sm text-slate-400">
            Numbers with a record of fake orders. Nothing here is blocked automatically — this is for you to check
            before confirming a big COD order.
          </p>
        </header>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Flagged numbers", value: String(data?.totals.flaggedNumbers ?? 0), tone: "text-slate-900" },
                { label: "Fake orders", value: String(data?.totals.fakeOrders ?? 0), tone: "text-red-700" },
                { label: "Kept out of revenue", value: taka(data?.totals.valueKeptOutOfRevenue ?? 0), tone: "text-emerald-700" },
              ].map((s) => (
                <div key={s.label} className={card}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone or name…"
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400"
            />

            {rows.length === 0 ? (
              <div className={card}>
                <p className="text-sm text-slate-600">
                  {data?.customers.length === 0
                    ? "No number has a fake order against it. Nothing to watch."
                    : "No number matches that search."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        {["Risk", "Customer", "Orders", "Delivered", "Cancelled", "Fake", "Fake rate", "Value blocked", "Reasons"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((c) => {
                        const b = band(c.score);
                        return (
                          <tr key={c.phone} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${b.className}`}>
                                {b.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{c.name || "—"}</p>
                              <p className="text-xs text-slate-500">{c.phone}</p>
                            </td>
                            <td className="px-4 py-3 tabular-nums text-slate-600">{c.total}</td>
                            <td className="px-4 py-3 tabular-nums text-emerald-700">{c.delivered}</td>
                            <td className="px-4 py-3 tabular-nums text-slate-600">{c.cancelled}</td>
                            <td className="px-4 py-3 font-bold tabular-nums text-red-700">{c.fake}</td>
                            <td className="px-4 py-3 tabular-nums text-slate-600">{c.fakeRate}%</td>
                            <td className="px-4 py-3 tabular-nums text-slate-600">{taka(c.fakeValue)}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {c.reasons.length ? c.reasons.slice(0, 2).join("; ") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={card}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">How the risk band is worked out</p>
              <p className="mt-2 text-xs text-slate-600">
                <b>fake × 3 + cancelled × 1 + returned × 0.5 − delivered × 1.5</b>. A fake order is the strongest
                signal; a delivered order pulls the score back down, because someone who has actually paid before is
                probably real. Deliberately simple — you should be able to disagree with it.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Fake orders are never deleted. That is the whole reason this page can exist:{" "}
                <Link href="/orders?status=fake" className="font-semibold text-teal-700 hover:underline">
                  see the orders themselves
                </Link>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
