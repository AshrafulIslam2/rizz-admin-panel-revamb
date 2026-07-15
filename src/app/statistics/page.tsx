"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Summary = {
  totalRevenue: number; totalOrders: number; totalProducts: number;
  totalStockQty: number; totalStockValue: number; totalPurchaseCost: number;
  totalDelivered: number; totalCancelled: number; totalPending: number;
  totalProfit: number; totalCost: number; profitMargin: number;
};
type MonthRow = { month: string; revenue: number; orders: number; profit: number; cost: number };
type YearRow  = { year: string; revenue: number; orders: number; profit: number };
type Product  = { name: string; slug: string; sku: string; image: string; qty: number; revenue: number; profit: number };
type StockItem = { name: string; slug: string; image: string; totalStock: number };
type Customer = { name: string; phone: string; email: string; orders: number; value: number; cancelled: number; cancelledValue: number; lastOrder: string };
type StatsData = {
  summary: Summary;
  monthlyData: MonthRow[];
  yearlyData: YearRow[];
  productRankings: Product[];
  lowStockProducts: StockItem[];
  outOfStockProducts: StockItem[];
  customers: { topByOrders: Customer[]; topByValue: Customer[]; topByCancelled: Customer[] };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
const fmtN = (n: number) => n.toLocaleString("en-US");
const pct = (n: number) => `${n.toFixed(1)}%`;

const PRESET_RANGES = [
  { label: "Today",      days: 0 },
  { label: "Yesterday",  days: -1 },
  { label: "This Week",  days: 7 },
  { label: "This Month", days: 30 },
  { label: "This Year",  days: 365 },
  { label: "All Time",   days: -999 },
];

const CHART_COLORS = ["#0d9488", "#f59e0b", "#6366f1", "#ef4444", "#10b981", "#8b5cf6"];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

// ── Summary Card ──────────────────────────────────────────────────────────────
function Card({ label, value, sub, accent = false, warn = false }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${warn ? "border-rose-200 bg-rose-50" : accent ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${warn ? "text-rose-700" : accent ? "text-teal-700" : "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-slate-200 bg-slate-100" />
      <div className="h-72 rounded-2xl border border-slate-200 bg-slate-100" />
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-2 font-semibold text-slate-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-semibold">{typeof p.value === "number" && p.value > 1000 ? fmt(p.value) : fmtN(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Customer Table ────────────────────────────────────────────────────────────
function CustomerTable({ rows, mode }: { rows: Customer[]; mode: "orders" | "value" | "cancelled" }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter(c =>
    [c.name, c.phone, c.email].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, or email…"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
      />
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
              {mode === "orders"    && <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Orders</th>}
              {mode === "orders"    && <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Purchase Value</th>}
              {mode === "value"     && <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total Spent</th>}
              {mode === "value"     && <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Orders</th>}
              {mode === "cancelled" && <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Cancelled</th>}
              {mode === "cancelled" && <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Cancelled Value</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No results.</td></tr>
            )}
            {filtered.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                {mode === "orders"    && <td className="px-4 py-3 text-right font-semibold text-teal-700">{c.orders}</td>}
                {mode === "orders"    && <td className="px-4 py-3 text-right text-slate-700">{fmt(c.value)}</td>}
                {mode === "value"     && <td className="px-4 py-3 text-right font-semibold text-teal-700">{fmt(c.value)}</td>}
                {mode === "value"     && <td className="px-4 py-3 text-right text-slate-700">{c.orders}</td>}
                {mode === "cancelled" && <td className="px-4 py-3 text-right font-semibold text-rose-600">{c.cancelled}</td>}
                {mode === "cancelled" && <td className="px-4 py-3 text-right text-rose-600">{fmt(c.cancelledValue)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Product Table ─────────────────────────────────────────────────────────────
function ProductTable({ rows, title }: { rows: Product[]; title: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Product</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Qty Sold</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No sales data yet.</td></tr>
            )}
            {rows.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="h-9 w-9 rounded-lg object-cover border border-slate-200" />
                      : <div className="h-9 w-9 rounded-lg bg-slate-100" />
                    }
                    <div>
                      <p className="font-medium text-slate-900 leading-tight">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{p.qty}</td>
                <td className="px-4 py-3 text-right text-teal-700">{fmt(p.revenue)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${p.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{fmt(p.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StatisticsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState("All Time");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerTab, setCustomerTab] = useState<"orders" | "value" | "cancelled">("orders");
  const [chartView, setChartView] = useState<"monthly" | "yearly">("monthly");

  function applyPreset(label: string, days: number) {
    setPreset(label);
    if (days === -999) { setFrom(""); setTo(""); return; }
    const end = new Date();
    const start = new Date();
    if (days === -1) { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
    else if (days > 0) start.setDate(start.getDate() - days);
    setFrom(toDateStr(start));
    setTo(toDateStr(end));
  }

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await fetch(`${API}/stats?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch stats");
        setData(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [from, to]);

  const orderPieData = data ? [
    { name: "Delivered", value: data.summary.totalDelivered },
    { name: "Cancelled", value: data.summary.totalCancelled },
    { name: "Pending",   value: data.summary.totalPending },
    { name: "Other",     value: Math.max(0, data.summary.totalOrders - data.summary.totalDelivered - data.summary.totalCancelled - data.summary.totalPending) },
  ].filter((d) => d.value > 0) : [];

  const chartData = chartView === "monthly"
    ? (data?.monthlyData ?? []).map((d) => ({ name: d.month, Revenue: d.revenue, Profit: d.profit, Orders: d.orders }))
    : (data?.yearlyData ?? []).map((d) => ({ name: d.year, Revenue: d.revenue, Profit: d.profit, Orders: d.orders }));

  const topByRevenue = useMemo(() => data ? [...data.productRankings].sort((a, b) => b.revenue - a.revenue).slice(0, 10) : [], [data]);
  const topByProfit  = useMemo(() => data ? [...data.productRankings].sort((a, b) => b.profit  - a.profit ).slice(0, 10) : [], [data]);
  const topBySold    = useMemo(() => data ? [...data.productRankings].sort((a, b) => b.qty     - a.qty    ).slice(0, 10) : [], [data]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-8">

        {/* Header */}
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">RIZZ Leather</p>
          <h1 className="mt-1 text-2xl font-semibold">Statistics & Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">Full business overview — sales, profit, stock, customers, and products.</p>
        </header>

        {/* Date Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_RANGES.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.label, p.days)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${preset === p.label ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom Range</span>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("Custom"); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
            <span className="text-slate-400">→</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("Custom"); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
            {(from || to) && (
              <button onClick={() => { setFrom(""); setTo(""); setPreset("All Time"); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Clear
              </button>
            )}
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? <Skeleton /> : data && (
          <>
            {/* ── Summary Cards ── */}
            <section>
              <SectionHead title="Summary" sub={`Showing: ${preset}${from ? ` (${from} → ${to || "today"})` : ""}`} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Card label="Total Revenue"     value={fmt(data.summary.totalRevenue)}     sub="from delivered orders" accent />
                <Card label="Total Profit"      value={fmt(data.summary.totalProfit)}      sub={`Margin: ${pct(data.summary.profitMargin)}`} accent={data.summary.totalProfit >= 0} warn={data.summary.totalProfit < 0} />
                <Card label="Total Orders"      value={fmtN(data.summary.totalOrders)} />
                <Card label="Delivered Orders"  value={fmtN(data.summary.totalDelivered)}  sub="revenue counted" />
                <Card label="Pending Orders"    value={fmtN(data.summary.totalPending)}    warn={data.summary.totalPending > 0} />
                <Card label="Cancelled Orders"  value={fmtN(data.summary.totalCancelled)}  warn={data.summary.totalCancelled > 0} />
                <Card label="Total Products"    value={fmtN(data.summary.totalProducts)} />
                <Card label="Total Stock Qty"   value={fmtN(data.summary.totalStockQty)}   sub="units across all variants" />
                <Card label="Stock Value"       value={fmt(data.summary.totalStockValue)}   sub="at selling price" />
                <Card label="Purchase Cost"     value={fmt(data.summary.totalPurchaseCost)} sub="production cost of stock" />
                <Card label="Profit Margin"     value={pct(data.summary.profitMargin)}      sub="on delivered orders" accent={data.summary.profitMargin > 20} />
                <Card label="Total Cost Paid"   value={fmt(data.summary.totalCost)}         sub="production cost of sold goods" />
              </div>
            </section>

            {/* ── Sales Chart ── */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <SectionHead title="Sales & Profit Trend" />
                <div className="flex gap-2">
                  {(["monthly", "yearly"] as const).map((v) => (
                    <button key={v} onClick={() => setChartView(v)} className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${chartView === v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                      {v === "monthly" ? "Monthly" : "Yearly"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Revenue vs Profit</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTip />} />
                      <Legend />
                      <Line type="monotone" dataKey="Revenue" stroke="#0d9488" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Profit"  stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Order Volume</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Orders" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ── Order Status Pie ── */}
            <section>
              <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <SectionHead title="Revenue vs Profit Bar" />
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTip />} />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Profit"  fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <SectionHead title="Order Status Distribution" />
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={orderPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {orderPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ── Product Analytics ── */}
            <section>
              <SectionHead title="Product Analytics" sub="Based on delivered orders" />
              <div className="space-y-6">
                <ProductTable rows={topBySold}    title="Most Sold Products (by quantity)" />
                <ProductTable rows={topByRevenue} title="Highest Revenue Products" />
                <ProductTable rows={topByProfit}  title="Highest Profit Products" />
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <SectionHead title={`Low Stock (< 5 units)`} sub={`${data.lowStockProducts.length} products`} />
                  {data.lowStockProducts.length === 0
                    ? <p className="text-sm text-slate-400">All products have sufficient stock.</p>
                    : (
                      <div className="space-y-2">
                        {data.lowStockProducts.map((p, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white p-3">
                            {p.image ? <img src={p.image} alt={p.name} className="h-8 w-8 rounded-lg object-cover" /> : <div className="h-8 w-8 rounded-lg bg-slate-100" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                            </div>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{p.totalStock} left</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <SectionHead title="Out of Stock" sub={`${data.outOfStockProducts.length} products`} />
                  {data.outOfStockProducts.length === 0
                    ? <p className="text-sm text-slate-400">No out-of-stock products.</p>
                    : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.outOfStockProducts.map((p, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-rose-200 bg-white p-3">
                            {p.image ? <img src={p.image} alt={p.name} className="h-8 w-8 rounded-lg object-cover" /> : <div className="h-8 w-8 rounded-lg bg-slate-100" />}
                            <p className="flex-1 text-sm font-medium text-slate-900 truncate">{p.name}</p>
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">Out of stock</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </section>

            {/* ── Customer Analytics ── */}
            <section>
              <SectionHead title="Customer Analytics" sub="Identified by phone number / email" />
              <div className="flex gap-2 mb-5 flex-wrap">
                {([["orders", "Most Orders"], ["value", "Highest Spend"], ["cancelled", "Most Cancelled"]] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => setCustomerTab(tab)} className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${customerTab === tab ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {customerTab === "orders"    && <CustomerTable rows={data.customers.topByOrders}    mode="orders" />}
              {customerTab === "value"     && <CustomerTable rows={data.customers.topByValue}     mode="value" />}
              {customerTab === "cancelled" && <CustomerTable rows={data.customers.topByCancelled} mode="cancelled" />}
            </section>

            {/* ── Monthly Table ── */}
            <section>
              <SectionHead title="Monthly Breakdown" />
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Month", "Orders", "Revenue", "Production Cost", "Profit", "Margin"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.monthlyData.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No data in this range.</td></tr>
                    )}
                    {[...data.monthlyData].reverse().map((row) => {
                      const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
                      return (
                        <tr key={row.month} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-900">{row.month}</td>
                          <td className="px-5 py-3 text-slate-700">{fmtN(row.orders)}</td>
                          <td className="px-5 py-3 text-teal-700 font-semibold">{fmt(row.revenue)}</td>
                          <td className="px-5 py-3 text-slate-600">{fmt(row.cost)}</td>
                          <td className={`px-5 py-3 font-semibold ${row.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{fmt(row.profit)}</td>
                          <td className="px-5 py-3 text-slate-500">{pct(margin)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Yearly Table ── */}
            <section>
              <SectionHead title="Yearly Breakdown" />
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Year", "Orders", "Revenue", "Profit", "Margin"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.yearlyData.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No data.</td></tr>
                    )}
                    {[...data.yearlyData].reverse().map((row) => {
                      const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
                      return (
                        <tr key={row.year} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-bold text-slate-900">{row.year}</td>
                          <td className="px-5 py-3 text-slate-700">{fmtN(row.orders)}</td>
                          <td className="px-5 py-3 text-teal-700 font-semibold">{fmt(row.revenue)}</td>
                          <td className={`px-5 py-3 font-semibold ${row.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{fmt(row.profit)}</td>
                          <td className="px-5 py-3 text-slate-500">{pct(margin)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
