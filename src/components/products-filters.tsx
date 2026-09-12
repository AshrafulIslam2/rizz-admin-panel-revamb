"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The filter bar for the products list.
 *
 * Filters live in the URL rather than in component state, for the same reason
 * the paging does: the list itself is a server component, and a filtered view
 * someone sends to a colleague should open filtered on the other end.
 *
 * The button this replaces had no click handler at all — it looked like a
 * control and did nothing.
 */

export type FilterOption = { value: string; label: string };

const STATUSES: FilterOption[] = [
  { value: "all", label: "All statuses" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
];

const STOCK: FilterOption[] = [
  { value: "all", label: "Any stock" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

const control =
  "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400";

export default function ProductsFilters({ categories }: { categories: FilterOption[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const status = params.get("status") ?? "all";
  const stock = params.get("stock") ?? "all";

  // The search box is typed into, so it needs local state; the dropdowns write
  // straight through.
  const [term, setTerm] = useState(q);
  useEffect(() => { setTerm(q); }, [q]);

  /**
   * Write one filter into the URL.
   *
   * Always drops back to page 1 — staying on page 3 of a list that just shrank
   * to four items is how a filter looks broken when it is working.
   */
  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    const query = sp.toString();
    router.push(query ? `/products?${query}` : "/products");
  }

  const active = [q, category, status, stock].filter((v) => v && v !== "all").length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => { e.preventDefault(); apply({ q: term.trim() }); }}
        className="flex items-center gap-2"
      >
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search name or SKU…"
          className={`${control} w-52`}
          aria-label="Search products"
        />
        {/* Submitting is explicit rather than debounced: the page is server
            rendered, so every keystroke would otherwise be a round trip. */}
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Search
        </button>
      </form>

      {categories.length > 0 && (
        <select
          value={category}
          onChange={(e) => apply({ category: e.target.value })}
          className={control}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      )}

      <select value={status} onChange={(e) => apply({ status: e.target.value })} className={control} aria-label="Filter by status">
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <select value={stock} onChange={(e) => apply({ stock: e.target.value })} className={control} aria-label="Filter by stock">
        {STOCK.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {active > 0 && (
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Clear {active === 1 ? "filter" : `${active} filters`}
        </button>
      )}
    </div>
  );
}
