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
  /** Dozens produced per month — spreads PER_MONTH factory bills. */
  monthlyProductionDozen?: number;
  wholesaleProfitPct?: number;
  retailProfitPct?: number;
  /** Comes from the shop-wide retail settings (see calcRetailCommonCostPerPair). */
  retailCommonCostPair?: number;
};

export type CostingResult = {
  upperCostDozen: number;
  soleCostDozen: number;
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
 * PER_MONTH divided by zero monthly output yields 0 rather than Infinity —
 * an admin who has not filled in monthly production yet should see a harmless
 * zero, not a broken total.
 */
function toPerDozen(amount: number, basis: CostBasisKey, monthlyProductionDozen: number): number {
  if (basis === 'PER_DOZEN') return amount;
  if (basis === 'PER_PAIR') return amount * PAIRS_PER_DOZEN;
  if (basis === 'PER_MONTH') {
    return monthlyProductionDozen > 0 ? amount / monthlyProductionDozen : 0;
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

export function calcCosting(input: CostingInput): CostingResult {
  const values = input.values ?? {};
  const fields = input.fields ?? [];
  const monthlyProductionDozen = num(input.monthlyProductionDozen);

  const modes = getModes(values as Record<string, unknown>);

  let upperCostDozen = 0;
  let soleCostDozen = 0;
  let factoryCostDozen = 0;
  let retailProductCostPair = 0;

  for (const f of fields) {
    if (!usable(f)) continue;
    // Skip rows belonging to the mode the admin is not using (e.g. the
    // handmade insole materials while Ready Made is selected).
    if (!fieldIsInActiveMode(f, modes)) continue;

    // SHEET already returns a per-dozen figure, so it must not be scaled
    // again by the basis conversion below.
    const calculator = f.calculator ?? 'DIRECT';
    const raw = calcEntry(values[f.key] as CostEntry, calculator);
    if (raw === 0) continue;
    const amount = raw;
    const basisForField: CostBasisKey = calculator === 'SHEET' ? 'PER_DOZEN' : f.basis;

    switch (f.section) {
      case 'UPPER':
        upperCostDozen += toPerDozen(amount, basisForField, monthlyProductionDozen);
        break;
      case 'SOLE':
        soleCostDozen += toPerDozen(amount, basisForField, monthlyProductionDozen);
        break;
      case 'FACTORY':
        factoryCostDozen += toPerDozen(amount, basisForField, monthlyProductionDozen);
        break;
      case 'RETAIL_PRODUCT':
        retailProductCostPair += toPerPair(amount, basisForField);
        break;
      case 'RETAIL_COMMON':
        // Shop-wide monthly pool — never charged to one product here.
        break;
    }
  }

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
