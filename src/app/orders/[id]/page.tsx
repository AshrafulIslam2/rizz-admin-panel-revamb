"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

const STATUSES = ["pending", "confirmed", "dispatched", "delivered", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  dispatched: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/orders/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const updated = await r.json();
      setOrder(updated);
      setMsg({ type: "ok", text: `Order marked as ${status}.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message ?? "Update failed." });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Order not found or API not connected.{" "}
          <Link href="/orders" className="underline">Back to orders</Link>
        </div>
      </div>
    );
  }

  const items: any[] = order.items ?? [];
  const shipping = order.shipping_fee ?? 0;
  const subtotal = order.subtotal ?? items.reduce((s: number, i: any) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-900">← Orders</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-900">#{order.order_number ?? order.id}</span>
        </div>

        {msg && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {msg.text}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            {/* Customer */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Customer</h2>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Name", order.customer_name ?? "—"],
                  ["Phone", order.customer_phone ?? "—"],
                  ["Division", order.division ?? "—"],
                  ["District", order.district ?? "—"],
                  ["Area", order.area ?? "—"],
                  ["Address", order.address ?? "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-0.5 text-slate-800">{val}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Items */}
            <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Items ({items.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover bg-slate-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900">৳{((item.price ?? 0) * (item.quantity ?? 1)).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">×{item.quantity ?? 1}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span><span>{shipping === 0 ? "Free" : `৳${shipping}`}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total</span><span>৳{(order.total ?? subtotal + shipping).toLocaleString()}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Status Panel */}
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Status</h2>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[order.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                {order.status ?? "—"}
              </span>

              <div className="mt-4 space-y-2">
                {STATUSES.filter((s) => s !== order.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={updating}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm font-medium capitalize text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    Mark as {s}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <h2 className="font-semibold text-slate-900 mb-3">Order Info</h2>
              <div className="space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID</span>
                  <span>#{order.order_number ?? order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment</span>
                  <span>{order.payment_method ?? "Cash on Delivery"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date</span>
                  <span>{order.created_at ? new Date(order.created_at).toLocaleDateString("en-BD") : "—"}</span>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">Note: </span>{order.notes}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
