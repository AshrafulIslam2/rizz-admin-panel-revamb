/**
 * Order status vocabulary and the revenue definitions that depend on it.
 *
 * MIRROR of the backend's src/orders/order-status.ts. Kept byte-identical
 * below this header so a screen labels its numbers with exactly the rule the
 * server used to produce them. If you change one, change the other.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE:
 *
 *   Order created   ≠ revenue
 *   Order confirmed ≠ revenue
 *   Order shipped   ≠ revenue
 *   Order DELIVERED = a completed sale
 *
 * Every report reads its statuses from the buckets below rather than writing
 * its own filter, so two screens can never quietly disagree about what
 * "revenue" means.
 */

export const ORDER_STATUSES = [
  'pending',
  'verification_required',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'fake',
  'duplicate',
  'returned',
  'refunded',
  'failed',
  'test',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Human labels, so the UI never has to un-snake_case by hand. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  verification_required: 'Verification Required',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  fake: 'Fake / Fraud',
  duplicate: 'Duplicate',
  returned: 'Returned',
  refunded: 'Refunded',
  failed: 'Failed',
  test: 'Test Order',
};

/**
 * Spellings written before this file existed, plus the obvious near-misses.
 *
 * Stored rows are never rewritten on read — they are translated here — so an
 * order saved as "dispatched" keeps working while the vocabulary moves on.
 */
export const LEGACY_STATUS_ALIASES: Record<string, OrderStatus> = {
  dispatched: 'shipped',
  dispatch: 'shipped',
  shipping: 'shipped',
  fraud: 'fake',
  'fake/fraud': 'fake',
  canceled: 'cancelled',
  complete: 'delivered',
  completed: 'delivered',
  done: 'delivered',
  new: 'pending',
  unverified: 'verification_required',
};

/**
 * Translate whatever is stored into a status this system understands.
 * Returns null for something genuinely unrecognised, so a caller can decide
 * whether to reject it (an API write) or park it (a report).
 */
export function normalizeStatus(raw: unknown): OrderStatus | null {
  const key = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return null;
  if ((ORDER_STATUSES as readonly string[]).includes(key)) return key as OrderStatus;
  return LEGACY_STATUS_ALIASES[key] ?? null;
}

/** Same, but never fails — an unknown status is treated as still open. */
export function statusOf(raw: unknown): OrderStatus {
  return normalizeStatus(raw) ?? 'pending';
}

// ── Payment: money, tracked entirely separately from goods ──────────────────
//
// A COD parcel can be handed over on Tuesday and settled by the courier on
// Friday. Collapsing the two into one status is what makes a COD dashboard
// lie, so delivery NEVER writes a payment status here.

export const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'partially_paid',
  'refunded',
  'partially_refunded',
  'failed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  pending: 'Payment Pending',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
  failed: 'Payment Failed',
};

// ── Fulfilment: where the goods physically are ──────────────────────────────

export const FULFILLMENT_STATUSES = [
  'unfulfilled',
  'processing',
  'shipped',
  'delivered',
  'returned',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const FULFILLMENT_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  unfulfilled: 'Unfulfilled',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  returned: 'Returned',
};

// ── Returns and refunds: two separate things ────────────────────────────────
//
// An order can be returned and never refunded, or refunded without a physical
// return. One field cannot express both.

export const RETURN_STATUSES = ['none', 'requested', 'approved', 'received', 'rejected'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  none: 'No Return',
  requested: 'Return Requested',
  approved: 'Return Approved',
  received: 'Return Received',
  rejected: 'Return Rejected',
};

export const REFUND_STATUSES = ['none', 'pending', 'partial', 'full'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  none: 'No Refund',
  pending: 'Refund Pending',
  partial: 'Partially Refunded',
  full: 'Fully Refunded',
};

// ── Reasons ─────────────────────────────────────────────────────────────────

export const FAKE_REASONS = [
  'Fake phone number',
  'Customer denied ordering',
  'Invalid address',
  'Repeated fake customer',
  'Spam',
  'Duplicate',
  'Other',
] as const;

export const CANCEL_REASONS = [
  'Customer cancelled',
  'Product unavailable',
  'Wrong order',
  'Unable to contact customer',
  'Delivery area unavailable',
  'Duplicate order',
  'Other',
] as const;

export const VERIFICATION_METHODS = ['Phone call', 'WhatsApp', 'SMS', 'Messenger', 'Other'] as const;

// ── Generic normaliser for the simple vocabularies ──────────────────────────

function pick<T extends string>(allowed: readonly T[], raw: unknown, fallback: T): T {
  const key = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (allowed as readonly string[]).includes(key) ? (key as T) : fallback;
}

export function paymentStatusOf(raw: unknown): PaymentStatus {
  return pick(PAYMENT_STATUSES, raw, 'unpaid');
}
export function fulfillmentStatusOf(raw: unknown): FulfillmentStatus {
  return pick(FULFILLMENT_STATUSES, raw, 'unfulfilled');
}
export function returnStatusOf(raw: unknown): ReturnStatus {
  return pick(RETURN_STATUSES, raw, 'none');
}
export function refundStatusOf(raw: unknown): RefundStatus {
  return pick(REFUND_STATUSES, raw, 'none');
}

/**
 * Where the goods must be for a given commercial status.
 *
 * Only used to keep the two in step when the admin moves the order status —
 * it never overrides a fulfilment state the admin set deliberately, and it
 * never touches payment.
 */
export function fulfillmentForStatus(status: OrderStatus): FulfillmentStatus | null {
  switch (status) {
    case 'processing': return 'processing';
    case 'shipped': return 'shipped';
    case 'delivered': return 'delivered';
    case 'returned': return 'returned';
    case 'cancelled':
    case 'fake':
    case 'duplicate':
    case 'failed':
      return 'unfulfilled';
    default: return null;
  }
}

/** Statuses that must not be set without the admin giving a reason. */
export const REASON_REQUIRED_STATUSES: OrderStatus[] = ['cancelled', 'fake', 'duplicate'];

// ── The buckets every report must use ───────────────────────────────────────

/**
 * Commercially, these never happened. They are kept as rows for fraud
 * analysis and audit, and excluded from every money and conversion figure.
 */
export const VOID_STATUSES: OrderStatus[] = ['fake', 'duplicate', 'test', 'failed'];

/** Placed, real, not yet acted on. */
export const OPEN_STATUSES: OrderStatus[] = ['pending', 'verification_required'];

/** Real and moving, but the money is not in hand. */
export const PIPELINE_STATUSES: OrderStatus[] = ['confirmed', 'processing', 'shipped'];

/**
 * Completed sales. For a COD business this is the only bucket that is
 * actually money — everything before delivery is a hope, not a sale.
 */
export const REVENUE_STATUSES: OrderStatus[] = ['delivered'];

/** Real orders that did not complete. */
export const LOST_STATUSES: OrderStatus[] = ['cancelled', 'returned', 'refunded'];

/** A row that should be counted as a genuine order at all. */
export function isRealOrder(status: unknown): boolean {
  return !VOID_STATUSES.includes(statusOf(status));
}

/** A row whose value is earned revenue. */
export function isRevenue(status: unknown): boolean {
  return REVENUE_STATUSES.includes(statusOf(status));
}

// ── Summary ─────────────────────────────────────────────────────────────────

export type OrderLike = {
  total?: unknown;
  status?: unknown;
  created_at?: string | Date;
  refund_amount?: unknown;
  /** Cash actually in hand. For COD this lands when the courier settles. */
  amount_paid?: unknown;
  payment_status?: unknown;
};

export type OrderSummary = {
  orders: {
    total: number;
    real: number;
    pending: number;
    verificationRequired: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    fake: number;
    duplicate: number;
    returned: number;
    refunded: number;
    failed: number;
    test: number;
  };
  financial: {
    /** Everything a real customer asked for, void rows excluded. */
    placedOrderValue: number;
    /** Confirmed + Processing + Shipped — money expected, not earned. */
    confirmedPipelineValue: number;
    shippedValue: number;
    /** THE revenue number. Delivered only. */
    deliveredSales: number;
    /**
     * Cash actually received, summed from amount_paid.
     *
     * Deliberately NOT derived from the order status: a delivered COD parcel
     * the courier has not settled yet is a real sale but not yet money, and
     * the shop needs to see that gap rather than have it papered over.
     */
    collectedRevenue: number;
    /** Delivered sales still waiting on the courier to settle. */
    uncollectedDeliveredValue: number;
    refundAmount: number;
    returnLoss: number;
    cancelledValue: number;
    fakeValue: number;
    /** Delivered sales less refunds and returns. */
    netRevenue: number;
  };
};

/**
 * What GET /orders/stats/summary returns: the all-time (or date-filtered)
 * summary, plus the same shape recomputed for today alone — so a screen can
 * show "orders came in" beside "sales actually completed" without the two
 * ever being confused for each other.
 */
export type OrderSummaryResponse = OrderSummary & {
  today: OrderSummary;
  generated_at: string;
};

function n(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const x = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(x) ? x : 0;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/**
 * Every headline figure, derived once from the buckets above.
 *
 * Delivered Sales and Collected Revenue are computed from different fields on
 * purpose — the first from status, the second from money — so the shop can see
 * how much it has sold and how much it has actually been paid at the same time.
 */
export function summariseOrders(orders: OrderLike[]): OrderSummary {
  const count = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;

  let placedOrderValue = 0;
  let confirmedPipelineValue = 0;
  let shippedValue = 0;
  let deliveredSales = 0;
  let collectedRevenue = 0;
  let uncollectedDeliveredValue = 0;
  let refundAmount = 0;
  let returnLoss = 0;
  let cancelledValue = 0;
  let fakeValue = 0;
  let real = 0;

  for (const o of orders ?? []) {
    const s = statusOf(o?.status);
    const total = n(o?.total);
    count[s] += 1;

    if (VOID_STATUSES.includes(s)) {
      if (s === 'fake' || s === 'duplicate') fakeValue += total;
      continue; // never touches any revenue figure
    }

    real += 1;
    placedOrderValue += total;

    if (PIPELINE_STATUSES.includes(s)) confirmedPipelineValue += total;
    if (s === 'shipped') shippedValue += total;
    if (s === 'cancelled') cancelledValue += total;
    if (s === 'returned') returnLoss += total;

    // Money in hand, whatever the order status says. A cancelled order that
    // was prepaid still took the customer's money.
    const paid = n(o?.amount_paid);
    collectedRevenue += paid;

    if (REVENUE_STATUSES.includes(s)) {
      deliveredSales += total;
      if (paid < total) uncollectedDeliveredValue += total - paid;
    }

    // A refund can sit on an order in any state once money has moved.
    refundAmount += n(o?.refund_amount);
  }

  return {
    orders: {
      total: (orders ?? []).length,
      real,
      pending: count.pending,
      verificationRequired: count.verification_required,
      confirmed: count.confirmed,
      processing: count.processing,
      shipped: count.shipped,
      delivered: count.delivered,
      cancelled: count.cancelled,
      fake: count.fake,
      duplicate: count.duplicate,
      returned: count.returned,
      refunded: count.refunded,
      failed: count.failed,
      test: count.test,
    },
    financial: {
      placedOrderValue: round2(placedOrderValue),
      confirmedPipelineValue: round2(confirmedPipelineValue),
      shippedValue: round2(shippedValue),
      deliveredSales: round2(deliveredSales),
      collectedRevenue: round2(collectedRevenue),
      uncollectedDeliveredValue: round2(uncollectedDeliveredValue),
      refundAmount: round2(refundAmount),
      returnLoss: round2(returnLoss),
      cancelledValue: round2(cancelledValue),
      fakeValue: round2(fakeValue),
      netRevenue: round2(deliveredSales - refundAmount - returnLoss),
    },
  };
}

/** Orders created on a given local day — for the Today block. */
export function ordersOnDay(orders: OrderLike[], day: Date): OrderLike[] {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  return (orders ?? []).filter((o) => {
    if (!o?.created_at) return false;
    const t = new Date(o.created_at as string).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}
