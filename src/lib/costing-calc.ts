/**
 * Product costing engine — wholesale and retail.
 *
 * MIRROR of the backend's src/costing/costing.calc.ts. Kept byte-identical
 * (below this header) so the live summary in the form shows exactly what the
 * server will store. If you change one, change the other. The
 * server still recomputes on save, so the stored figures are authoritative and
 * a stale browser tab can never persist wrong numbers.
 *
 * The one rule that shapes everything here: wholesale profit NEVER reaches the
 * retail side. Both channels branch off the same factory production cost and
 * are then priced independently.
 *
 *   Upper + Sole + Factory            -> Production Cost / Dozen
 *   Production Cost / Dozen ÷ 12      -> Production Cost / Pair
 *
 *   Production Cost / Pair + Wholesale Profit
 *                                     -> Wholesale Selling Price / Pair
 *
 *   Production Cost / Pair
 *     + Retail Common Cost / Pair
 *     + Product-Specific Retail Cost  -> Retail Cost / Pair
 *   Retail Cost / Pair + Retail Profit
 *                                     -> Retail Selling Price / Pair
 */

export const PAIRS_PER_DOZEN = 12;

export type CostSectionKey =
  | 'UPPER'
  | 'SOLE'
  | 'FACTORY'
  | 'RETAIL_COMMON'
  | 'RETAIL_PRODUCT';

export type CostBasisKey = 'PER_DOZEN' | 'PER_PAIR' | 'PER_MONTH';

export type CostCalculatorKey = 'DIRECT' | 'SQFT' | 'UNIT' | 'SHEET' | 'CHEMICAL';

export type CostFieldLike = {
  key: string;
  section: CostSectionKey;
  basis: CostBasisKey;
  calculator?: CostCalculatorKey;
  group?: string | null;
  mode?: string | null;
  is_active?: boolean;
  is_archived?: boolean;
};

/**
 * What the admin typed for one field.
 *
 * A plain number is the original shape and still works — DIRECT fields and
 * every pre-existing saved record use it. Structured calculators store an
 * object of their own inputs instead.
 */
export type CostEntry =
  | number
  | string
  | null
  | undefined
  | {
      /** Free-text material name; never enters the arithmetic. */
      name?: string;
      thickness?: unknown;
      unit?: string;
      /** DIRECT */
      amount?: unknown;
      /** SQFT: used sq.ft x rate | UNIT: qty x rate */
      used?: unknown;
      qty?: unknown;
      rate?: unknown;
      /** SHEET */
      sheet_price?: unknown;
      pairs_per_sheet?: unknown;
      /** CHEMICAL */
      container_price?: unknown;
      container_qty?: unknown;
      used_per_dozen?: unknown;
    };

export type CostingInput = {
  /** fieldKey -> amount exactly as the admin typed it. */
  values: Record<string, unknown>;
  fields: CostFieldLike[];
  /**
   * Pairs this design yields in a month if the factory ran nothing else.
   *
   * This is the divisor for every monthly bill, and it is deliberately
   * per-product: a fiddly design ties up the same workers for fewer pairs, so
   * it must carry a bigger share of the same salary bill. Set once as a
   * standard, not re-entered each month.
   */
  standardCapacityPairs?: number;
  /** Sum of the shop-wide monthly factory expenses (see calcFactoryMonthlyTotal). */
  factoryMonthlyTotal?: number;
  wholesaleProfitPct?: number;
  retailProfitPct?: number;
  /** Comes from the shop-wide retail settings (see calcRetailCommonCostPerPair). */
  retailCommonCostPair?: number;
};

export type CostingResult = {
  upperCostDozen: number;
  soleCostDozen: number;

  standardCapacityPairs: number;
  standardCapacityDozen: number;
  /** The shop-wide monthly pool this product was costed against. */
  factoryMonthlyTotal: number;
  /** This product's share of that pool. */
  factoryAllocatedDozen: number;
  factoryAllocatedPair: number;
  /** Factory costs entered against this product itself (packaging, transport). */
  factoryProductCostDozen: number;
  /** Allocated share + product-specific factory costs. */
  factoryCostDozen: number;
  productionCostDozen: number;
  productionCostPair: number;

  wholesaleProfitPct: number;
  wholesaleProfitPair: number;
  wholesalePricePair: number;
  wholesalePriceDozen: number;

  retailCommonCostPair: number;
  retailProductCostPair: number;
  retailCostPair: number;
  retailProfitPct: number;
  retailProfitPair: number;
  retailPricePair: number;
  retailPriceDozen: number;
};

/** Blank, null, or anything unparseable counts as 0 — a blank field is not an error. */
export function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimals without float dust (0.1+0.2 style artefacts). */
export function money(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function usable(f: CostFieldLike): boolean {
  return f.is_active !== false && f.is_archived !== true;
}

/**
 * Work out one line item's cost from whatever the admin entered.
 *
 * Returns a figure on the field's own basis (per dozen for production
 * sections, per pair for retail extras) — EXCEPT SHEET, which is defined by
 * the trade as a per-pair price and is multiplied to a dozen here so every
 * production calculator speaks the same unit.
 *
 * A plain number is honoured for any calculator, so an old saved record or a
 * DIRECT field keeps working untouched.
 */
export function calcEntry(entry: CostEntry, calculator: CostCalculatorKey = 'DIRECT'): number {
  if (entry === null || entry === undefined) return 0;
  if (typeof entry === 'number' || typeof entry === 'string') return num(entry);

  switch (calculator) {
    case 'SQFT':
      // used sq.ft x cost per sq.ft   →  12 sq.ft x ৳10 = ৳120 / dozen
      return num(entry.used) * num(entry.rate);

    case 'UNIT':
      // quantity x cost per unit      →  2 goj x ৳4 = ৳8 / dozen
      return num(entry.qty ?? entry.used) * num(entry.rate);

    case 'SHEET': {
      // sheet price ÷ pairs per sheet = per pair, then x12 for the dozen.
      // Dividing by zero pairs would be meaningless, so it yields 0 rather
      // than Infinity while the admin is still filling the row in.
      const pairs = num(entry.pairs_per_sheet);
      if (pairs <= 0) return 0;
      return (num(entry.sheet_price) / pairs) * PAIRS_PER_DOZEN;
    }

    case 'CHEMICAL': {
      // container price ÷ container weight = unit cost, x usage per dozen.
      // Works identically whether the container is measured in KG or litres.
      const containerQty = num(entry.container_qty);
      if (containerQty <= 0) return 0;
      const unitCost = num(entry.container_price) / containerQty;
      return unitCost * num(entry.used_per_dozen);
    }

    case 'DIRECT':
    default:
      return num(entry.amount);
  }
}

/** Per-unit cost of a chemical container — shown read-only beside the inputs. */
export function chemicalUnitCost(entry: CostEntry): number {
  if (!entry || typeof entry === 'number' || typeof entry === 'string') return 0;
  const qty = num(entry.container_qty);
  return qty > 0 ? money(num(entry.container_price) / qty) : 0;
}

/** Per-pair cost of a sheet-based item — shown read-only beside the inputs. */
export function sheetPairCost(entry: CostEntry): number {
  if (!entry || typeof entry === 'number' || typeof entry === 'string') return 0;
  const pairs = num(entry.pairs_per_sheet);
  return pairs > 0 ? money(num(entry.sheet_price) / pairs) : 0;
}

/**
 * Which mode a group is switched to, e.g. modes.insole === 'READYMADE'.
 * Stored alongside the amounts under a reserved key so it travels with the
 * record without needing its own column.
 */
export const MODES_KEY = '__modes';

export function getModes(values: Record<string, unknown>): Record<string, string> {
  const raw = values?.[MODES_KEY];
  return raw && typeof raw === 'object' ? (raw as Record<string, string>) : {};
}

/**
 * A field counts only when its group is in the matching mode.
 * Ready-made insole values stay stored but stop being charged the moment the
 * group is switched to handmade, so toggling back and forth never loses work.
 */
export function fieldIsInActiveMode(f: CostFieldLike, modes: Record<string, string>): boolean {
  if (!f.mode) return true;
  const groupMode = f.group ? modes[f.group] : undefined;
  // With no explicit choice the first mode alphabetically wins; HANDMADE
  // sorts before READYMADE, matching the form's default selection.
  return (groupMode ?? 'HANDMADE') === f.mode;
}

/**
 * Convert one field's typed amount into a per-dozen figure.
 *
 * PER_MONTH divided by zero capacity yields 0 rather than Infinity — an admin
 * who has not filled in the capacity yet should see a harmless zero, not a
 * broken total.
 */
function toPerDozen(amount: number, basis: CostBasisKey, capacityDozen: number): number {
  if (basis === 'PER_DOZEN') return amount;
  if (basis === 'PER_PAIR') return amount * PAIRS_PER_DOZEN;
  if (basis === 'PER_MONTH') {
    return capacityDozen > 0 ? amount / capacityDozen : 0;
  }
  return amount;
}

/** Convert one field's typed amount into a per-pair figure (retail extras). */
function toPerPair(amount: number, basis: CostBasisKey): number {
  if (basis === 'PER_PAIR') return amount;
  if (basis === 'PER_DOZEN') return amount / PAIRS_PER_DOZEN;
  // A monthly amount has no meaning on a single product line; the shop-wide
  // monthly pool is handled by calcRetailCommonCostPerPair instead.
  return 0;
}

/**
 * Shop-wide retail overhead spread across expected sales.
 *
 *   Total monthly retail expenses ÷ expected monthly sales in pairs
 */
export function calcRetailCommonCostPerPair(
  monthlyValues: Record<string, unknown>,
  fields: CostFieldLike[],
  expectedMonthlySalesPairs: unknown,
): { totalMonthly: number; perPair: number } {
  const expected = num(expectedMonthlySalesPairs);
  let totalMonthly = 0;

  for (const f of fields) {
    if (f.section !== 'RETAIL_COMMON' || !usable(f)) continue;
    totalMonthly += num(monthlyValues[f.key]);
  }

  return {
    totalMonthly: money(totalMonthly),
    perPair: expected > 0 ? money(totalMonthly / expected) : 0,
  };
}

/**
 * A FACTORY field is a shop-wide monthly bill, not a per-product entry.
 *
 * The salary bill does not change because one design is being cut, so it is
 * entered once in Factory Cost Settings and shared out by capacity instead.
 * Anything else in FACTORY (packaging, transport) stays with the product.
 */
export function fieldIsFactoryMonthly(f: CostFieldLike): boolean {
  return f.section === 'FACTORY' && f.basis === 'PER_MONTH';
}

/**
 * Shop-wide monthly factory expenses: salary, rent, electricity, snacks and
 * the rest, added up exactly as entered.
 */
export function calcFactoryMonthlyTotal(
  monthlyValues: Record<string, unknown>,
  fields: CostFieldLike[],
): number {
  let total = 0;
  for (const f of fields) {
    if (!fieldIsFactoryMonthly(f) || !usable(f)) continue;
    total += num(monthlyValues[f.key]);
  }
  return money(total);
}

/**
 * Share the monthly factory pool out to one design.
 *
 *   Total monthly factory cost ÷ that design's standard monthly capacity
 *
 * A design that yields 300 pairs a month carries twice the overhead per pair
 * of one that yields 600 — which is the whole point: slow, difficult work
 * costs more to make.
 */
export function calcFactoryAllocation(
  factoryMonthlyTotal: unknown,
  standardCapacityPairs: unknown,
): { capacityPairs: number; capacityDozen: number; perDozen: number; perPair: number } {
  const total = num(factoryMonthlyTotal);
  const capacityPairs = num(standardCapacityPairs);
  const capacityDozen = capacityPairs / PAIRS_PER_DOZEN;

  return {
    capacityPairs,
    capacityDozen: money(capacityDozen),
    perDozen: capacityDozen > 0 ? money(total / capacityDozen) : 0,
    perPair: capacityPairs > 0 ? money(total / capacityPairs) : 0,
  };
}

// ── Product lines and the labour pool ───────────────────────────────────────
//
// Workers are tagged with the lines they work on. A design is charged only
// the wages of people who actually make that kind of product: a shoe-only
// laster never lands on a sandal's cost, a sandal fitting man never lands on
// a shoe's, and the upperman, sewing man, finisher and helper — who work on
// both — land on both.
//
// That is not double counting. The divisor is each design's standard
// capacity: "if the factory made only this for a month, how many pairs?" In
// that month everyone on the line works on it full time, so the full salary of
// each of them belongs over those pairs. In a mixed month their time splits,
// but the cost of each pair stays the same.

export type ProductLineKey = 'SHOE' | 'SANDAL';
export const PRODUCT_LINES: ProductLineKey[] = ['SHOE', 'SANDAL'];
export const PRODUCT_LINE_LABELS: Record<ProductLineKey, string> = { SHOE: 'Shoe', SANDAL: 'Sandal' };

/** Reserved key inside a costing's values holding its product line, like MODES_KEY. */
export const LINE_KEY = '__line';

/** The monthly factory field that the employee list replaces once it has anyone in it. */
export const LABOUR_FIELD_KEY = 'factory_labour';
/** Snacks and welfare follow people, so they are shared out by headcount. */
export const WELFARE_FIELD_KEY = 'factory_staff_welfare';

export type FactoryEmployee = {
  id: string;
  name: string;
  role?: string | null;
  monthly_salary: number;
  /** Lines this person works on. Both = common worker. */
  lines: ProductLineKey[];
  /** Inactive people stay on the list (history) but cost nothing. */
  active?: boolean;
};

export function isProductLine(v: unknown): v is ProductLineKey {
  return v === 'SHOE' || v === 'SANDAL';
}

/** The line saved on a costing, or null when none has been chosen yet. */
export function getLine(values: Record<string, unknown> | null | undefined): ProductLineKey | null {
  const v = values?.[LINE_KEY];
  return isProductLine(v) ? v : null;
}

const SANDAL_WORDS = /\b(sandals?|slides?|flip[- ]?flops?|slippers?|chappals?|mules?|thongs?)\b/;
const SHOE_WORDS = /\b(shoes?|loafers?|boots?|chelsea|oxfords?|brogues?|sneakers?|moccasins?|derby|pumps?)\b/;

/**
 * Best guess at the line from the category, then the product name — used until
 * the admin picks one. Null when nothing fits clearly; such a design is charged
 * the whole team, exactly as before the employee list existed.
 */
export function inferProductLine(
  category: string | null | undefined,
  productName?: string | null,
): ProductLineKey | null {
  for (const text of [category, productName]) {
    const t = String(text ?? '').toLowerCase();
    if (!t) continue;
    const sandal = SANDAL_WORDS.test(t);
    const shoe = SHOE_WORDS.test(t);
    if (sandal && !shoe) return 'SANDAL';
    if (shoe && !sandal) return 'SHOE';
  }
  return null;
}

/** People who currently cost money. */
export function activeEmployees(list: unknown): FactoryEmployee[] {
  if (!Array.isArray(list)) return [];
  return (list as FactoryEmployee[]).filter((e) => e && e.active !== false);
}

/** No line chosen = charged to everyone, the pre-employee behaviour. */
export function employeeWorksOn(e: FactoryEmployee, line: ProductLineKey | null): boolean {
  return line === null || (Array.isArray(e.lines) && e.lines.includes(line));
}

export type FactoryLinePool = {
  line: ProductLineKey | null;
  /** False until at least one active employee exists; then the salary field is ignored. */
  usesEmployees: boolean;
  /** Wages charged to this line. */
  labour: number;
  labourHeadcount: number;
  totalHeadcount: number;
  /** Snacks / welfare after the headcount share. */
  welfare: number;
  /** Rent, electricity, maintenance and the rest — shared by every line. */
  shared: number;
  /** What a design on this line divides by its capacity. */
  total: number;
};

/**
 * The monthly factory pool one design is costed against.
 *
 *   wages of people on the line
 *   + snacks/welfare × (people on the line ÷ everyone)
 *   + every other monthly bill in full
 *
 * With no employees entered it returns the bills exactly as typed — the
 * original behaviour — so existing costings do not move until the list is used.
 */
export function calcFactoryLinePool(
  monthlyValues: Record<string, unknown> | null | undefined,
  fields: CostFieldLike[],
  employees: unknown,
  line: ProductLineKey | null,
): FactoryLinePool {
  const staff = activeEmployees(employees);
  const usesEmployees = staff.length > 0;

  let typedLabour = 0;
  let welfareFull = 0;
  let shared = 0;
  for (const f of fields) {
    if (!fieldIsFactoryMonthly(f) || !usable(f)) continue;
    const amount = num(monthlyValues?.[f.key]);
    if (f.key === LABOUR_FIELD_KEY) typedLabour += amount;
    else if (f.key === WELFARE_FIELD_KEY) welfareFull += amount;
    else shared += amount;
  }

  const onLine = staff.filter((e) => employeeWorksOn(e, line));
  const labour = usesEmployees ? onLine.reduce((sum, e) => sum + num(e.monthly_salary), 0) : typedLabour;
  const welfare = usesEmployees ? welfareFull * (onLine.length / staff.length) : welfareFull;

  return {
    line,
    usesEmployees,
    labour: money(labour),
    labourHeadcount: onLine.length,
    totalHeadcount: staff.length,
    welfare: money(welfare),
    shared: money(shared),
    total: money(labour + welfare + shared),
  };
}

export function calcCosting(input: CostingInput): CostingResult {
  const values = input.values ?? {};
  const fields = input.fields ?? [];

  // Every monthly bill is divided by this design's own standard capacity.
  const allocation = calcFactoryAllocation(input.factoryMonthlyTotal, input.standardCapacityPairs);
  const capacityDozen = allocation.capacityDozen;

  const modes = getModes(values as Record<string, unknown>);

  let upperCostDozen = 0;
  let soleCostDozen = 0;
  let factoryProductCostDozen = 0;
  let retailProductCostPair = 0;

  for (const f of fields) {
    if (!usable(f)) continue;
    // Skip rows belonging to the mode the admin is not using (e.g. the
    // handmade insole materials while Ready Made is selected).
    if (!fieldIsInActiveMode(f, modes)) continue;
    // Monthly factory bills live in Factory Cost Settings, not on the product.
    if (fieldIsFactoryMonthly(f)) continue;

    // SHEET already returns a per-dozen figure, so it must not be scaled
    // again by the basis conversion below.
    const calculator = f.calculator ?? 'DIRECT';
    const raw = calcEntry(values[f.key] as CostEntry, calculator);
    if (raw === 0) continue;
    const amount = raw;
    const basisForField: CostBasisKey = calculator === 'SHEET' ? 'PER_DOZEN' : f.basis;

    switch (f.section) {
      case 'UPPER':
        upperCostDozen += toPerDozen(amount, basisForField, capacityDozen);
        break;
      case 'SOLE':
        soleCostDozen += toPerDozen(amount, basisForField, capacityDozen);
        break;
      case 'FACTORY':
        // Only the product's own factory costs reach here — packaging,
        // transport and anything else priced per dozen or per pair.
        factoryProductCostDozen += toPerDozen(amount, basisForField, capacityDozen);
        break;
      case 'RETAIL_PRODUCT':
        retailProductCostPair += toPerPair(amount, basisForField);
        break;
      case 'RETAIL_COMMON':
        // Shop-wide monthly pool — never charged to one product here.
        break;
    }
  }

  // The design's share of the monthly pool, plus what it costs the factory
  // on its own account.
  const factoryCostDozen = allocation.perDozen + factoryProductCostDozen;

  const productionCostDozen = upperCostDozen + soleCostDozen + factoryCostDozen;
  const productionCostPair = productionCostDozen / PAIRS_PER_DOZEN;

  // ── Wholesale: straight off the factory cost ──
  const wholesaleProfitPct = num(input.wholesaleProfitPct);
  const wholesaleProfitPair = productionCostPair * (wholesaleProfitPct / 100);
  const wholesalePricePair = productionCostPair + wholesaleProfitPair;

  // ── Retail: also off the factory cost, never off the wholesale price ──
  const retailCommonCostPair = num(input.retailCommonCostPair);
  const retailCostPair = productionCostPair + retailCommonCostPair + retailProductCostPair;
  const retailProfitPct = num(input.retailProfitPct);
  const retailProfitPair = retailCostPair * (retailProfitPct / 100);
  const retailPricePair = retailCostPair + retailProfitPair;

  return {
    upperCostDozen: money(upperCostDozen),
    soleCostDozen: money(soleCostDozen),

    standardCapacityPairs: allocation.capacityPairs,
    standardCapacityDozen: allocation.capacityDozen,
    factoryMonthlyTotal: money(num(input.factoryMonthlyTotal)),
    factoryAllocatedDozen: allocation.perDozen,
    factoryAllocatedPair: allocation.perPair,
    factoryProductCostDozen: money(factoryProductCostDozen),
    factoryCostDozen: money(factoryCostDozen),
    productionCostDozen: money(productionCostDozen),
    productionCostPair: money(productionCostPair),

    wholesaleProfitPct,
    wholesaleProfitPair: money(wholesaleProfitPair),
    wholesalePricePair: money(wholesalePricePair),
    wholesalePriceDozen: money(wholesalePricePair * PAIRS_PER_DOZEN),

    retailCommonCostPair: money(retailCommonCostPair),
    retailProductCostPair: money(retailProductCostPair),
    retailCostPair: money(retailCostPair),
    retailProfitPct,
    retailProfitPair: money(retailProfitPair),
    retailPricePair: money(retailPricePair),
    retailPriceDozen: money(retailPricePair * PAIRS_PER_DOZEN),
  };
}

/**
 * Merge submitted values over stored ones for an edit.
 *
 * A key the form did not send keeps its stored amount; a key sent as 0 saves
 * as 0. Without this an edit that only touched the retail profit would wipe
 * every untouched cost field back to zero.
 */
export function mergeCostValues(
  stored: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(stored ?? {}) };

  for (const [k, v] of Object.entries(incoming ?? {})) {
    if (v === undefined) continue; // untouched — keep the stored value

    // Structured calculator rows are merged field by field, so sending only
    // the changed input (say a new sheet price) does not wipe the material
    // name or the pairs-per-sheet sitting beside it.
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const prev = out[k];
      const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {};
      out[k] = { ...(base as object), ...(v as object) };
      continue;
    }

    out[k] = v;
  }

  return out;
}
