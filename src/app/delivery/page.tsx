"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type DeliverySettings = {
  free_delivery_global: boolean;
  flat_fee: number;
};

export default function DeliveryPage() {
  const [settings, setSettings] = useState<DeliverySettings>({ free_delivery_global: false, flat_fee: 60 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`${API}/delivery-settings`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(next: Partial<DeliverySettings>) {
    setSaving(true);
    setMsg(null);
    const updated = { ...settings, ...next };
    setSettings(updated);
    try {
      const r = await fetch(`${API}/delivery-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setMsg({ text: "Saved.", ok: true });
    } catch {
      setMsg({ text: "Failed to save. Check API.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Commerce</p>
          <h1 className="mt-1 text-2xl font-semibold">Delivery</h1>
          <p className="mt-1 text-sm text-slate-400">Control delivery charges across the whole site.</p>
        </header>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">Free Delivery — Sitewide</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Turn this on to waive delivery charges for every order, regardless of product or campaign. One click, applies instantly.
                  </p>
                </div>
                <button
                  onClick={() => save({ free_delivery_global: !settings.free_delivery_global })}
                  disabled={saving}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                    settings.free_delivery_global ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      settings.free_delivery_global ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {settings.free_delivery_global && (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  ✓ Delivery is free for everyone right now.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-semibold text-slate-900">Flat Delivery Fee</p>
              <p className="mt-1 text-sm text-slate-500">Charged on every order across Bangladesh, unless waived above, by a product, or by an active campaign.</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-slate-500">৳</span>
                <input
                  type="number"
                  min={0}
                  value={settings.flat_fee}
                  onChange={(e) => setSettings((s) => ({ ...s, flat_fee: Number(e.target.value) }))}
                  onBlur={() => save({ flat_fee: settings.flat_fee })}
                  disabled={saving}
                  className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              <p className="font-semibold text-slate-900">Other ways delivery becomes free</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Per-product: open a product in <span className="font-medium text-slate-700">Products</span> → Basic Info and enable &quot;Free Delivery for this product&quot;.</li>
                <li>Campaign: any active campaign with &quot;Free Shipping&quot; enabled in <span className="font-medium text-slate-700">Campaigns</span>.</li>
              </ul>
            </div>

            {msg && (
              <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
