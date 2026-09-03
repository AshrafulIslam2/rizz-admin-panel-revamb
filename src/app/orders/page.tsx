"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  paymentStatusOf,
  statusOf,
} from "@/lib/order-status";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

/** "all" plus every real status, in lifecycle order. */
const STATUSES = ["all", ...ORDER_STATUSES];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verification_required: "bg-orange-50 text-orange-700 border-orange-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  fake: "bg-red-100 text-red-800 border-red-300",
  duplicate: "bg-stone-100 text-stone-700 border-stone-300",
  returned: "bg-yellow-50 text-yellow-800 border-yellow-200",
  refunded: "bg-pink-50 text-pink-700 border-pink-200",
  failed: "bg-slate-100 text-slate-600 border-slate-300",
  test: "bg-slate-100 text-slate-500 border-slate-300",
};

const FILTER_LABEL: Record<string, string> = { all: "All", ...ORDER_STATUS_LABEL };

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "bg-slate-100 text-slate-600 border-slate-300",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partially_paid: "bg-yellow-50 text-yellow-800 border-yellow-200",
  refunded: "bg-pink-50 text-pink-700 border-pink-200",
  partially_refunded: "bg-pink-50 text-pink-700 border-pink-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Void statuses are dimmed so the eye skips them when scanning for real work. */
const VOID = ["fake", "duplicate", "test", "failed"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/orders`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.data ?? data.orders ?? []);
        setOrders(list);
        setFiltered(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = orders;
    if (activeStatus !== "all") list = list.filter((o) => statusOf(o.status) === activeStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          String(o.order_number ?? o.id).toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q) ||
          (o.customer_phone ?? "").includes(q) ||
          (o.tracking_id ?? "").toLowerCase().includes(q) ||
          (Array.isArray(o.items) ? o.items : []).some((it: any) =>
            String(it?.name ?? it?.slug ?? "").toLowerCase().includes(q),
          ),
      );
    }
    setFiltered(list);
  }, [activeStatus, search, orders]);

  const counts: Record<string, number> = { all: orders.length };
  STATUSES.slice(1).forEach((s) => {
    counts[s] = orders.filter((o) => statusOf(o.status) === s).length;
  });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
            <h1 className="mt-1 text-2xl font-semibold">Orders</h1>
            <p className="mt-1 text-sm text-slate-400">All Cash on Delivery orders — confirm, dispatch, and track.</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
            <p className="text-2xl font-semibold">{orders.length}</p>
            <p className="text-xs text-slate-400">total</p>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activeStatus === s
                    ? "border-slate-900 bg-slate-900 text-white"
                    : counts[s] > 0
                      ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      : "border-slate-100 bg-white text-slate-300 hover:border-slate-200"
                }`}
              >
                {FILTER_LABEL[s] ?? s}
                {counts[s] > 0 && <span className="ml-1 opacity-60">{counts[s]}</span>}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or phone..."
            className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400 w-64"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              <p className="font-medium text-rose-600">Backend not connected</p>
              <p className="mt-1 text-slate-400">Set NEXT_PUBLIC_API_URL and connect your orders API.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No orders match this filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {["Order", "Customer", "Items", "Total", "Payment", "Status", "Date", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order: any) => (
                  <tr key={order.id} className={`transition hover:bg-slate-50 ${VOID.includes(statusOf(order.status)) ? "opacity-55" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">#{order.order_number ?? order.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{order.customer_name ?? "—"}</p>
                      <p className="text-xs text-slate-500">{order.customer_phone ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{(order.items ?? []).length} item(s)</td>
                    <td className={`px-4 py-3 font-semibold ${VOID.includes(statusOf(order.status)) ? "text-slate-400 line-through" : "text-slate-900"}`}>
                      ৳{(order.total ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${PAYMENT_COLORS[paymentStatusOf(order.payment_status)] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {PAYMENT_STATUS_LABEL[paymentStatusOf(order.payment_status)]}
                      </span>
                      {Number(order.amount_paid) > 0 && Number(order.amount_paid) < Number(order.total) && (
                        <p className="mt-0.5 text-[10px] text-slate-500">৳{Number(order.amount_paid).toLocaleString()} in</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[statusOf(order.status)] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {ORDER_STATUS_LABEL[statusOf(order.status)] ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString("en-BD") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
