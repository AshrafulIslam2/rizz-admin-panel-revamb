"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CostField,
  FactorySettings,
  ProductCosting,
  getCosting,
  getFactorySettings,
  listCostFields,
  taka,
} from "@/lib/costing-api";
import {
  FINISH_MAN_FIELD_KEY,
  PAIRS_PER_DOZEN,
  PRODUCT_LINE_LABELS,
  calcCosting,
  calcEntry,
  calcFactoryLinePool,
  fieldIsFactoryMonthly,
  fieldIsInActiveMode,
  finishManRate,
  getLine,
  getModes,
  inferProductLine,
  isBlankEntry,
  num,
  type CostCalculatorKey,
  type CostEntry,
  type CostFieldLike,
} from "@/lib/costing-calc";

const GROUP_LABEL: Record<string, string> = {
  materials: "Materials", foam_cover: "Foam & Cover", accessories: "Accessories", chemicals: "Chemicals",
  insole: "Insole", midsole: "Midsole", outsole: "Outsole", bit: "Bit", tuffy: "Tuffy", finishing: "Finishing",
};

type Line = { key: string; label: string; group: string; detail: string; perDozen: number; isDefault: boolean };

/** How a row's amount was worked out, in words. */
function describe(entry: unknown, calc: string): string {
  if (entry === null || entry === undefined || typeof entry !== "object") return "";
  const e = entry as Record<string, unknown>;
  const name = e.name ? `${e.name} · ` : "";
  const n = (k: string) => num(e[k]).toLocaleString();
  switch (calc) {
    case "SQFT": return `${name}${n("used")} sq.ft × ৳${n("rate")}`;
    case "UNIT": return `${name}${n("qty") !== "0" ? n("qty") : n("used")} ${e.unit ?? ""} × ৳${n("rate")}`;
    case "SHEET": return `${name}৳${n("sheet_price")} ÷ ${n("pairs_per_sheet")} pairs × 12`;
    case "CHEMICAL": return `${name}৳${n("container_price")} ÷ ${n("container_qty")} × ${n("used_per_dozen")} used`;
    default: return name.replace(/ · $/, "");
  }
}

function Row({ label, value, strong = false, accent = false, muted = false }: { label: string; value: string; strong?: boolean; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className={`text-xs ${muted ? "text-slate-400" : "text-slate-600"}`}>{label}</span>
      <span className={`tabular-nums ${strong ? "text-base font-bold" : "text-sm font-medium"} ${accent ? "text-teal-700" : "text-slate-900"}`}>{value}</span>
    </div>
  );
}

/**
 * Read-only view of one production costing.
 *
 * Headline numbers are the ones stored at the last save. The itemised rows are
 * recomputed from the saved inputs with today's settings; if that disagrees with
 * the stored total (a salary or rate changed since), the page says so.
 */
export default function ViewProductCostingPage() {
  const { id } = useParams<{ id: string }>();
  const [rec, setRec] = useState<ProductCosting | null>(null);
  const [fields, setFields] = useState<CostField[]>([]);
  const [factory, setFactory] = useState<FactorySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getCosting(id), listCostFields(), getFactorySettings()])
      .then(([r, f, fac]) => { setRec(r); setFields(f.filter((x) => x.is_active && !x.is_archived)); setFactory(fac); })
      .catch((e) => setError(e?.message ?? "Failed to load"));
  }, [id]);

  const view = useMemo(() => {
    if (!rec || !factory) return null;
    const values = rec.values ?? {};
    const modes = getModes(values);
    const line = getLine(values) ?? inferProductLine(rec.category, rec.product_name);
    const cf = fields as unknown as CostFieldLike[];
    const pool = calcFactoryLinePool(factory.monthly, cf, factory.employees, line);
    const defaults: Record<string, number> = { [FINISH_MAN_FIELD_KEY]: finishManRate(line, factory.finish_man_rates) };
    const result = calcCosting({
      values, fields: cf,
      standardCapacityPairs: rec.standard_capacity_pairs,
      factoryMonthlyTotal: pool.total,
      defaultEntries: defaults,
      wholesaleProfitPct: rec.wholesale_profit_pct,
      retailProfitPct: rec.retail_profit_pct,
      retailCommonCostPair: rec.retail_common_cost_pair,
    });

    const sections: Record<string, Line[]> = { UPPER: [], SOLE: [], FINISH: [], FACTORY: [], RETAIL_PRODUCT: [] };
    for (const f of fields) {
      if (!(f.section in sections)) continue;
      const fl = f as unknown as CostFieldLike;
      if (!fieldIsInActiveMode(fl, modes) || fieldIsFactoryMonthly(fl)) continue;
      const calc = f.calculator ?? "DIRECT";
      let amount = calcEntry(values[f.key] as CostEntry, calc as CostCalculatorKey);
      let isDefault = false;
      if (amount === 0 && isBlankEntry(values[f.key]) && defaults[f.key]) { amount = defaults[f.key]; isDefault = true; }
      if (amount === 0) continue;
      // SHEET already yields per dozen; PER_PAIR fields are retail extras shown per pair.
      const perDozen = f.basis === "PER_PAIR" && calc !== "SHEET" ? amount * PAIRS_PER_DOZEN : amount;
      sections[f.section].push({ key: f.key, label: f.label, group: f.group ?? "", detail: describe(values[f.key], calc), perDozen, isDefault });
    }
    const drift = Math.abs(result.productionCostPair - rec.production_cost_pair) > 0.01;
    return { line, pool, result, sections, drift };
  }, [rec, fields, factory]);

  if (error) {
    return <div className="p-6"><p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p></div>;
  }
  if (!rec || !view) {
    return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto h-96 max-w-5xl animate-pulse rounded-[28px] bg-slate-100" /></div>;
  }

  const { line, pool, result, sections, drift } = view;

  const sectionCard = (title: string, key: string, total: number) => {
    const items = sections[key];
    const groups = Array.from(new Set(items.map((i) => i.group)));
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <span className="text-sm font-bold tabular-nums text-slate-900">{taka(total)} <span className="text-xs font-normal text-slate-400">/ dozen</span></span>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">Nothing entered.</p>
        ) : (
          groups.map((g) => (
            <div key={g || "none"} className="mt-2">
              {g && <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{GROUP_LABEL[g] ?? g}</p>}
              {items.filter((i) => i.group === g).map((i) => (
                <div key={i.key} className="flex items-baseline justify-between gap-4 border-b border-slate-50 py-1.5 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{i.label}{i.isDefault && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">line rate</span>}</p>
                    {i.detail && <p className="truncate text-[11px] text-slate-400">{i.detail}</p>}
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-slate-900">{taka(i.perDozen)}</span>
                </div>
              ))}
            </div>
          ))
        )}
        <p className="mt-2 text-right text-[11px] text-slate-400">= {taka(total / PAIRS_PER_DOZEN)} per pair</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center gap-4 rounded-[32px] bg-slate-950 px-6 py-5 text-white">
          {rec.image_url
            ? <img src={rec.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
            : <div className="h-16 w-16 rounded-xl bg-slate-800" />}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Wholesale · Production</p>
            <h1 className="mt-1 truncate text-2xl font-semibold">{rec.product_name}</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {rec.product_code || "no code"} · {rec.category || "no category"} · {line ? PRODUCT_LINE_LABELS[line] : "No line"} · saved {new Date(rec.updated_at).toLocaleDateString("en-GB")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/wholesale/production" className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">Back</Link>
            <Link href={`/wholesale/production/${rec.id}/edit`} className="rounded-full bg-teal-500 px-5 py-2 text-xs font-bold text-white hover:bg-teal-400">Edit</Link>
          </div>
        </header>

        {/* Headline: stored figures */}
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Production / pair", value: rec.production_cost_pair, sub: `${taka(rec.production_cost_dozen)} / dozen` },
            { label: "Wholesale / pair", value: rec.wholesale_price_pair, sub: `${rec.wholesale_profit_pct}% profit · ${taka(rec.wholesale_price_dozen)} / dozen`, accent: true },
            { label: "Retail cost / pair", value: rec.retail_cost_pair, sub: "production + shop costs" },
            { label: "Retail price / pair", value: rec.retail_price_pair, sub: `${rec.retail_profit_pct}% profit`, accent: true },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${c.accent ? "text-teal-700" : "text-slate-900"}`}>{taka(c.value)}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
            </div>
          ))}
        </div>

        {drift && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Settings have changed since this was saved — at today&apos;s rates production would be {taka(result.productionCostPair)} a pair
            instead of {taka(rec.production_cost_pair)}. Open <Link href={`/wholesale/production/${rec.id}/edit`} className="font-semibold underline">Edit</Link> and save to update it.
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {sectionCard("Upper", "UPPER", result.upperCostDozen)}
          {sectionCard("Sole", "SOLE", result.soleCostDozen)}
          {sectionCard("Finish", "FINISH", result.finishCostDozen)}

          {/* Factory & labour */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-bold text-slate-900">Factory &amp; Labour</h2>
              <span className="text-sm font-bold tabular-nums text-slate-900">{taka(result.factoryCostDozen)} <span className="text-xs font-normal text-slate-400">/ dozen</span></span>
            </div>
            <Row label={`Wages${pool.usesEmployees ? ` — ${pool.labourHeadcount} of ${pool.totalHeadcount} staff` : ""}`} value={taka(pool.labour)} />
            <Row label="Snacks / welfare" value={taka(pool.welfare)} />
            <Row label="Rent, electricity and other bills" value={taka(pool.shared)} />
            <Row label="Monthly pool" value={taka(pool.total)} strong />
            <Row label={`÷ capacity ${result.standardCapacityPairs.toLocaleString()} pairs (${result.standardCapacityDozen} dozen)`} value={`${taka(result.factoryAllocatedDozen)} / dozen`} muted />
            {sections.FACTORY.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                {sections.FACTORY.map((i) => <Row key={i.key} label={i.label} value={taka(i.perDozen)} />)}
              </div>
            )}
          </div>
        </div>

        {/* How the price is built */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white">
          <div className="flex justify-between text-sm opacity-80">
            <span>Upper + Sole + Finish + Factory</span>
            <span className="tabular-nums">{taka(result.upperCostDozen)} + {taka(result.soleCostDozen)} + {taka(result.finishCostDozen)} + {taka(result.factoryCostDozen)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/20 pt-2 font-semibold">
            <span>Production cost / dozen</span><span className="tabular-nums">{taka(result.productionCostDozen)}</span>
          </div>
          <div className="flex justify-between text-teal-300">
            <span>÷ 12 = Production cost / pair</span><span className="font-bold tabular-nums">{taka(result.productionCostPair)}</span>
          </div>
          <div className="mt-3 grid gap-4 border-t border-white/20 pt-3 sm:grid-cols-2">
            <div className="text-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Wholesale</p>
              <div className="flex justify-between"><span className="opacity-80">+ {result.wholesaleProfitPct}% profit</span><span className="tabular-nums">{taka(result.wholesaleProfitPair)}</span></div>
              <div className="flex justify-between font-bold text-teal-300"><span>Price / pair</span><span className="tabular-nums">{taka(result.wholesalePricePair)}</span></div>
            </div>
            <div className="text-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Retail</p>
              <div className="flex justify-between"><span className="opacity-80">+ shop costs</span><span className="tabular-nums">{taka(result.retailCommonCostPair)}</span></div>
              <div className="flex justify-between"><span className="opacity-80">+ box, bag &amp; extras</span><span className="tabular-nums">{taka(result.retailProductCostPair)}</span></div>
              <div className="flex justify-between"><span className="opacity-80">+ {result.retailProfitPct}% profit</span><span className="tabular-nums">{taka(result.retailProfitPair)}</span></div>
              <div className="flex justify-between font-bold text-teal-300"><span>Price / pair</span><span className="tabular-nums">{taka(result.retailPricePair)}</span></div>
            </div>
          </div>
        </div>

        <p className="pb-6 text-center text-[11px] text-slate-400">
          Capacity {num(rec.standard_capacity_pairs).toLocaleString()} pairs / month · costed against a {taka(pool.total)} monthly pool.
        </p>
      </div>
    </div>
  );
}
