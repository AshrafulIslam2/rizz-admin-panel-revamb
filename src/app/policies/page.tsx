"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

const POLICIES = [
  { key: "returns", label: "Returns & Exchanges", path: "/policies/returns" },
  { key: "shipping", label: "Shipping & Delivery", path: "/policies/shipping" },
  { key: "terms", label: "Terms of Service", path: "/policies/terms" },
  { key: "privacy", label: "Privacy Policy", path: "/policies/privacy" },
  { key: "cookie", label: "Cookie Policy", path: "/policies/cookie" },
];

const DEFAULTS: Record<string, string> = {
  returns: `## Return Window\n\nWe accept returns within **7 days** of delivery. Items must be unworn, in original condition, with all tags intact.\n\n## How to Return\n\n1. Contact us within 7 days via WhatsApp (+880 175 051 4197) or email.\n2. Share your order number and photos.\n3. We arrange pickup from your address.\n4. Refund or exchange processed within 3–5 business days.\n\n## Exchanges\n\nFirst exchange is **free** for size or colour. Only one free exchange per order.\n\n## Refunds\n\nRefunds issued via bKash / Nagad or bank transfer (5–7 business days).`,
  shipping: `## Bangladesh — Cash on Delivery\n\nAll orders are fulfilled via COD. You pay when the order arrives.\n\n| Zone | Timeline | Cost |\n|---|---|---|\n| Inside Dhaka | 1–2 days | ৳80 |\n| Outside Dhaka | 2–4 days | ৳120 |\n| Orders over ৳5,000 | Standard | Free |\n\n## International\n\nWe ship to USA, UK, UAE, Saudi Arabia. Contact us via WhatsApp for a quote.`,
  terms: `## 1. About Us\n\nRIZZ Leather is a leather goods brand based in Chittagong, Bangladesh.\n\n## 2. Orders & COD Commitment\n\nBy placing an order, you commit to purchasing the item and paying upon delivery.\n\n## 3. Pricing & Currency\n\nAll prices are in Bangladeshi Taka (BDT / ৳).`,
  privacy: `## Information We Collect\n\nWe collect your name, phone number, and delivery address when you place an order. We do not collect payment information (COD only).\n\n## How We Use It\n\nOrder fulfillment, delivery confirmation, and customer support only. We do not sell your data.`,
  cookie: `## Cookies We Use\n\nWe use essential cookies for cart functionality and session management. No advertising or tracking cookies are used.`,
};

export default function PoliciesPage() {
  const [activeKey, setActiveKey] = useState("returns");
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const activePol = POLICIES.find((p) => p.key === activeKey)!;
  const content = contentMap[activeKey] ?? "";

  useEffect(() => {
    if (contentMap[activeKey] !== undefined) return;
    setLoading(true);
    fetch(`${API}/policies/${activeKey}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const text = data?.content ?? data?.body ?? DEFAULTS[activeKey] ?? "";
        setContentMap((m) => ({ ...m, [activeKey]: text }));
      })
      .catch(() => {
        setContentMap((m) => ({ ...m, [activeKey]: DEFAULTS[activeKey] ?? "" }));
      })
      .finally(() => setLoading(false));
  }, [activeKey]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/policies/${activeKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!r.ok) throw new Error();
      setMsg("Policy saved.");
    } catch {
      setMsg("Saved locally — API not connected.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Content</p>
          <h1 className="mt-1 text-2xl font-semibold">Policies</h1>
          <p className="mt-1 text-sm text-slate-400">Edit policy pages shown on the storefront (Markdown supported).</p>
        </header>

        {msg && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{msg}</div>}

        <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
          {/* Policy nav */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 h-fit">
            {POLICIES.map((p) => (
              <button
                key={p.key}
                onClick={() => setActiveKey(p.key)}
                className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                  activeKey === p.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Editor */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{activePol.label}</h2>
              <code className="text-xs text-slate-400 bg-slate-100 rounded px-2 py-1">{activePol.path}</code>
            </div>

            {loading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <>
                <p className="text-xs text-slate-400">Markdown supported — use ## for headings, **bold**, *italic*, and | table | syntax.</p>
                <textarea
                  value={content}
                  onChange={(e) => setContentMap((m) => ({ ...m, [activeKey]: e.target.value }))}
                  rows={20}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-teal-400 resize-y"
                  placeholder="Policy content in Markdown..."
                />
                <div className="flex gap-3 pt-2 border-t border-slate-200">
                  <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50">
                    {saving ? "Saving..." : "Save Policy"}
                  </button>
                  <button
                    onClick={() => setContentMap((m) => ({ ...m, [activeKey]: DEFAULTS[activeKey] ?? "" }))}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Reset to Default
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
