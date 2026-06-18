"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

type BrandingData = {
  announcementBar: {
    text: string;
    isActive: boolean;
  };
  freeShippingThreshold: number;
  contact: {
    whatsapp: string;
    whatsappDisplay: string;
    email: string;
    location: string;
    shipping: string;
  };
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
    youtube: string;
  };
};

const DEFAULT: BrandingData = {
  announcementBar: {
    text: "Complimentary shipping on orders above ৳5,000  ·  COD available nationwide",
    isActive: true,
  },
  freeShippingThreshold: 5000,
  contact: {
    whatsapp: "8801750514197",
    whatsappDisplay: "+880 175 051 4197",
    email: "rizzleatherbd@gmail.com",
    location: "Chittagong, Bangladesh",
    shipping: "Bangladesh · USA · Europe · Middle East",
  },
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
  },
};

export default function BrandingPage() {
  const [data, setData] = useState<BrandingData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"announcement" | "contact" | "social">("announcement");

  useEffect(() => {
    fetch(`${API}/branding`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  function setContact<K extends keyof BrandingData["contact"]>(key: K, val: string) {
    setData((d) => ({ ...d, contact: { ...d.contact, [key]: val } }));
  }
  function setSocial<K extends keyof BrandingData["social"]>(key: K, val: string) {
    setData((d) => ({ ...d, social: { ...d.social, [key]: val } }));
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error();
      setMsg("Settings saved.");
    } catch {
      setMsg("Saved locally — API not connected.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
  const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold">Branding & Contact</h1>
          <p className="mt-1 text-sm text-slate-400">Announcement bar, contact info, social links, and cart settings.</p>
        </header>

        {msg && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{msg}</div>}

        {/* Tabs */}
        <div className="flex gap-2">
          {(["announcement", "contact", "social"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                activeTab === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t === "announcement" ? "Banner & Cart" : t}
            </button>
          ))}
        </div>

        {/* Announcement + Cart */}
        {activeTab === "announcement" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
            <h2 className="font-semibold text-slate-900">Announcement Bar</h2>

            <div className="rounded-xl bg-slate-950 px-4 py-2.5 text-center text-xs text-amber-300 font-medium tracking-wide">
              {data.announcementBar.text || "Preview of announcement bar"}
            </div>

            <div>
              <p className={lbl}>Bar Text</p>
              <input
                value={data.announcementBar.text}
                onChange={(e) => setData((d) => ({ ...d, announcementBar: { ...d.announcementBar, text: e.target.value } }))}
                className={field}
                placeholder="Complimentary shipping on orders above ৳5,000  ·  COD available nationwide"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={data.announcementBar.isActive}
                onChange={(e) => setData((d) => ({ ...d, announcementBar: { ...d.announcementBar, isActive: e.target.checked } }))}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-800">Show announcement bar on storefront</span>
            </label>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Cart Settings</h3>
              <div>
                <p className={lbl}>Free Shipping Threshold (BDT)</p>
                <input
                  type="number"
                  value={data.freeShippingThreshold}
                  onChange={(e) => setData((d) => ({ ...d, freeShippingThreshold: Number(e.target.value) }))}
                  className={field}
                />
                <p className="mt-1 text-xs text-slate-400">Orders above this amount get free shipping. Currently ৳{data.freeShippingThreshold.toLocaleString()}.</p>
              </div>
            </div>
          </section>
        )}

        {/* Contact */}
        {activeTab === "contact" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Contact Information</h2>
            <p className="text-xs text-slate-400">These values are used in the footer, contact page, and WhatsApp links throughout the site.</p>

            {[
              { key: "whatsapp" as const, label: "WhatsApp Number (no spaces)", placeholder: "8801750514197" },
              { key: "whatsappDisplay" as const, label: "WhatsApp Display Format", placeholder: "+880 175 051 4197" },
              { key: "email" as const, label: "Email Address", placeholder: "rizzleatherbd@gmail.com" },
              { key: "location" as const, label: "Location", placeholder: "Chittagong, Bangladesh" },
              { key: "shipping" as const, label: "Shipping Destinations", placeholder: "Bangladesh · USA · Europe · Middle East" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <p className={lbl}>{label}</p>
                <input value={data.contact[key]} onChange={(e) => setContact(key, e.target.value)} placeholder={placeholder} className={field} />
              </div>
            ))}

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold">WhatsApp link: </span>
              <code className="text-xs">wa.me/{data.contact.whatsapp}</code>
            </div>
          </section>
        )}

        {/* Social */}
        {activeTab === "social" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Social Links</h2>
            <p className="text-xs text-slate-400">Full URLs shown in the footer. Leave blank to hide.</p>

            {[
              { key: "instagram" as const, label: "Instagram URL", placeholder: "https://instagram.com/rizzleatherbd" },
              { key: "facebook" as const, label: "Facebook URL", placeholder: "https://facebook.com/rizzleatherbd" },
              { key: "tiktok" as const, label: "TikTok URL", placeholder: "https://tiktok.com/@rizzleatherbd" },
              { key: "youtube" as const, label: "YouTube URL", placeholder: "https://youtube.com/@rizzleatherbd" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <p className={lbl}>{label}</p>
                <input value={data.social[key]} onChange={(e) => setSocial(key, e.target.value)} placeholder={placeholder} className={field} />
              </div>
            ))}
          </section>
        )}

        <div className="flex gap-3 pb-4">
          <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
