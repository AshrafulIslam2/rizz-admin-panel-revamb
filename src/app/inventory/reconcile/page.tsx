"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

/**
 * The one-time repair of stock eaten by orders that never delivered.
 *
 * Deliberately a two-step screen: the audit writes nothing and shows every
 * variant it would touch, so the figures can be checked against the actual
 * shelf before anything is committed. Applying it twice would add the same
 * units again, so the server refuses — and this page says so plainly rather
 * than hiding the button.
 */

type Row = {
  variant_id: string;
  product: string;
  sku: string;
  size: string;
  color: string;
  current_stock: number;
  stock_change: number;
  new_stock: number;
  reserved_change: number;
  order_count: number;
  orders: string[];
};

type Audit = {
  already_run: boolean;
  ran_at: string | null;
  orders_affected: number;
  orders_by_status: Record<string, number>;
  units_to_restore: number;
  units_to_remove: number;
  variants_affected: number;
  unmatched_lines: number;
  rows: Row[];
};

const card = "rounded-2xl border border-slate-200 bg-white p-5";

export default function StockReconcilePage() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/inventory/reconcile/audit`, { cache: "no-store" });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setAudit(await r.json());
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Could not reach the API." });
      setAudit(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function apply() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${API}/inventory/reconcile/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "admin" }),
      });
      const text = await r.text();
      if (!r.ok) {
        let detail = text;
        try { detail = JSON.parse(text).message ?? text; } catch { /* plain */ }
        throw new Error(String(detail).slice(0, 400));
      }
      setMsg({ type: "ok", text: "Stock reconciled. Every change is in the inventory movement history." });
      setConfirmText("");
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Failed." });
    } finally {
      setBusy(false);
    }
  }

  const canApply = audit && !audit.already_run && audit.variants_affected > 0 && confirmText === "RECONCILE";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <Link href="/inventory" className="text-xs text-teal-400 hover:text-teal-300">← Inventory</Link>
          <h1 className="mt-2 text-2xl font-semibold">Stock Reconciliation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Orders used to take stock the moment they were placed. This gives back what the ones that never
            delivered took.
          </p>
        </header>

        {msg && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${
            msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}>{msg.text}</div>
        )}

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white border border-slate-200" />
        ) : !audit ? (
          <div className={card}><p className="text-sm text-slate-500">No audit available.</p></div>
        ) : (
          <>
            {audit.already_run && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold">Already reconciled on {new Date(audit.ran_at!).toLocaleString()}.</p>
                <p className="mt-1 text-xs">
                  It will not run again — doing so would add the same units a second time. From here, stock is kept
                  correct automatically as orders move.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Units to restore", value: `+${audit.units_to_restore}`, tone: "text-emerald-700" },
                { label: "Units to remove", value: audit.units_to_remove ? `−${audit.units_to_remove}` : "0", tone: "text-rose-600" },
                { label: "Variants affected", value: String(audit.variants_affected), tone: "text-slate-900" },
                { label: "Orders involved", value: String(audit.orders_affected), tone: "text-slate-900" },
              ].map((s) => (
                <div key={s.label} className={card}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {Object.keys(audit.orders_by_status).length > 0 && (
              <div className={card}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Where the stock went
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(audit.orders_by_status).map(([label, n]) => (
                    <span key={label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                      {label}: <b>{n}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {audit.unmatched_lines > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {audit.unmatched_lines} order line(s) could not be matched to a variant — most likely a product or
                size that no longer exists. Those are left alone rather than guessed at.
              </div>
            )}

            {audit.rows.length === 0 ? (
              <div className={card}>
                <p className="text-sm text-slate-600">
                  Nothing to reconcile — no order has taken stock that it should not be holding.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">What would change</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Check these against the shelf before applying. Nothing has been written yet.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        {["Product", "Variant", "Now", "Change", "After", "Orders"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {audit.rows.map((r) => (
                        <tr key={r.variant_id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{r.product}</p>
                            <p className="text-[11px] text-slate-400">{r.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {[r.size && `Size ${r.size}`, r.color].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-600">{r.current_stock}</td>
                          <td className={`px-4 py-3 font-bold tabular-nums ${r.stock_change > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {r.stock_change > 0 ? `+${r.stock_change}` : r.stock_change}
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">{r.new_stock}</td>
                          <td className="px-4 py-3 text-xs text-slate-500" title={r.orders.join(", ")}>
                            {r.order_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!audit.already_run && audit.rows.length > 0 && (
              <div className={`${card} border-2 border-amber-300`}>
                <p className="text-sm font-bold text-slate-900">Apply the reconciliation</p>
                <p className="mt-1 text-xs text-slate-600">
                  This runs once. If you have already corrected any of these counts by hand, applying it will add
                  those units a second time — check the table above against the shelf first.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Every change is written to the inventory movement history as an adjustment referencing
                  <code className="mx-1 rounded bg-slate-100 px-1">stock-reconciliation-v1</code>, so it can be
                  traced or undone.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type RECONCILE to enable"
                    className="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={!canApply || busy}
                    onClick={apply}
                    className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-40"
                  >
                    {busy ? "Applying…" : `Restore ${audit.units_to_restore} units`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
