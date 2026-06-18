"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  dispatched: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ordersRes, productsRes] = await Promise.allSettled([
          fetch(`${API}/orders?limit=5&sort=createdAt:desc`, { cache: "no-store" }),
          fetch(`${API}/products?limit=1`, { cache: "no-store" }),
        ]);

        let orders: any[] = [];
        let totalOrders = 0;
        let pendingOrders = 0;
        let revenue = 0;

        if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
          const data = await ordersRes.value.json();
          orders = Array.isArray(data) ? data.slice(0, 5) : (data.data ?? data.orders ?? []).slice(0, 5);
          totalOrders = data.total ?? orders.length;
          pendingOrders = orders.filter((o: any) => o.status === "pending").length;
          revenue = orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);
        }

        let productCount = 0;
        if (productsRes.status === "fulfilled" && productsRes.value.ok) {
          const data = await productsRes.value.json();
          productCount = data.total ?? (Array.isArray(data) ? data.length : 0);
        }

        setRecentOrders(orders);
        setStats([
          { label: "Total Orders", value: String(totalOrders), sub: "all time", color: "text-slate-900" },
          { label: "Pending COD", value: String(pendingOrders), sub: "need confirmation", color: "text-amber-600" },
          { label: "Products", value: String(productCount), sub: "in catalog", color: "text-slate-900" },
          { label: "Revenue", value: `৳${revenue.toLocaleString()}`, sub: "delivered orders", color: "text-emerald-700" },
        ]);
      } catch {
        setStats([
          { label: "Total Orders", value: "—", sub: "API not connected", color: "text-slate-400" },
          { label: "Pending COD", value: "—", sub: "API not connected", color: "text-slate-400" },
          { label: "Products", value: "—", sub: "API not connected", color: "text-slate-400" },
          { label: "Revenue", value: "—", sub: "API not connected", color: "text-slate-400" },
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

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
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
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[order.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
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
