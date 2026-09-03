"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ORDER_STATUS_LABEL, statusOf, type OrderSummaryResponse } from "@/lib/order-status";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type StatCard = { label: string; value: string; sub: string; color: string };

const QUICK_LINKS = [
  { label: "New Product", href: "/admin/products/new", desc: "Add to catalog" },
  { label: "View Orders", href: "/orders", desc: "Manage COD orders" },
  { label: "Review Queue", href: "/reviews", desc: "Approve reviews" },
  { label: "Edit FAQ", href: "/faq", desc: "Update answers" },
  { label: "SEO Settings", href: "/seo", desc: "Page meta & schema" },
  { label: "Branding", href: "/branding", desc: "Contact & social" },
];

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

const taka = (n: number) => `৳${Math.round(n).toLocaleString()}`;

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<OrderSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, ordersRes, productsRes, profitRes] = await Promise.allSettled([
          fetch(`${API}/orders/stats/summary`, { cache: "no-store" }),
          fetch(`${API}/orders`, { cache: "no-store" }),
          fetch(`${API}/products?limit=1`, { cache: "no-store" }),
          fetch(`${API}/orders/stats/profit`, { cache: "no-store" }),
        ]);

        // The summary is computed server-side from the shared status rules.
        // The old code summed `total` over the five orders it happened to have
        // fetched and labelled the result "delivered orders" — wrong twice.
        let sum: OrderSummaryResponse | null = null;
        if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
          sum = await summaryRes.value.json();
        }
        setSummary(sum);

        if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
          const data = await ordersRes.value.json();
          const list = Array.isArray(data) ? data : (data.data ?? data.orders ?? []);
          setRecentOrders(list.slice(0, 5));
        }

        let productCount = 0;
        if (productsRes.status === "fulfilled" && productsRes.value.ok) {
          const data = await productsRes.value.json();
          productCount = data.total ?? (Array.isArray(data) ? data.length : 0);
        }

        let totalProfit: number | null = null;
        if (profitRes.status === "fulfilled" && profitRes.value.ok) {
          const data = await profitRes.value.json();
          totalProfit = data.totalProfit ?? null;
        }

        if (!sum) {
          setStats([
            { label: "Total Orders", value: "—", sub: "API not connected", color: "text-slate-400" },
            { label: "Delivered Sales", value: "—", sub: "API not connected", color: "text-slate-400" },
            { label: "Products", value: String(productCount || "—"), sub: "in catalog", color: "text-slate-900" },
            { label: "Net Revenue", value: "—", sub: "API not connected", color: "text-slate-400" },
          ]);
          return;
        }

        const o = sum.orders;
        const f = sum.financial;
        setStats([
          {
            label: "Delivered Sales",
            value: taka(f.deliveredSales),
            sub: `${o.delivered} completed ${o.delivered === 1 ? "order" : "orders"}`,
            color: "text-emerald-700",
          },
          {
            label: "Net Revenue",
            value: taka(f.netRevenue),
            sub: "delivered − refunds − returns",
            color: "text-emerald-700",
          },
          {
            label: "Order Value Placed",
            value: taka(f.placedOrderValue),
            sub: "not yet earned",
            color: "text-slate-900",
          },
          {
            label: "In Pipeline",
            value: taka(f.confirmedPipelineValue),
            sub: "confirmed + processing + shipped",
            color: "text-blue-700",
          },
          {
            label: "Needs Attention",
            value: String(o.pending + o.verificationRequired),
            sub: "pending + to verify",
            color: (o.pending + o.verificationRequired) > 0 ? "text-amber-600" : "text-slate-900",
          },
          {
            label: "Total Profit",
            value: totalProfit != null ? taka(totalProfit) : "—",
            sub: totalProfit != null ? "delivered, after production cost" : "Set production cost on variants",
            color: totalProfit != null && totalProfit >= 0 ? "text-emerald-700" : "text-rose-600",
          },
          {
            label: "Fake / Void",
            value: String(o.fake + o.duplicate + o.test + o.failed),
            sub: o.fake > 0 ? `${taka(f.fakeValue)} kept out of revenue` : "none flagged",
            color: (o.fake + o.duplicate) > 0 ? "text-red-700" : "text-slate-900",
          },
          {
            label: "Products",
            value: String(productCount),
            sub: "in catalog",
            color: "text-slate-900",
          },
        ]);
      } catch {
        setStats([
          { label: "Total Orders", value: "—", sub: "API not connected", color: "text-slate-400" },
          { label: "Delivered Sales", value: "—", sub: "API not connected", color: "text-slate-400" },
          { label: "Products", value: "—", sub: "API not connected", color: "text-slate-400" },
          { label: "Net Revenue", value: "—", sub: "API not connected", color: "text-slate-400" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">RIZZ Leather</p>
          <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your store — orders, products, content, and settings.</p>
        </header>

        {/* Today — keeps "orders came in" and "sales completed" from blurring */}
        {summary && (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Today</h2>
              <p className="text-xs text-slate-400">
                {taka(summary.today.financial.placedOrderValue)} of orders came in ·{" "}
                <span className="font-semibold text-emerald-700">
                  {taka(summary.today.financial.deliveredSales)} actually completed
                </span>
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "New Orders", value: summary.today.orders.pending + summary.today.orders.verificationRequired, tone: "text-amber-600" },
                { label: "Confirmed", value: summary.today.orders.confirmed, tone: "text-blue-700" },
                { label: "Shipped", value: summary.today.orders.shipped, tone: "text-purple-700" },
                { label: "Delivered", value: summary.today.orders.delivered, tone: "text-emerald-700" },
                { label: "Cancelled", value: summary.today.orders.cancelled, tone: "text-rose-600" },
                { label: "Fake", value: summary.today.orders.fake + summary.today.orders.duplicate, tone: "text-red-700" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
                  <p className={`mt-0.5 text-xl font-bold tabular-nums ${c.value > 0 ? c.tone : "text-slate-300"}`}>{c.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white border border-slate-200" />
              ))
            : stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
                  <p className={`mt-2 text-3xl font-semibold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
                </div>
              ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Recent Orders */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recent Orders</h2>
              <Link href="/orders" className="text-xs font-medium text-teal-600 hover:text-teal-700">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                No orders yet. Connect the backend API to see live orders.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        #{order.orderNumber ?? order.id}
                      </p>
                      <p className="text-xs text-slate-500">{order.customer?.name ?? "Customer"} · {order.customer?.phone ?? ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[statusOf(order.status)] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {order.status}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">৳{(order.total ?? 0).toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick Links */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 hover:border-teal-200 hover:bg-teal-50 transition"
                >
                  <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{link.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
