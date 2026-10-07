"use client";

import Link from "next/link";

export type StockVariant = {
  id: string; sku: string; variant_name: string;
  attributes: Record<string, unknown> | null;
  stock_qty: number; reserved_qty: number; available_qty: number;
  selling_price: number; production_price: number | null;
  selling_value: number; production_value: number | null;
  low_stock: boolean; cost_missing: boolean;
};
export type StockProduct = {
  id: string; name: string; slug: string; variants: StockVariant[];
  totalQty: number; totalReserved: number; totalAvailable: number;
  totalValue: number; totalCost: number; missingCostVariants: number;
  missingCostQty: number; lowStockVariants: number;
};
export type StockDashboard = {
  generatedAt: string; threshold: number; products: StockProduct[];
  summary: {
    totalProducts: number; totalVariants: number; totalQty: number;
    totalReserved: number; totalAvailable: number; totalValue: number;
    totalCost: number; missingCostVariants: number; missingCostQty: number;
    lowStockVariants: number; lowStockProducts: number; outOfStock: number;
    productsWithoutVariants: number;
  };
};
export const bdt = (value: number) => `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

export default function StockTable({ products, search, lowOnly = false }: {
  products: StockProduct[]; search: string; lowOnly?: boolean;
}) {
  const query = search.trim().toLowerCase();
  const visible = products.filter((p) =>
    (!lowOnly || p.lowStockVariants > 0) &&
    (!query || [p.name, p.slug, ...p.variants.map((v) => `${v.sku} ${v.variant_name}`)].some((s) => s.toLowerCase().includes(query)))
  );
  return (
    <div className="space-y-3">
      {visible.map((p) => (
        <details key={p.id} className="rounded-xl border border-slate-200 bg-white" open={lowOnly ? true : undefined}>
          <summary className="cursor-pointer px-5 py-4">
            <span className="font-semibold text-slate-900">{p.name}</span>
            <span className="ml-3 text-xs text-slate-500">{p.variants.length} variants · {p.totalQty} physical · {p.totalReserved} reserved · {p.totalAvailable} available</span>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
              <span>Selling value: {bdt(p.totalValue)}</span>
              <span>Production value: {bdt(p.totalCost)}{p.missingCostQty > 0 ? " (incomplete)" : ""}</span>
              {p.lowStockVariants > 0 && <span className="text-amber-700">{p.lowStockVariants} low-stock variants</span>}
              {p.missingCostVariants > 0 && <span className="text-amber-700">Cost missing: {p.missingCostVariants} variants / {p.missingCostQty} units</span>}
            </div>
          </summary>
          <div className="border-t border-slate-200">
            <Link href={`/products/${p.id}`} className="m-4 inline-block text-xs font-semibold text-teal-700 hover:underline">Edit product / variant prices →</Link>
            {p.variants.length === 0 ? <p className="px-5 pb-5 text-sm text-slate-500">No variants yet. Add variants to record this product&apos;s stock.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr>
                    {["Variant / SKU", "Physical", "Reserved", "Available", "Selling / unit", "Production / unit", "Selling value", "Production value"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}
                  </tr></thead>
                  <tbody>{p.variants.filter((v) => !lowOnly || v.low_stock).map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-4 py-3"><p>{v.variant_name || [v.attributes?.color, v.attributes?.size].filter(Boolean).join(" / ")}</p><p className="text-xs text-slate-500">{v.sku}</p></td>
                      <td className="px-4 py-3">{v.stock_qty}</td>
                      <td className="px-4 py-3">{v.reserved_qty}</td>
                      <td className={`px-4 py-3 font-semibold ${v.available_qty === 0 ? "text-rose-600" : v.low_stock ? "text-amber-700" : "text-emerald-700"}`}>{v.available_qty}</td>
                      <td className="px-4 py-3">{bdt(v.selling_price)}</td>
                      <td className="px-4 py-3">{v.production_price === null ? <span className="text-amber-700">Cost missing</span> : bdt(v.production_price)}</td>
                      <td className="px-4 py-3">{bdt(v.selling_value)}</td>
                      <td className="px-4 py-3">{v.production_value === null ? <span className="text-amber-700">Cost missing</span> : bdt(v.production_value)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      ))}
      {visible.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{lowOnly ? "No low-stock products match this filter." : "No products match this filter."}</p>}
    </div>
  );
}
