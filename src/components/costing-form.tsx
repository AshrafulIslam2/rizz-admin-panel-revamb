"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CatalogProduct,
  CostField,
  FactorySettings,
  ProductCosting,
  RetailSettings,
  createCosting,
  getCosting,
  getFactorySettings,
  getRetailSettings,
  listCatalogProducts,
  listCostFields,
  taka,
  updateCosting,
} from "@/lib/costing-api";
import {
  MODES_KEY,
  PAIRS_PER_DOZEN,
  calcCosting,
  calcEntry,
  chemicalUnitCost,
  fieldIsFactoryMonthly,
  fieldIsInActiveMode,
  num,
  sheetPairCost,
  type CostCalculatorKey,
  type CostEntry,
  type CostFieldLike,
} from "@/lib/costing-calc";

/**
 * The product costing form — one component for both Add and Edit.
 *
 * Two levels of tabs keep the admin from ever facing forty inputs at once:
 * the top row walks Product → Upper → Sole → Factory → Wholesale → Retail Cost
 * → Retail Price → Review, and inside Upper and Sole a second row splits the
 * work into the way a shoe is actually built (Materials, Foam & Cover, …).
 *
 * Nothing is saved per tab; every tab shares one state object and a single
 * save at the end (or the sticky Save in edit mode).
 */

type Props = { costingId?: string };

const TABS = [
  { id: "product", label: "Product Details" },
  { id: "upper", label: "Upper" },
  { id: "sole", label: "Sole" },
  { id: "factory", label: "Factory & Labour" },
  { id: "wholesale", label: "Wholesale Pricing" },
  { id: "retailcost", label: "Retail Cost" },
  { id: "retailprice", label: "Retail Pricing" },
  { id: "review", label: "Review & Save" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Sub-tab order inside each grouped section. */
const GROUP_ORDER: Record<string, string[]> = {
  UPPER: ["materials", "foam_cover", "accessories", "chemicals"],
  SOLE: ["insole", "midsole", "outsole", "bit", "tuffy", "chemicals"],
};

const GROUP_LABEL: Record<string, string> = {
  materials: "Materials",
  foam_cover: "Foam & Cover",
  accessories: "Accessories",
  chemicals: "Chemicals",
  insole: "Insole",
  midsole: "Midsole",
  outsole: "Outsole",
  bit: "Bit",
  tuffy: "Tuffy",
  other: "Other",
};

const MODE_LABEL: Record<string, string> = { HANDMADE: "Handmade", READYMADE: "Ready Made" };

const input =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400";
const lbl = "text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1";
const micro = "text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1";

const BASIS_NOTE: Record<CostField["basis"], string> = {
  PER_DOZEN: "per dozen",
  PER_PAIR: "per pair",
  PER_MONTH: "per month",
};

/** What each calculator is doing, spelled out under the row. */
const CALC_NOTE: Record<string, string> = {
  SQFT: "Used sq.ft × rate per sq.ft",
  UNIT: "Quantity × rate per unit",
  SHEET: "Sheet price ÷ pairs per sheet × 12",
  CHEMICAL: "Container price ÷ container size × used per dozen",
};

type Entry = Record<string, string>;
type Values = Record<string, unknown>;

function Stat({ label, value, strong = false, accent = false }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`tabular-nums ${strong ? "text-base font-bold" : "text-sm font-medium"} ${accent ? "text-teal-700" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * One labelled input. Declared at module scope on purpose — a component
 * defined inside the form body would be a new type on every keystroke, so
 * React would remount it and the box would lose focus mid-number.
 */
function Field({
  label, value, onChange, placeholder, type = "number", className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: "number" | "text"; className?: string;
}) {
  return (
    <div className={className}>
      <p className={micro}>{label}</p>
      <input
        type={type}
        {...(type === "number" ? { inputMode: "decimal" as const, step: "any" } : {})}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={input}
      />
    </div>
  );
}

/** Read-only derived figure sitting beside the inputs it comes from. */
function Derived({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className={micro}>{label}</p>
      <div
        className={`rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm tabular-nums text-teal-800 ${strong ? "font-bold" : "font-semibold"}`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * One cost line, rendered according to its calculator.
 *
 * A legacy row — a plain number saved before this field had a calculator — is
 * shown as-is with a prompt to re-enter it, and still counts towards the
 * total, so an upgrade never silently drops money from a costing.
 */
function CalcRow({
  field, raw, onPatch, onDirect,
}: {
  field: CostField;
  raw: unknown;
  onPatch: (patch: Entry) => void;
  onDirect: (v: string) => void;
}) {
  const calc = field.calculator ?? "DIRECT";
  const isObj = raw !== null && typeof raw === "object";
  const e = (isObj ? raw : {}) as Entry;
  const legacy = !isObj && calc !== "DIRECT" && raw !== undefined && raw !== null && String(raw) !== "";
  const total = calcEntry(raw as CostEntry, calc as CostCalculatorKey);
  const set = (k: string) => (v: string) => onPatch({ [k]: v });

  if (calc === "DIRECT") {
    return (
      <div className="grid gap-3 sm:grid-cols-[1fr_200px] sm:items-end">
        <div>
          <p className={lbl}>
            {field.label}
            <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">({BASIS_NOTE[field.basis]})</span>
          </p>
          {field.help_text && <p className="text-[11px] text-slate-400">{field.help_text}</p>}
        </div>
        <input
          type="number" inputMode="decimal" step="any"
          value={isObj ? (e.amount ?? "") : ((raw as string) ?? "")}
          onChange={(ev) => (isObj ? onPatch({ amount: ev.target.value }) : onDirect(ev.target.value))}
          placeholder="0" className={input}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{field.label}</p>
          <p className="text-[11px] text-slate-400">{field.help_text || CALC_NOTE[calc]}</p>
        </div>
        <p className="text-sm font-bold tabular-nums text-slate-900">
          {taka(total)}
          <span className="ml-1 text-[11px] font-normal text-slate-400">/ dozen</span>
        </p>
      </div>

      {legacy && (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Saved earlier as a flat amount of {taka(num(raw))}. It still counts — type the details below to replace it.
        </p>
      )}

      {calc === "SQFT" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Material Name" type="text" value={e.name ?? ""} onChange={set("name")} placeholder="e.g. Cow Nappa" className="lg:col-span-2" />
          <Field label="Thickness" type="text" value={e.thickness ?? ""} onChange={set("thickness")} placeholder="1.2 mm" />
          <Field label="Used (sq.ft)" value={e.used ?? ""} onChange={set("used")} placeholder="0" />
          <Field label="Rate ৳ / sq.ft" value={e.rate ?? ""} onChange={set("rate")} placeholder="0" />
        </div>
      )}

      {calc === "UNIT" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Material Name" type="text" value={e.name ?? ""} onChange={set("name")} placeholder="optional" className="lg:col-span-2" />
          <Field label="Quantity" value={e.qty ?? ""} onChange={set("qty")} placeholder="0" />
          <Field label="Unit" type="text" value={e.unit ?? ""} onChange={set("unit")} placeholder="pcs / goj" />
          <Field label="Rate ৳ / unit" value={e.rate ?? ""} onChange={set("rate")} placeholder="0" />
        </div>
      )}

      {calc === "SHEET" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Material Name" type="text" value={e.name ?? ""} onChange={set("name")} placeholder="optional" className="lg:col-span-2" />
          <Field label="Sheet Price ৳" value={e.sheet_price ?? ""} onChange={set("sheet_price")} placeholder="0" />
          <Field label="Pairs per Sheet" value={e.pairs_per_sheet ?? ""} onChange={set("pairs_per_sheet")} placeholder="0" />
          <Derived label="Cost / Pair" value={taka(sheetPairCost(raw as CostEntry))} />
        </div>
      )}

      {calc === "CHEMICAL" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Container Price ৳" value={e.container_price ?? ""} onChange={set("container_price")} placeholder="0" />
          <Field label="Container Size" value={e.container_qty ?? ""} onChange={set("container_qty")} placeholder="0" />
          <Field label="Unit" type="text" value={e.unit ?? ""} onChange={set("unit")} placeholder="kg / ltr" />
          <Derived label={`Cost / ${e.unit || "unit"}`} value={taka(chemicalUnitCost(raw as CostEntry))} />
          <Field label="Used per Dozen" value={e.used_per_dozen ?? ""} onChange={set("used_per_dozen")} placeholder="0" />
        </div>
      )}
    </div>
  );
}

export default function CostingForm({ costingId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(costingId);

  const [tab, setTab] = useState<TabId>("product");
  const [subTab, setSubTab] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<CostField[]>([]);
  const [retail, setRetail] = useState<RetailSettings | null>(null);
  const [factory, setFactory] = useState<FactorySettings | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Product identity
  const [product, setProduct] = useState({
    product_id: "", product_name: "", product_code: "", category: "", image_url: "",
    entry_date: new Date().toISOString().slice(0, 10),
  });

  /**
   * fieldKey -> what the admin typed. A DIRECT field holds a raw string; a
   * calculator field holds an object of raw strings. Strings (not numbers) so
   * an empty box stays empty instead of showing a stubborn 0.
   */
  const [values, setValues] = useState<Values>({});
  /** groupId -> "HANDMADE" | "READYMADE". */
  const [modes, setModes] = useState<Record<string, string>>({});
  /**
   * Pairs a month this design yields if the factory ran nothing else.
   * Set once as a standard — not an actual output figure re-entered monthly.
   */
  const [capacityPairs, setCapacityPairs] = useState("");
  /** What the pool stood at when this record was last saved, for comparison. */
  const [savedFactoryTotal, setSavedFactoryTotal] = useState<number | null>(null);
  const [wholesalePct, setWholesalePct] = useState("");
  const [retailPct, setRetailPct] = useState("");

  /**
   * Keys the admin actually touched in this session. On save only these are
   * sent, so an edit that changes one number cannot blank out the fields the
   * admin never opened — while a field deliberately set to 0 IS sent as 0.
   */
  const touched = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [f, r, fac, c] = await Promise.all([
        listCostFields(),
        getRetailSettings(),
        getFactorySettings(),
        listCatalogProducts().catch(() => []),
      ]);
      setFields(f.filter((x) => x.is_active && !x.is_archived));
      setRetail(r);
      setFactory(fac);
      setCatalog(c);

      if (costingId) {
        const rec: ProductCosting = await getCosting(costingId);
        setProduct({
          product_id: rec.product_id ?? "",
          product_name: rec.product_name ?? "",
          product_code: rec.product_code ?? "",
          category: rec.category ?? "",
          image_url: rec.image_url ?? "",
          entry_date: (rec.entry_date ?? "").slice(0, 10),
        });

        // Numbers come back from the API; the inputs want strings.
        const v: Values = {};
        for (const [k, val] of Object.entries(rec.values ?? {})) {
          if (k === MODES_KEY) {
            setModes((val ?? {}) as Record<string, string>);
            continue;
          }
          if (val !== null && typeof val === "object") {
            v[k] = Object.fromEntries(
              Object.entries(val as Record<string, unknown>).map(([kk, vv]) => [kk, vv === null || vv === undefined ? "" : String(vv)]),
            );
          } else {
            v[k] = String(val ?? "");
          }
        }
        setValues(v);
        setCapacityPairs(rec.standard_capacity_pairs ? String(rec.standard_capacity_pairs) : "");
        setSavedFactoryTotal(rec.factory_monthly_total ?? null);
        setWholesalePct(String(rec.wholesale_profit_pct ?? ""));
        setRetailPct(String(rec.retail_profit_pct ?? ""));
        touched.current = new Set();
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [costingId]);

  useEffect(() => { load(); }, [load]);

  /** The modes travel inside `values` under a reserved key, exactly as stored. */
  const valuesWithModes = useMemo(() => ({ ...values, [MODES_KEY]: modes }), [values, modes]);

  // ── Live totals (identical maths to the server) ──
  const result = useMemo(() => {
    return calcCosting({
      values: valuesWithModes,
      fields: fields as unknown as CostFieldLike[],
      standardCapacityPairs: num(capacityPairs),
      factoryMonthlyTotal: factory?.total_monthly ?? 0,
      wholesaleProfitPct: num(wholesalePct),
      retailProfitPct: num(retailPct),
      retailCommonCostPair: retail?.retail_common_cost_pair ?? 0,
    });
  }, [valuesWithModes, fields, capacityPairs, factory, wholesalePct, retailPct, retail]);

  const bySection = useMemo(() => {
    const m: Record<string, CostField[]> = {};
    for (const f of fields) (m[f.section] ||= []).push(f);
    return m;
  }, [fields]);

  /** section -> ordered sub-tab ids, with anything unrecognised appended. */
  const groupsOf = useCallback((section: string): string[] => {
    const present = new Set((bySection[section] ?? []).map((f) => f.group || "other"));
    const ordered = (GROUP_ORDER[section] ?? []).filter((g) => present.has(g));
    const extra = Array.from(present).filter((g) => !ordered.includes(g)).sort();
    return [...ordered, ...extra];
  }, [bySection]);

  /** Fields of one sub-tab, minus the rows the chosen mode hides. */
  const groupFields = useCallback((section: string, group: string): CostField[] =>
    (bySection[section] ?? [])
      .filter((f) => (f.group || "other") === group)
      .filter((f) => fieldIsInActiveMode(f as unknown as CostFieldLike, modes)),
  [bySection, modes]);

  /** A group is switchable when any of its fields is tagged with a mode. */
  const isModeGroup = useCallback((section: string, group: string): boolean =>
    (bySection[section] ?? []).some((f) => (f.group || "other") === group && !!f.mode),
  [bySection]);

  /** Per-dozen subtotal for one sub-tab. */
  const groupTotal = useCallback((section: string, group: string): number =>
    groupFields(section, group).reduce(
      (t, f) => t + calcEntry(values[f.key] as CostEntry, (f.calculator ?? "DIRECT") as CostCalculatorKey), 0),
  [groupFields, values]);

  function patchEntry(key: string, patch: Entry) {
    touched.current.add(key);
    setValues((s) => {
      const prev = s[key];
      const base = prev !== null && typeof prev === "object" ? (prev as Entry) : {};
      return { ...s, [key]: { ...base, ...patch } };
    });
    setMessage(null);
  }

  function setDirect(key: string, v: string) {
    touched.current.add(key);
    setValues((s) => ({ ...s, [key]: v }));
    setMessage(null);
  }

  function setMode(group: string, mode: string) {
    setModes((s) => ({ ...s, [group]: mode }));
    setMessage(null);
  }

  function pickCatalogProduct(id: string) {
    const p = catalog.find((x) => x.id === id);
    if (!p) { setProduct((s) => ({ ...s, product_id: "" })); return; }
    // Pull name/code/category/image across so the same details are never typed twice.
    setProduct((s) => ({
      ...s,
      product_id: p.id,
      product_name: p.name || s.product_name,
      product_code: p.sku || s.product_code,
      category: p.category || s.category,
      image_url: p.image || s.image_url,
    }));
  }

  /** Numbers go to the server as numbers; names and units stay text. */
  function serialize(f: CostField, raw: unknown): unknown {
    const calc = f.calculator ?? "DIRECT";
    if (calc === "DIRECT" || raw === null || typeof raw !== "object") return num(raw);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as Entry)) {
      out[k] = k === "name" || k === "unit" || k === "thickness" ? String(v ?? "") : num(v);
    }
    return out;
  }

  async function save() {
    if (!product.product_name.trim()) {
      setError("Product name is required (Product Details tab).");
      setTab("product");
      return;
    }
    setSaving(true); setError(null); setMessage(null);
    try {
      const byKey = new Map(fields.map((f) => [f.key, f]));
      const payloadValues: Values = {};
      // On an edit only touched keys go up, so untouched stored values
      // survive. The mode switches always travel — they are the frame the
      // rest of the numbers are read through.
      const keys = isEdit ? Array.from(touched.current) : Object.keys(values);
      for (const k of keys) {
        const f = byKey.get(k);
        if (!f || !(k in values)) continue;
        payloadValues[k] = serialize(f, values[k]);
      }
      payloadValues[MODES_KEY] = modes;

      const base = {
        ...product,
        product_id: product.product_id || null,
        values: payloadValues,
        standard_capacity_pairs: num(capacityPairs),
        wholesale_profit_pct: num(wholesalePct),
        retail_profit_pct: num(retailPct),
      };

      const saved = isEdit
        ? await updateCosting(costingId!, base)
        : await createCosting(base);

      setMessage(isEdit ? "Costing updated." : "Costing saved.");
      touched.current = new Set();
      if (!isEdit) router.push(`/wholesale/production/${saved.id}/edit`);
      else router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const go = (dir: -1 | 1) => {
    const next = TABS[tabIndex + dir];
    if (next) { setTab(next.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  // ── Grouped section (Upper / Sole) ──
  function groupedSection(section: CostField["section"], total: number) {
    const groups = groupsOf(section);
    if (groups.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No fields in this section yet. Add them in{" "}
          <a href="/wholesale/cost-fields" className="font-semibold text-teal-700 hover:underline">Cost Fields</a>.
        </div>
      );
    }
    const active = groups.includes(subTab[section]) ? subTab[section] : groups[0];
    const list = groupFields(section, active);
    const modeable = isModeGroup(section, active);
    const activeMode = modes[active] ?? "HANDMADE";

    return (
      <>
        {/* Sub-tabs, each carrying its own running subtotal */}
        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5">
          {groups.map((g) => {
            const on = g === active;
            const sub = groupTotal(section, g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSubTab((s) => ({ ...s, [section]: g }))}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {GROUP_LABEL[g] ?? g}
                {sub > 0 && (
                  <span className={`ml-1.5 tabular-nums font-bold ${on ? "text-teal-700" : "text-slate-400"}`}>
                    {taka(sub)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Handmade / Ready Made — hides the rows belonging to the other choice */}
        {modeable && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-semibold text-slate-600">
              {GROUP_LABEL[active] ?? active} is
            </span>
            <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
              {["HANDMADE", "READYMADE"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(active, m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeMode === m ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">
              The other option&apos;s rows are hidden and not costed — their numbers are kept if you switch back.
            </span>
          </div>
        )}

        <div className="space-y-3">
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nothing to fill in here for this option.
            </p>
          ) : (
            list.map((f) => (
              <CalcRow
                key={f.id}
                field={f}
                raw={values[f.key]}
                onPatch={(patch) => patchEntry(f.key, patch)}
                onDirect={(v) => setDirect(f.key, v)}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-xs font-semibold text-slate-600">
            {GROUP_LABEL[active] ?? active} subtotal / dozen
          </span>
          <span className="text-base font-bold tabular-nums text-slate-900">{taka(groupTotal(section, active))}</span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4">
          <span className="text-sm font-semibold text-teal-900">
            Total {section === "UPPER" ? "Upper" : "Sole"} Cost / Dozen
          </span>
          <span className="text-xl font-bold tabular-nums text-teal-800">{taka(total)}</span>
        </div>
      </>
    );
  }

  // ── Flat section (Factory / Retail product-specific) ──
  function flatSection(section: CostField["section"], perDozenTotal?: number) {
    // Monthly factory bills belong to Factory Cost Settings, not to a product,
    // so they never appear as inputs here.
    const list = (bySection[section] ?? []).filter(
      (f) => !fieldIsFactoryMonthly(f as unknown as CostFieldLike),
    );
    if (list.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No fields in this section yet. Add them in{" "}
          <a href="/wholesale/cost-fields" className="font-semibold text-teal-700 hover:underline">Cost Fields</a>.
        </div>
      );
    }
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => {
            const calc = f.calculator ?? "DIRECT";
            if (calc !== "DIRECT") {
              return (
                <div key={f.id} className="sm:col-span-2 lg:col-span-3">
                  <CalcRow field={f} raw={values[f.key]} onPatch={(p) => patchEntry(f.key, p)} onDirect={(v) => setDirect(f.key, v)} />
                </div>
              );
            }
            const raw = values[f.key];
            const isObj = raw !== null && typeof raw === "object";
            return (
              <div key={f.id}>
                <p className={lbl}>
                  {f.label}
                  <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">({BASIS_NOTE[f.basis]})</span>
                </p>
                <input
                  type="number" inputMode="decimal" step="any"
                  value={isObj ? ((raw as Entry).amount ?? "") : ((raw as string) ?? "")}
                  onChange={(e) => (isObj ? patchEntry(f.key, { amount: e.target.value }) : setDirect(f.key, e.target.value))}
                  placeholder="0" className={input}
                />
                {f.help_text && <p className="mt-1 text-[11px] text-slate-400">{f.help_text}</p>}
              </div>
            );
          })}
        </div>
        {perDozenTotal !== undefined && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4">
            <span className="text-sm font-semibold text-teal-900">
              Total Factory Cost / Dozen
              <span className="ml-1 font-normal text-teal-700">(allocated share + the above)</span>
            </span>
            <span className="text-xl font-bold tabular-nums text-teal-800">{taka(perDozenTotal)}</span>
          </div>
        )}
      </>
    );
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 rounded-2xl bg-slate-100" /><div className="h-96 rounded-2xl bg-slate-100" /></div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                tab === t.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              <span className="mr-1.5 opacity-50">{i + 1}</span>{t.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {message && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">

          {tab === "product" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Product Details</h2>
              <div>
                <p className={lbl}>Select Existing Product</p>
                <select value={product.product_id} onChange={(e) => pickCatalogProduct(e.target.value)} className={input}>
                  <option value="">— Not linked / manual entry —</option>
                  {catalog.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Selecting a product fills the name, code, category and image automatically.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className={lbl}>Product Name *</p><input value={product.product_name} onChange={(e) => setProduct((s) => ({ ...s, product_name: e.target.value }))} className={input} /></div>
                <div><p className={lbl}>Product / Style Code</p><input value={product.product_code} onChange={(e) => setProduct((s) => ({ ...s, product_code: e.target.value }))} className={input} /></div>
                <div><p className={lbl}>Category</p><input value={product.category} onChange={(e) => setProduct((s) => ({ ...s, category: e.target.value }))} className={input} /></div>
                <div><p className={lbl}>Entry Date</p><input type="date" value={product.entry_date} onChange={(e) => setProduct((s) => ({ ...s, entry_date: e.target.value }))} className={input} /></div>
                <div className="sm:col-span-2"><p className={lbl}>Product Image URL</p><input value={product.image_url} onChange={(e) => setProduct((s) => ({ ...s, image_url: e.target.value }))} placeholder="https://…" className={input} /></div>
              </div>
              {product.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.product_name} className="h-28 w-28 rounded-xl border border-slate-200 object-cover" />
              )}
            </div>
          )}

          {tab === "upper" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Upper Section</h2>
              <p className="text-xs text-slate-500">
                Everything here is costed per dozen (1 dozen = {PAIRS_PER_DOZEN} pairs). Leave a box blank for 0 —
                each row shows its own total as you type.
              </p>
              {groupedSection("UPPER", result.upperCostDozen)}
            </div>
          )}

          {tab === "sole" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Sole Section</h2>
              <p className="text-xs text-slate-500">
                Insole, Outsole and Bit each switch between handmade materials and a ready-made price.
              </p>
              {groupedSection("SOLE", result.soleCostDozen)}
            </div>
          )}

          {tab === "factory" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Factory &amp; Labour</h2>

              {/* The one number that is genuinely per-design */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">Standard Production Capacity</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  If the factory made nothing but this design for a whole month, how many pairs would come out?
                  Set it once — it only changes when the design or the line&apos;s efficiency does.
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-4">
                  <div className="w-44">
                    <p className={micro}>Standard Capacity</p>
                    <div className="flex items-center gap-2">
                      <input type="number" inputMode="decimal" step="any" value={capacityPairs}
                        onChange={(e) => { setCapacityPairs(e.target.value); setMessage(null); }}
                        placeholder="600" className={input} />
                      <span className="whitespace-nowrap text-xs font-medium text-slate-500">pairs / month</span>
                    </div>
                  </div>
                  <Derived label="Auto" value={`${result.standardCapacityDozen.toLocaleString()} dozen / month`} />
                </div>
                {result.standardCapacityPairs <= 0 && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    Until a capacity is set, no factory cost is charged at all — better a visible zero than an invented number.
                  </p>
                )}
              </div>

              {/* The pool, entered once and shared out */}
              <details className="rounded-2xl border border-slate-200 bg-slate-50 p-5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-900">Monthly Factory Expenses</span>
                  <span className="text-base font-bold tabular-nums text-slate-900">{taka(factory?.total_monthly ?? 0)}</span>
                </summary>
                <div className="mt-4 space-y-1">
                  {(bySection.FACTORY ?? []).filter((f) => fieldIsFactoryMonthly(f as unknown as CostFieldLike)).map((f) => (
                    <Stat key={f.id} label={f.label} value={taka(factory?.monthly?.[f.key] ?? 0)} />
                  ))}
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <Stat label="Total Monthly Factory Cost" value={taka(factory?.total_monthly ?? 0)} strong />
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Shared by every product — edit them in{" "}
                  <a href="/wholesale/factory-settings" className="font-semibold text-teal-700 hover:underline">Factory Cost Settings</a>.
                  Change the salary bill once and every costing follows on its next save.
                </p>
              </details>

              {/* The allocation, shown as arithmetic rather than a bare figure */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">Allocated to this design</p>
                <p className="mt-1 text-xs tabular-nums text-teal-900">
                  {taka(result.factoryMonthlyTotal)} ÷ {result.standardCapacityDozen.toLocaleString()} dozen
                </p>
                <div className="mt-3 border-t border-teal-300 pt-3">
                  <Stat label="Factory &amp; Labour Cost / Dozen" value={taka(result.factoryAllocatedDozen)} strong accent />
                  <Stat label="Factory &amp; Labour Cost / Pair" value={taka(result.factoryAllocatedPair)} strong accent />
                </div>
                <p className="mt-2 text-[11px] text-teal-800">
                  A slower design yields fewer pairs from the same month of wages, so it carries more of them — which is exactly what it costs.
                </p>
              </div>

              {savedFactoryTotal !== null && savedFactoryTotal !== (factory?.total_monthly ?? 0) && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  This costing was last saved against a monthly pool of {taka(savedFactoryTotal)}. Saving now will reprice it
                  against the current {taka(factory?.total_monthly ?? 0)}.
                </p>
              )}

              {/* Product's own factory costs */}
              <h3 className="text-sm font-semibold text-slate-800">This Product&apos;s Own Factory Costs (per dozen)</h3>
              {flatSection("FACTORY", result.factoryCostDozen)}

              <div className="mt-6 rounded-2xl border border-slate-900 bg-slate-900 px-5 py-4 text-white">
                <div className="flex items-center justify-between"><span className="text-sm">Upper + Sole + Factory</span><span className="text-sm tabular-nums opacity-75">{taka(result.upperCostDozen)} + {taka(result.soleCostDozen)} + {taka(result.factoryCostDozen)}</span></div>
                <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-3"><span className="font-semibold">Production Cost / Dozen</span><span className="text-xl font-bold tabular-nums">{taka(result.productionCostDozen)}</span></div>
                <div className="mt-1 flex items-center justify-between"><span className="text-sm opacity-75">÷ {PAIRS_PER_DOZEN} = Production Cost / Pair</span><span className="text-lg font-bold tabular-nums text-teal-300">{taka(result.productionCostPair)}</span></div>
              </div>
            </div>
          )}

          {tab === "wholesale" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Wholesale Pricing</h2>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <Stat label="Production Cost / Dozen" value={taka(result.productionCostDozen)} />
                <Stat label="Production Cost / Pair" value={taka(result.productionCostPair)} strong />
              </div>
              <div className="max-w-xs">
                <p className={lbl}>Wholesale Profit %</p>
                <input type="number" inputMode="decimal" step="any" value={wholesalePct}
                  onChange={(e) => { setWholesalePct(e.target.value); setMessage(null); }} placeholder="20" className={input} />
              </div>
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                <Stat label="Wholesale Profit / Pair" value={taka(result.wholesaleProfitPair)} />
                <Stat label="Wholesale Selling Price / Pair" value={taka(result.wholesalePricePair)} strong accent />
                <Stat label="Wholesale Selling Price / Dozen" value={taka(result.wholesalePriceDozen)} accent />
              </div>
              <p className="text-xs text-slate-500">Wholesale is priced straight off the factory cost and stays completely separate from retail.</p>
            </div>
          )}

          {tab === "retailcost" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Retail Cost</h2>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <Stat label="Production Cost / Pair" value={taka(result.productionCostPair)} />
                <Stat label="Retail Common Cost / Pair" value={taka(result.retailCommonCostPair)} />
                <p className="mt-2 text-[11px] text-slate-500">
                  Common cost comes from shop-wide monthly expenses ÷ expected monthly sales, set in{" "}
                  <a href="/wholesale/retail-settings" className="font-semibold text-teal-700 hover:underline">Retail Cost Settings</a>
                  {retail ? ` (${taka(retail.total_monthly)}/month ÷ ${retail.expected_monthly_sales_pairs || 0} pairs)` : ""}.
                </p>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Product-Specific Retail Cost (per pair)</h3>
              {flatSection("RETAIL_PRODUCT")}
              <div className="rounded-2xl border border-slate-900 bg-slate-900 px-5 py-4 text-white">
                <div className="flex items-center justify-between text-sm opacity-75"><span>{taka(result.productionCostPair)} + {taka(result.retailCommonCostPair)} + {taka(result.retailProductCostPair)}</span></div>
                <div className="mt-2 flex items-center justify-between border-t border-white/20 pt-3"><span className="font-semibold">Retail Cost / Pair</span><span className="text-xl font-bold tabular-nums text-teal-300">{taka(result.retailCostPair)}</span></div>
              </div>
            </div>
          )}

          {tab === "retailprice" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Retail Pricing</h2>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <Stat label="Production Cost / Pair" value={taka(result.productionCostPair)} />
                <Stat label="Retail Common Cost / Pair" value={taka(result.retailCommonCostPair)} />
                <Stat label="Product-Specific Retail Cost" value={taka(result.retailProductCostPair)} />
                <Stat label="Retail Cost / Pair" value={taka(result.retailCostPair)} strong />
              </div>
              <div className="max-w-xs">
                <p className={lbl}>Retail Profit %</p>
                <input type="number" inputMode="decimal" step="any" value={retailPct}
                  onChange={(e) => { setRetailPct(e.target.value); setMessage(null); }} placeholder="50" className={input} />
              </div>
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                <Stat label="Retail Profit / Pair" value={taka(result.retailProfitPair)} />
                <Stat label="Final Retail Selling Price / Pair" value={taka(result.retailPricePair)} strong accent />
                <Stat label="Retail Selling Price / Dozen" value={taka(result.retailPriceDozen)} accent />
              </div>
              <p className="text-xs text-amber-700">Wholesale profit is deliberately excluded here — wholesale and retail are two separate channels.</p>
            </div>
          )}

          {tab === "review" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Review &amp; Save</h2>
              <div className="flex items-center gap-4">
                {product.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.product_name} className="h-20 w-20 rounded-xl border border-slate-200 object-cover" />
                )}
                <div>
                  <p className="text-lg font-bold text-slate-900">{product.product_name || "—"}</p>
                  <p className="text-xs text-slate-500">{product.product_code || "no code"} · {product.category || "no category"}</p>
                </div>
              </div>

              {/* Where the Upper and Sole money actually went */}
              <div className="grid gap-4 sm:grid-cols-2">
                {(["UPPER", "SOLE"] as const).map((sec) => (
                  <div key={sec} className="rounded-2xl border border-slate-200 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      {sec === "UPPER" ? "Upper breakdown" : "Sole breakdown"}
                    </p>
                    {groupsOf(sec).map((g) => (
                      <Stat
                        key={g}
                        label={`${GROUP_LABEL[g] ?? g}${isModeGroup(sec, g) ? ` · ${MODE_LABEL[modes[g] ?? "HANDMADE"]}` : ""}`}
                        value={taka(groupTotal(sec, g))}
                      />
                    ))}
                    <div className="mt-1 border-t border-slate-100 pt-1">
                      <Stat label="Total / Dozen" value={taka(sec === "UPPER" ? result.upperCostDozen : result.soleCostDozen)} strong />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Production</p>
                  <Stat label="Upper / Dozen" value={taka(result.upperCostDozen)} />
                  <Stat label="Sole / Dozen" value={taka(result.soleCostDozen)} />
                  <Stat label="Factory / Dozen" value={taka(result.factoryCostDozen)} />
                  <Stat label="Cost / Dozen" value={taka(result.productionCostDozen)} strong />
                  <Stat label="Cost / Pair" value={taka(result.productionCostPair)} strong />
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Wholesale</p>
                  <Stat label="Profit %" value={`${num(wholesalePct)}%`} />
                  <Stat label="Profit / Pair" value={taka(result.wholesaleProfitPair)} />
                  <Stat label="Price / Pair" value={taka(result.wholesalePricePair)} strong accent />
                  <Stat label="Price / Dozen" value={taka(result.wholesalePriceDozen)} />
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Retail</p>
                  <Stat label="Common / Pair" value={taka(result.retailCommonCostPair)} />
                  <Stat label="Product-Specific" value={taka(result.retailProductCostPair)} />
                  <Stat label="Retail Cost / Pair" value={taka(result.retailCostPair)} strong />
                  <Stat label="Profit %" value={`${num(retailPct)}%`} />
                  <Stat label="Retail Price / Pair" value={taka(result.retailPricePair)} strong accent />
                </div>
              </div>

              <button type="button" onClick={save} disabled={saving}
                className="w-full rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50">
                {saving ? "Saving…" : isEdit ? "Update Product Costing" : "Save Product Costing"}
              </button>
            </div>
          )}

          {/* Step navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
            <button type="button" onClick={() => go(-1)} disabled={tabIndex === 0}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-30">
              ← Previous
            </button>
            {tabIndex < TABS.length - 1 ? (
              <button type="button" onClick={() => go(1)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Next → {TABS[tabIndex + 1].label}
              </button>
            ) : <span />}
          </div>
        </div>
      </div>

      {/* Sticky live summary — desktop rail, collapsible on mobile */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <details open className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] xl:[&>summary]:hidden">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">View Cost Summary</summary>
          <div className="mt-3 xl:mt-0">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Live Summary</p>
            <Stat label="Upper / Dozen" value={taka(result.upperCostDozen)} />
            <Stat label="Sole / Dozen" value={taka(result.soleCostDozen)} />
            <Stat label="Factory / Dozen" value={taka(result.factoryCostDozen)} />
            <div className="my-2 border-t border-slate-100" />
            <Stat label="Production Cost / Pair" value={taka(result.productionCostPair)} strong />
            <div className="my-2 border-t border-slate-100" />
            <Stat label="Wholesale Price / Pair" value={taka(result.wholesalePricePair)} strong accent />
            <div className="my-2 border-t border-slate-100" />
            <Stat label="Retail Cost / Pair" value={taka(result.retailCostPair)} />
            <Stat label="Retail Price / Pair" value={taka(result.retailPricePair)} strong accent />

            {isEdit && (
              <button type="button" onClick={save} disabled={saving}
                className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            )}
          </div>
        </details>
      </aside>
    </div>
  );
}
