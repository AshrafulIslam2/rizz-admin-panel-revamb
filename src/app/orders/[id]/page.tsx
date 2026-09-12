"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, use } from "react";
import {
  CANCEL_REASONS,
  FAKE_REASONS,
  FULFILLMENT_STATUSES,
  FULFILLMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  REFUND_STATUS_LABEL,
  RETURN_STATUSES,
  RETURN_STATUS_LABEL,
  VERIFICATION_METHODS,
  fulfillmentStatusOf,
  paymentStatusOf,
  refundStatusOf,
  returnStatusOf,
  statusOf,
} from "@/lib/order-status";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

/**
 * One order, and everything that can be done to it.
 *
 * The screen is built around the three independent states — commercial,
 * money, goods — shown side by side rather than folded into one badge, since
 * folding them together is what let a COD order look paid the moment it was
 * handed to a courier.
 */

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verification_required: "bg-orange-50 text-orange-700 border-orange-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  fake: "bg-red-100 text-red-800 border-red-300",
  duplicate: "bg-stone-100 text-stone-700 border-stone-300",
  returned: "bg-yellow-50 text-yellow-800 border-yellow-200",
  refunded: "bg-pink-50 text-pink-700 border-pink-200",
  failed: "bg-slate-100 text-slate-600 border-slate-300",
  test: "bg-slate-100 text-slate-500 border-slate-300",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "bg-slate-100 text-slate-600 border-slate-300",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partially_paid: "bg-yellow-50 text-yellow-800 border-yellow-200",
  refunded: "bg-pink-50 text-pink-700 border-pink-200",
  partially_refunded: "bg-pink-50 text-pink-700 border-pink-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const taka = (n: unknown) => `৳${(Number(n) || 0).toLocaleString()}`;
const dt = (v: unknown) => (v ? new Date(v as string).toLocaleString() : "—");

const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400";
const card = "rounded-2xl border border-slate-200 bg-white p-5";
const lbl = "mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500";

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{text}</span>
  );
}

/**
 * Copy one field to the clipboard.
 *
 * Every one of these is a detail somebody has to retype into a courier form,
 * so the tick confirming the copy matters more than it looks — without it you
 * cannot tell a successful copy from a dead button.
 */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard API needs a secure context; fall back to a hidden field
          // so this still works when the panel is served over plain http.
          const el = document.createElement("textarea");
          el.value = text;
          el.style.position = "fixed";
          el.style.opacity = "0";
          document.body.appendChild(el);
          el.select();
          try { document.execCommand("copy"); } catch { /* nothing more to try */ }
          document.body.removeChild(el);
        }
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${
        done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      {done ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [fraud, setFraud] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Which reason dialog is open, if any.
  const [dialog, setDialog] = useState<null | "fake" | "cancel">(null);
  const [reason, setReason] = useState("");
  const [reasonNote, setReasonNote] = useState("");

  const [verifyMethod, setVerifyMethod] = useState<string>(VERIFICATION_METHODS[0]);
  const [verifyNote, setVerifyNote] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [restock, setRestock] = useState<"sellable" | "damaged">("sellable");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/orders/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`${r.status}`);
      const o = await r.json();
      setOrder(o);
      setHistory(o.history ?? []);
      setCourier(o.courier ?? "");
      setTracking(o.tracking_id ?? "");
      setInternalNote(o.internal_note ?? "");

      if (o.customer_phone) {
        fetch(`${API}/orders/customer-history/${encodeURIComponent(o.customer_phone)}?exclude=${id}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then(setFraud)
          .catch(() => setFraud(null));
      }
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /** Every action goes through here so errors surface the server's own words. */
  async function act(path: string, body: unknown, method = "POST", okText = "Saved.") {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${API}/orders/${id}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      if (!r.ok) {
        let detail = text;
        try { detail = JSON.parse(text).message ?? text; } catch { /* plain text */ }
        throw new Error(Array.isArray(detail) ? detail.join(", ") : String(detail).slice(0, 300));
      }
      setMsg({ type: "ok", text: okText });
      setDialog(null); setReason(""); setReasonNote("");
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Action failed." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
          <p className="text-sm text-rose-800">Order not found.</p>
          <Link href="/orders" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">
            ← Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const status = statusOf(order.status);
  const payment = paymentStatusOf(order.payment_status);
  const fulfilment = fulfillmentStatusOf(order.fulfillment_status);
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total) || 0;
  const paid = Number(order.amount_paid) || 0;
  const outstanding = Math.max(0, total - paid);
  const courierKept = Number(order.delivery_charge_paid) || 0;
  // What pressing the button would save right now.
  const collectNow = payAmount === "" ? outstanding : (Number(payAmount) || 0);
  const chargeNow = Number(deliveryCharge) || 0;
  const fullAddress = [order.address, order.area, order.district, order.division].filter(Boolean).join(", ");
  const returnState = returnStatusOf(order.return_status);
  // Only the transitions the server would accept are offered.
  const RETURN_NEXT: Record<string, string[]> = {
    none: ["requested"],
    requested: ["approved", "rejected"],
    approved: ["received", "rejected"],
    received: [],
    rejected: ["requested"],
  };
  const nextReturnSteps = (RETURN_NEXT[returnState] ?? []) as (typeof RETURN_STATUSES)[number][];
  const refundable = Math.max(0, paid - (Number(order.refund_amount) || 0));
  const isVoid = ["fake", "duplicate", "test", "failed"].includes(status);
  const isClosed = isVoid || status === "cancelled";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">

        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <Link href="/orders" className="text-xs text-teal-400 hover:text-teal-300">← Orders</Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{order.order_number ?? order.id}</h1>
              <p className="mt-1 text-sm text-slate-400">Placed {dt(order.created_at)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge text={ORDER_STATUS_LABEL[status]} className={STATUS_COLORS[status]} />
              <Badge text={PAYMENT_STATUS_LABEL[payment]} className={PAYMENT_COLORS[payment]} />
              <Badge text={FULFILLMENT_STATUS_LABEL[fulfilment]} className="bg-white/10 text-white border-white/20" />
            </div>
          </div>
        </header>

        {msg && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${
            msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}>{msg.text}</div>
        )}

        {isVoid && (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">
              This order is marked {ORDER_STATUS_LABEL[status]} and is excluded from all revenue and sales figures.
            </p>
            {order.void_reason && <p className="mt-1">Reason: {order.void_reason}</p>}
            <p className="mt-1 text-xs text-red-700">
              Marked by {order.voided_by ?? "—"} on {dt(order.voided_at)}. The record is kept deliberately — a repeat
              fraudster is only detectable because old orders survive.
            </p>
          </div>
        )}

        {/* Fraud warning — information, never an automatic decision */}
        {fraud?.hasFakeHistory && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">⚠ Previous fake order history on this number</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-amber-900">
              <span>Previous orders: <b>{fraud.totalOrders}</b></span>
              <span>Delivered: <b>{fraud.delivered}</b></span>
              <span>Cancelled: <b>{fraud.cancelled}</b></span>
              <span>Fake: <b className="text-red-700">{fraud.fake}</b></span>
              <span>Returned: <b>{fraud.returned}</b></span>
            </div>
            <p className="mt-2 text-[11px] text-amber-800">
              Shown so you can decide — nothing has been cancelled automatically.
            </p>
          </div>
        )}

        {/* ── Action bar ── */}
        <div className={card}>
          <p className={lbl}>Actions</p>
          <div className="flex flex-wrap gap-2">
            {!order.verified && !isClosed && (
              <button type="button" disabled={busy}
                onClick={() => act("/verify", { verification_method: verifyMethod, note: verifyNote, verified_by: "admin" }, "POST", "Order verified and confirmed.")}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
                Verify &amp; Confirm
              </button>
            )}
            {status !== "processing" && !isClosed && (
              <button type="button" disabled={busy}
                onClick={() => act("", { status: "processing" }, "PATCH", "Moved to processing.")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                Processing
              </button>
            )}
            {status !== "shipped" && !isClosed && (
              <button type="button" disabled={busy}
                onClick={() => act("", { status: "shipped" }, "PATCH", "Marked shipped.")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                Mark Shipped
              </button>
            )}
            {status !== "delivered" && !isClosed && (
              <button type="button" disabled={busy}
                onClick={() => act("", { status: "delivered" }, "PATCH", "Marked delivered. Payment is recorded separately.")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">
                Mark Delivered
              </button>
            )}
            {!isClosed && (
              <button type="button" disabled={busy} onClick={() => setDialog("cancel")}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">
                Cancel Order
              </button>
            )}
            {!isVoid && (
              <button type="button" disabled={busy} onClick={() => setDialog("fake")}
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50">
                Mark as Fake
              </button>
            )}
            <button type="button" disabled={busy}
              onClick={() => act("/archive", { archived: !order.is_archived }, "PATCH", order.is_archived ? "Restored." : "Archived.")}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              {order.is_archived ? "Restore" : "Archive"}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            There is no delete button. Orders are cancelled, marked fake or archived — the history is what makes repeat
            fraud visible.
          </p>
        </div>

        {/* ── Reason dialog: cancelling and faking both demand one ── */}
        {dialog && (
          <div className={`${card} border-2 ${dialog === "fake" ? "border-red-300" : "border-rose-200"}`}>
            <p className="text-sm font-bold text-slate-900">
              {dialog === "fake" ? "Mark this order as fake" : "Cancel this order"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {dialog === "fake"
                ? "The order stays in the system for fraud analysis, but leaves every revenue figure."
                : "A cancelled order keeps its record and is excluded from revenue."}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className={lbl}>Reason (required)</p>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={input}>
                  <option value="">— Select a reason —</option>
                  {(dialog === "fake" ? FAKE_REASONS : CANCEL_REASONS).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className={lbl}>Note (optional)</p>
                <input value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} className={input} placeholder="Anything worth remembering" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy || !reason}
                onClick={() => act(
                  dialog === "fake" ? "/mark-fake" : "/cancel",
                  { reason: reasonNote ? `${reason} — ${reasonNote}` : reason, marked_by: "admin", cancelled_by: "admin" },
                  "POST",
                  dialog === "fake" ? "Marked fake and removed from revenue." : "Order cancelled.",
                )}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-40 ${dialog === "fake" ? "bg-red-600 hover:bg-red-500" : "bg-rose-600 hover:bg-rose-500"}`}>
                {busy ? "Working…" : dialog === "fake" ? "Confirm — Mark Fake" : "Confirm — Cancel Order"}
              </button>
              <button type="button" onClick={() => { setDialog(null); setReason(""); setReasonNote(""); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Back
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {/* Customer */}
            <div className={card}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className={`${lbl} mb-0`}>Customer</p>
                <CopyButton
                  label="all details"
                  text={[
                    order.customer_name,
                    order.customer_phone,
                    fullAddress,
                  ].filter(Boolean).join("\n")}
                />
              </div>

              <div className="flex items-center justify-between gap-3 py-0.5">
                <p className="text-base font-semibold text-slate-900">{order.customer_name}</p>
                <CopyButton label="name" text={order.customer_name ?? ""} />
              </div>
              <div className="flex items-center justify-between gap-3 py-0.5">
                <p className="text-sm tabular-nums text-slate-600">{order.customer_phone}</p>
                <CopyButton label="phone" text={order.customer_phone ?? ""} />
              </div>
              {order.customer_email && (
                <div className="flex items-center justify-between gap-3 py-0.5">
                  <p className="text-sm text-slate-600">{order.customer_email}</p>
                  <CopyButton label="email" text={order.customer_email} />
                </div>
              )}
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="text-sm text-slate-600">{fullAddress}</p>
                <CopyButton label="address" text={fullAddress} />
              </div>
            </div>

            {/* Items */}
            <div className={card}>
              <p className={lbl}>Items</p>
              <div className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    {/* The server picks the picture for this line's colour where
                        one is tagged, so a black pair looks like a black pair. */}
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt={it.name ?? it.slug ?? "product"}
                        className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-300">
                        no image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{it.name ?? it.slug}</p>
                      <p className="text-xs text-slate-500">
                        {[it.size && `Size ${it.size}`, it.color].filter(Boolean).join(" · ")} × {it.quantity ?? 1}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                      {taka((Number(it.price) || 0) * (Number(it.quantity) || 1))}
                    </span>
                  </div>
                ))}
                {items.length === 0 && <p className="py-3 text-sm text-slate-400">No item detail stored.</p>}
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <Row label="Subtotal" value={taka(order.subtotal)} />
                <Row label="Delivery charge" value={taka(order.shipping_fee)} />
                {Number(order.discount_amount) > 0 && (
                  <Row label={`Discount${order.promo_code ? ` (${order.promo_code})` : ""}`} value={`− ${taka(order.discount_amount)}`} />
                )}
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <Row label="Order total" value={<span className="text-base font-bold">{taka(total)}</span>} />
                </div>
              </div>
            </div>

            {/* Status history */}
            <div className={card}>
              <p className={lbl}>Status History</p>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nothing recorded yet — history starts from the first change made after this update.
                </p>
              ) : (
                <ol className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium capitalize">{String(h.field).replace(/_/g, " ")}</span>
                          {h.from_value ? <> · {h.from_value} → </> : ": "}
                          <b>{h.to_value}</b>
                        </p>
                        {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                        <p className="text-[11px] text-slate-400">{h.changed_by} · {dt(h.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* ── Right rail ── */}
          <div className="space-y-5">
            {/* Payment — its own action, never implied by delivery */}
            <div className={card}>
              <p className={lbl}>Payment</p>
              <Row label="Method" value={order.payment_method ?? "COD"} />
              <Row label="Status" value={PAYMENT_STATUS_LABEL[payment]} />
              <Row label="Collected from customer" value={taka(paid)} />
              {courierKept > 0 && (
                <Row label="Courier delivery charge" value={<span className="text-amber-700">− {taka(courierKept)}</span>} />
              )}
              {courierKept > 0 && (
                <Row label="Net received" value={<span className="font-bold text-emerald-700">{taka(paid - courierKept)}</span>} />
              )}
              <Row label="Outstanding" value={<span className={outstanding > 0 ? "text-amber-700" : ""}>{taka(outstanding)}</span>} />
              {order.paid_at && <Row label="Paid at" value={dt(order.paid_at)} />}

              {outstanding > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className={lbl}>Record payment collected</p>
                  <div className="space-y-2">
                    <div>
                      <p className={lbl}>Collected from customer</p>
                      <input type="number" inputMode="decimal" step="any" value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder={String(outstanding)} className={input} />
                    </div>
                    <div>
                      <p className={lbl}>Courier delivery charge</p>
                      <input type="number" inputMode="decimal" step="any" value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(e.target.value)}
                        placeholder="0" className={input} />
                    </div>

                    {/* The arithmetic spelled out, so there is no guessing what
                        will be saved before the button is pressed. */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[11px] tabular-nums text-emerald-900">
                        {taka(collectNow)} collected − {taka(chargeNow)} courier
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-800">
                        = {taka(collectNow - chargeNow)} reaches you
                      </p>
                    </div>

                    <button type="button" disabled={busy || collectNow - chargeNow < 0}
                      onClick={() => act("/payment", {
                        amount: payAmount === "" ? undefined : Number(payAmount),
                        delivery_charge: chargeNow,
                        recorded_by: "admin",
                      }, "POST", "Payment recorded.")}
                      className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">
                      Record payment
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Leave the first box blank to collect the full outstanding {taka(outstanding)}. The courier&apos;s cut
                    is recorded separately — the customer still counts as having paid in full.
                  </p>
                </div>
              )}
            </div>

            {/* Courier */}
            <div className={card}>
              <p className={lbl}>Delivery</p>
              <div className="space-y-3">
                <div>
                  <p className={lbl}>Courier</p>
                  <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Pathao / Steadfast / …" className={input} />
                </div>
                <div>
                  <p className={lbl}>Tracking ID</p>
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Consignment no." className={input} />
                </div>
                <div>
                  <p className={lbl}>Fulfilment</p>
                  <select value={fulfilment}
                    onChange={(e) => act("/fulfillment", { fulfillment_status: e.target.value, courier, tracking_id: tracking }, "PATCH", "Delivery updated.")}
                    className={input}>
                    {FULFILLMENT_STATUSES.map((f) => (
                      <option key={f} value={f}>{FULFILLMENT_STATUS_LABEL[f]}</option>
                    ))}
                  </select>
                </div>
                <button type="button" disabled={busy}
                  onClick={() => act("/fulfillment", { courier, tracking_id: tracking }, "PATCH", "Courier details saved.")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                  Save courier details
                </button>
                {order.shipped_at && <Row label="Shipped" value={dt(order.shipped_at)} />}
                {order.delivered_at && <Row label="Delivered" value={dt(order.delivered_at)} />}
              </div>
            </div>

            {/* Verification */}
            <div className={card}>
              <p className={lbl}>COD Verification</p>
              {order.verified ? (
                <>
                  <Row label="Verified" value={<span className="text-emerald-700">Yes</span>} />
                  <Row label="Method" value={order.verification_method ?? "—"} />
                  <Row label="By" value={order.verified_by ?? "—"} />
                  <Row label="At" value={dt(order.verified_at)} />
                  {order.verification_note && <p className="mt-1 text-xs text-slate-500">{order.verification_note}</p>}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Not verified yet.</p>
                  <div>
                    <p className={lbl}>Method</p>
                    <select value={verifyMethod} onChange={(e) => setVerifyMethod(e.target.value)} className={input}>
                      {VERIFICATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className={lbl}>Note</p>
                    <input value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} placeholder="What the customer said" className={input} />
                  </div>
                </div>
              )}
            </div>

            {/* Returns and refunds, separately */}
            <div className={card}>
              <p className={lbl}>Return &amp; Refund</p>
              <Row label="Return" value={RETURN_STATUS_LABEL[returnState]} />
              <Row label="Refund" value={REFUND_STATUS_LABEL[refundStatusOf(order.refund_status)]} />
              <Row label="Refunded" value={taka(order.refund_amount)} />
              <Row label="Refundable" value={taka(refundable)} />

              {/* Only the legal next steps are offered, so an impossible jump
                  is never even clickable. */}
              {nextReturnSteps.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className={lbl}>Next step</p>
                  <div className="flex flex-wrap gap-2">
                    {nextReturnSteps.map((next) => (
                      <button key={next} type="button" disabled={busy}
                        onClick={() => act("/return", {
                          return_status: next,
                          ...(next === "received" ? { return_restock: restock } : {}),
                          changed_by: "admin",
                        }, "PATCH", `Return marked ${RETURN_STATUS_LABEL[next]}.`)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                          next === "rejected"
                            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}>
                        {RETURN_STATUS_LABEL[next]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Restock choice matters only at the moment goods come back. */}
              {returnState === "approved" && (
                <div className="mt-3">
                  <p className={lbl}>When received, the goods are</p>
                  <select value={restock} onChange={(e) => setRestock(e.target.value as "sellable" | "damaged")} className={input}>
                    <option value="sellable">Sellable — put back on the shelf</option>
                    <option value="damaged">Damaged — write off, do not resell</option>
                  </select>
                </div>
              )}

              {order.return_restock && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Recorded as <b>{order.return_restock === "damaged" ? "damaged — written off" : "sellable — back in stock"}</b>.
                </p>
              )}

              {refundable > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className={lbl}>Refund</p>
                  <div className="flex gap-2">
                    <input type="number" inputMode="decimal" step="any" value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder={String(refundable)} className={input} />
                    <button type="button" disabled={busy}
                      onClick={() => act("/return", {
                        refund_amount: (Number(order.refund_amount) || 0) + (refundAmount === "" ? refundable : Number(refundAmount)),
                        changed_by: "admin",
                      }, "PATCH", "Refund recorded.")}
                      className="shrink-0 rounded-xl bg-pink-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-pink-500 disabled:opacity-50">
                      Refund
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Blank refunds the full {taka(refundable)}. Never more than the {taka(paid)} actually collected.
                  </p>
                </div>
              )}

              <p className="mt-3 text-[11px] text-slate-400">
                A return and a refund are tracked separately — goods can come back without money going out, and money
                can go out without goods coming back.
              </p>
            </div>

            {/* Internal note */}
            <div className={card}>
              <p className={lbl}>Internal Note</p>
              <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={3}
                placeholder="Staff only — never shown to the customer" className={`${input} resize-y`} />
              <button type="button" disabled={busy}
                onClick={() => act("/internal-note", { internal_note: internalNote, changed_by: "admin" }, "PATCH", "Note saved.")}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                Save note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
