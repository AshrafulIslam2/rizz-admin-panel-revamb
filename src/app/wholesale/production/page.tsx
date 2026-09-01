"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProductCosting, deleteCosting, listCostings, taka } from "@/lib/costing-api";

export default function ProductionListPage() {
  const [rows, setRows] = useState<ProductCosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await listCostings()); }
    catch (e: any) { setError(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(row: ProductCosting) {
    if (!window.confirm(`Delete the costing record for "${row.product_name}"?\n\nThis removes the costing only — the product itself is not touched.`)) return;
    try { await deleteCosting(row.id); setRows((r) => r.filter((x) => x.id !== row.id)); }
    catch (e: any) { setError(e?.message ?? "Failed to delete"); }
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.product_name.toLowerCase().includes(q) ||
      (r.product_code ?? "").toLowerCase().includes(q) ||
      (r.category ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[32px] bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Wholesale</p>
          <h1 className="mt-2 text-2xl font-semibold">Production Costing</h1>
          <p className="mt-1 text-sm text-slate-400">
            Factory cost, wholesale price and retail price side by side for every product.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-slate-200 bg-white p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, code or category…"
            className="min-w-56 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
          />
          <Link href="/wholesale/retail-settings" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            Retail Cost Settings
          </Link>
          <Link href="/wholesale/cost-fields" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            Cost Fields
          </Link>
          <Link href="/wholesale/production/add" className="rounded-full bg-teal-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-teal-500">
            + Add Product
          </Link>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white">
          {loading ? (
            <div className="space-y-2 p-6">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-500">{rows.length === 0 ? "No costing records yet." : "Nothing matches that search."}</p>
              {rows.length === 0 && (
                <Link href="/wholesale/production/add" className="mt-4 inline-block rounded-full bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-500">
                  + Add your first product costing
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Prod / Dozen</th>
                  <th className="px-4 py-3 text-right">Prod / Pair</th>
                  <th className="px-4 py-3 text-right">Wholesale / Pair</th>
                  <th className="px-4 py-3 text-right">Retail Cost / Pair</th>
                  <th className="px-4 py-3 text-right">Retail Price / Pair</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image_url} alt={r.product_name} className="h-10 w-10 rounded-lg border border-slate-200 object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                        )}
                        <span className="font-medium text-slate-800">{r.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.product_code || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.category || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{taka(r.production_cost_dozen)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">{taka(r.production_cost_pair)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-teal-700">{taka(r.wholesale_price_pair)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{taka(r.retail_cost_pair)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-teal-700">{taka(r.retail_price_pair)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{new Date(r.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/wholesale/production/${r.id}/edit`} className="rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">Edit</Link>
                      <button onClick={() => remove(r)} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50">Delete</button>
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
