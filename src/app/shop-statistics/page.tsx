"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Summary = {
  totalSales: number; totalRevenue: number; totalProfit: number; totalCost: number;
  totalItems: number; totalDiscount: number; avgSaleValue: number;
  avgItemsPerSale: number; profitMargin: number;
  itemsWithCost: number; itemsMissingCost: number; costCoverage: number;
};
type DayRow      = { date: string; sales: number; revenue: number; profit: number; items: number };
type HourRow     = { hour: number; sales: number; revenue: number };
type TopProduct  = { name: string; qty: number; revenue: number; profit: number };
type TopCustomer = { name: string; phone: string; purchases: number; value: number; lastPurchase: string };
type RecentSale  = { tx_number: string; created_at: string; customer_name: string | null; total: number; items: number };
type ShopStats = {
  summary: Summary;
  dailyData: DayRow[];
  hourlyData: HourRow[];
  payments: { cash: number; card: number; mobile: number };
  topProducts: TopProduct[];
  topCustomers: TopCustomer[];
  recentSales: RecentSale[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
const fmtN = (n: number) => n.toLocaleString("en-US");

const PRESET_RANGES = [
  { label: "Today",      days: 0 },
  { label: "Yesterday",  days: -1 },
  { label: "This Week",  days: 7 },
  { label: "This Month", days: 30 },
  { label: "This Year",  days: 365 },
  { label: "All Time",   days: -999 },
];

const CHART_COLORS = ["#0d9488", "#f59e0b", "#6366f1", "#ef4444", "#10b981", "#8b5cf6"];

function toDateStr(d: Date) {
  // Local date, not toISOString() — that shifts to UTC and can land on the
  // wrong calendar day for a UTC+6 shop late in the evening.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function dateTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${hh}:${mm}`;
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function Card({ label, value, sub, accent = false, warn = false }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${warn ? "border-amber-200 bg-amber-50" : accent ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${warn ? "text-amber-700" : accent ? "text-teal-700" : "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-6">{children}</div>;
}

function Empty({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{msg}</p>;
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
      <div className="h-80 rounded-2xl border border-slate-200 bg-slate-100" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-slate-100" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ShopStatisticsPage() {
  const [data, setData] = useState<ShopStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A shop owner almost always wants "how did today go?" first.
  const [preset, setPreset] = useState("Today");
  const [from, setFrom] = useState(toDateStr(new Date()));
  const [to, setTo] = useState(toDateStr(new Date()));
  const [productSort, setProductSort] = useState<"qty" | "revenue" | "profit">("qty");

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
        const res = await fetch(`${API}/pos/shop-stats?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Server returned ${res.status} — is the backend running at ${API}?`);
        setData(await res.json());
      } catch (e: any) {
        setError(e?.message ?? "Failed to load shop statistics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [from, to]);

  const trend = useMemo(
    () => (data?.dailyData ?? []).map((d) => ({
      name: shortDate(d.date), Revenue: d.revenue, Profit: d.profit, Sales: d.sales,
    })),
    [data],
  );

  const payPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Cash", value: data.payments.cash },
      { name: "Card", value: data.payments.card },
      { name: "Mobile", value: data.payments.mobile },
    ].filter((d) => d.value > 0);
  }, [data]);

  const busiestHours = useMemo(
    () => (data?.hourlyData ?? [])
      .filter((h) => h.sales > 0)
      .map((h) => ({ name: `${String(h.hour).padStart(2, "0")}:00`, Sales: h.sales, Revenue: h.revenue })),
    [data],
  );

  const sortedProducts = useMemo(() => {
    if (!data) return [];
    return [...data.topProducts].sort((a, b) => b[productSort] - a[productSort]).slice(0, 10);
  }, [data, productSort]);

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-8">

        {/* Header */}
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">RIZZ Leather</p>
          <h1 className="mt-1 text-2xl font-semibold">Shop Statistics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Counter sales from the POS terminal — how many sales, how much money, how much profit.
          </p>
        </header>

        {/* Date Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap gap-2">
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

        {loading ? <Skeleton /> : data && s && (
          <>
            {/* ── Summary cards ── */}
            <section>
              <SectionHead title="Summary" sub={preset === "Custom" ? `${from || "start"} → ${to || "now"}` : preset} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card label="Total Sales"   value={fmtN(s.totalSales)} sub={`${fmtN(s.totalItems)} items sold`} />
                <Card label="Total Revenue" value={fmt(s.totalRevenue)} sub={`Avg ${fmt(s.avgSaleValue)} per sale`} accent />
                <Card label="Total Profit"  value={fmt(s.totalProfit)} sub={`${s.profitMargin}% margin`} accent />
                <Card label="Discount Given" value={fmt(s.totalDiscount)} sub="Across all sales" />
                <Card label="Cost of Goods" value={fmt(s.totalCost)} sub="From production price" />
                <Card label="Items / Sale"  value={String(s.avgItemsPerSale)} sub="Average basket size" />
                <Card label="Cash Taken"    value={fmt(data.payments.cash)} sub="Cash payments" />
                <Card
                  label="Profit Coverage"
                  value={`${s.costCoverage}%`}
                  sub={s.itemsMissingCost > 0 ? `${fmtN(s.itemsMissingCost)} items have no cost price` : "All items have a cost price"}
                  warn={s.costCoverage < 100}
                />
              </div>

              {/* Be explicit when the profit number is only partial rather than
                  letting it read as the whole truth. */}
              {s.itemsMissingCost > 0 && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Profit is calculated from each variant&apos;s <strong>production price</strong>.{" "}
                  {fmtN(s.itemsMissingCost)} sold item{s.itemsMissingCost === 1 ? " has" : "s have"} no production price set,
                  so they add revenue but no profit — the real profit is higher than shown.
                  Set production price on those variants for an accurate figure.
                </p>
              )}
            </section>

            {/* ── Daily trend ── */}
            <section>
              <Panel>
                <SectionHead title="Sales Over Time" sub="Revenue and profit per day" />
                {trend.length === 0 ? <Empty msg="No sales in this period" /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip formatter={(v: any, n: any) => (n === "Sales" ? fmtN(Number(v)) : fmt(Number(v)))} />
                      <Legend />
                      <Line type="monotone" dataKey="Revenue" stroke="#0d9488" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Profit"  stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            </section>

            {/* ── Sales count + payment mix ── */}
            <section className="grid gap-6 lg:grid-cols-2">
              <Panel>
                <SectionHead title="Number of Sales per Day" />
                {trend.length === 0 ? <Empty msg="No sales in this period" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="Sales" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>

              <Panel>
                <SectionHead title="Payment Methods" sub="How customers paid" />
                {payPie.length === 0 ? <Empty msg="No payments recorded" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={payPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                        {payPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            </section>

            {/* ── Busiest hours ── */}
            <section>
              <Panel>
                <SectionHead title="Busiest Hours" sub="When sales happen during the day" />
                {busiestHours.length === 0 ? <Empty msg="No sales in this period" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={busiestHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip formatter={(v: any, n: any) => (n === "Revenue" ? fmt(Number(v)) : fmtN(Number(v)))} />
                      <Legend />
                      <Bar dataKey="Sales" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            </section>

            {/* ── Top products ── */}
            <section>
              <Panel>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <SectionHead title="Best Selling Products" sub="Which products move the most" />
                  <div className="flex gap-2">
                    {([["qty", "By Quantity"], ["revenue", "By Revenue"], ["profit", "By Profit"]] as const).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setProductSort(k)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${productSort === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {sortedProducts.length === 0 ? <Empty msg="No products sold in this period" /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3">#</th>
                          <th className="py-2 pr-3">Product</th>
                          <th className="py-2 pr-3 text-right">Sold</th>
                          <th className="py-2 pr-3 text-right">Revenue</th>
                          <th className="py-2 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProducts.map((p, i) => (
                          <tr key={p.name} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 pr-3 text-slate-400">{i + 1}</td>
                            <td className="py-2.5 pr-3 font-medium text-slate-800">{p.name}</td>
                            <td className="py-2.5 pr-3 text-right text-slate-700">{fmtN(p.qty)}</td>
                            <td className="py-2.5 pr-3 text-right text-slate-700">{fmt(p.revenue)}</td>
                            <td className="py-2.5 text-right font-semibold text-teal-700">{p.profit > 0 ? fmt(p.profit) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </section>

            {/* ── Customers + recent sales ── */}
            <section className="grid gap-6 lg:grid-cols-2">
              <Panel>
                <SectionHead title="Top Customers" sub="By total spend at the counter" />
                {data.topCustomers.length === 0 ? (
                  <Empty msg="No named customers yet — add a name or phone at checkout to track them" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3 text-right">Visits</th>
                          <th className="py-2 pr-3 text-right">Spent</th>
                          <th className="py-2 text-right">Last</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topCustomers.map((c, i) => (
                          <tr key={`${c.phone}-${i}`} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 pr-3">
                              <p className="font-medium text-slate-800">{c.name || "—"}</p>
                              {c.phone && <p className="text-[11px] text-slate-400">{c.phone}</p>}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-slate-700">{fmtN(c.purchases)}</td>
                            <td className="py-2.5 pr-3 text-right font-semibold text-slate-800">{fmt(c.value)}</td>
                            <td className="py-2.5 text-right text-[11px] text-slate-500">{shortDate(c.lastPurchase)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel>
                <SectionHead title="Recent Sales" sub="Latest counter transactions" />
                {data.recentSales.length === 0 ? <Empty msg="No sales in this period" /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3">Invoice</th>
                          <th className="py-2 pr-3">When</th>
                          <th className="py-2 pr-3 text-right">Items</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentSales.map((t) => (
                          <tr key={t.tx_number} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 pr-3 font-mono text-xs text-slate-700">{t.tx_number}</td>
                            <td className="py-2.5 pr-3 text-[11px] text-slate-500">{dateTime(t.created_at)}</td>
                            <td className="py-2.5 pr-3 text-right text-slate-700">{fmtN(t.items)}</td>
                            <td className="py-2.5 text-right font-semibold text-slate-800">{fmt(t.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
