/**
 * Client helpers for the product costing API.
 *
 * Every call surfaces the server's error text rather than failing silently —
 * a costing form that appears to save but doesn't is worse than one that says
 * plainly what went wrong.
 */
export const COSTING_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

export type CostSection = "UPPER" | "SOLE" | "FACTORY" | "RETAIL_COMMON" | "RETAIL_PRODUCT";
export type CostBasis = "PER_DOZEN" | "PER_PAIR" | "PER_MONTH";
export type CostCalculator = "DIRECT" | "SQFT" | "UNIT" | "SHEET" | "CHEMICAL";

export type CostField = {
  id: string;
  key: string;
  label: string;
  section: CostSection;
  basis: CostBasis;
  /** Which input shape and formula this field uses. Absent = DIRECT. */
  calculator?: CostCalculator;
  /** Sub-tab inside the section, e.g. "materials", "insole", "chemicals". */
  group?: string | null;
  /** Only shown when its group is switched to this mode. */
  mode?: string | null;
  help_text: string | null;
  sort_order: number;
  is_active: boolean;
  is_archived: boolean;
};

export type FactorySettings = {
  /** fieldKey -> monthly amount, for FACTORY fields on a PER_MONTH basis. */
  monthly: Record<string, number>;
  total_monthly: number;
};

export type RetailSettings = {
  monthly: Record<string, number>;
  expected_monthly_sales_pairs: number;
  total_monthly: number;
  retail_common_cost_pair: number;
};

export type ProductCosting = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_code: string | null;
  category: string | null;
  image_url: string | null;
  entry_date: string;
  /**
   * fieldKey -> amount. A plain number for DIRECT fields; an object of the
   * calculator's own inputs for SQFT / UNIT / SHEET / CHEMICAL. The reserved
   * "__modes" key holds the handmade/ready-made choice per group.
   */
  values: Record<string, unknown>;
  /** Pairs a month this design yields if the factory ran nothing else. */
  standard_capacity_pairs: number;
  /** The same capacity in dozens, derived on save. */
  monthly_production: number;
  /** The shop-wide monthly factory pool this costing was priced against. */
  factory_monthly_total: number;
  wholesale_profit_pct: number;
  retail_profit_pct: number;
  retail_common_cost_pair: number;
  upper_cost_dozen: number;
  sole_cost_dozen: number;
  factory_cost_dozen: number;
  production_cost_dozen: number;
  production_cost_pair: number;
  wholesale_profit_pair: number;
  wholesale_price_pair: number;
  wholesale_price_dozen: number;
  retail_product_cost_pair: number;
  retail_cost_pair: number;
  retail_profit_pair: number;
  retail_price_pair: number;
  retail_price_dozen: number;
  updated_at: string;
};

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${COSTING_API}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (e: any) {
    throw new Error(
      `Could not reach the server at ${COSTING_API}. Is the backend running? (${e?.message ?? e})`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Server returned ${res.status}${text ? ` — ${text.slice(0, 300)}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Cost fields ──
export const listCostFields = (includeArchived = false) =>
  call<CostField[]>(`/costing/fields${includeArchived ? "?includeArchived=true" : ""}`);
export const createCostField = (dto: Partial<CostField>) => call<CostField>("/costing/fields", "POST", dto);
export const updateCostField = (id: string, dto: Partial<CostField>) =>
  call<CostField>(`/costing/fields/${id}`, "PATCH", dto);
export const reorderCostFields = (ids: string[]) =>
  call<{ ok: boolean }>("/costing/fields/reorder", "PATCH", { ids });
export const archiveCostField = (id: string) => call<CostField>(`/costing/fields/${id}`, "DELETE");

// ── Factory settings (shop-wide monthly bills) ──
export const getFactorySettings = () => call<FactorySettings>("/costing/factory-settings");
export const saveFactorySettings = (dto: { monthly: Record<string, number> }) =>
  call<FactorySettings>("/costing/factory-settings", "PUT", dto);

// ── Retail settings ──
export const getRetailSettings = () => call<RetailSettings>("/costing/retail-settings");
export const saveRetailSettings = (dto: Partial<RetailSettings>) =>
  call<RetailSettings>("/costing/retail-settings", "PUT", dto);

// ── Costing records ──
export const listCostings = () => call<ProductCosting[]>("/costing/products");
export const getCosting = (id: string) => call<ProductCosting>(`/costing/products/${id}`);
export const createCosting = (dto: Record<string, unknown>) =>
  call<ProductCosting>("/costing/products", "POST", dto);
export const updateCosting = (id: string, dto: Record<string, unknown>) =>
  call<ProductCosting>(`/costing/products/${id}`, "PATCH", dto);
export const deleteCosting = (id: string) => call<ProductCosting>(`/costing/products/${id}`, "DELETE");

/**
 * Copy an existing costing onto a new product.
 *
 * Every material, calculator row and profit percentage comes across; the
 * catalog link deliberately does not, because this is a different product.
 */
export const duplicateCosting = (id: string, dto: { product_name: string; product_code?: string | null }) =>
  call<ProductCosting>(`/costing/products/${id}/duplicate`, "POST", dto);

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  image: string;
};

/** Products from the catalog, for the "select existing product" picker. */
export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  const d = await call<any>("/products");
  const list = Array.isArray(d?.products) ? d.products : Array.isArray(d) ? d : [];
  return list.map((p: any) => ({
    id: p.id as string,
    name: (p.name ?? "") as string,
    sku: (p.sku ?? "") as string,
    category: (p.category?.name ?? "") as string,
    image: (p.media?.find((m: any) => m.is_primary)?.media_url ?? p.media?.[0]?.media_url ?? "") as string,
  }));
}

export const taka = (n: number) => `৳${(Math.round((n ?? 0) * 100) / 100).toLocaleString("en-US")}`;
