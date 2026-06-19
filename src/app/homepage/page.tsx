"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 w-full";
const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

const TABS = [
  { id: "hero",       label: "Hero Banner" },
  { id: "brandbar",   label: "Brand Bar" },
  { id: "editorial",  label: "Editorial Banner" },
  { id: "materials",  label: "Materials" },
  { id: "quote",      label: "Quote" },
  { id: "cta",        label: "CTA Banner" },
  { id: "factory",    label: "Factory & Quality Page" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Msg({ text, ok = true }: { text: string; ok?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-sm ${ok ? "border-teal-200 bg-teal-50 text-teal-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
      {text}
    </div>
  );
}

async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${API}/uploads`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`Upload failed → ${r.status}`);
  const data = await r.json();
  return data.url;
}

function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch {
      setError("Upload failed. Check API.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className={lbl}>{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload below" className={field} />
      <div className="flex items-center gap-3">
        <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer transition">
          {uploading ? "Uploading…" : "↑ Upload Image"}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </div>
  );
}

async function loadSection(key: string) {
  try {
    const r = await fetch(`${API}/homepage/${key}`, { cache: "no-store" });
    if (r.ok) return r.json();
  } catch {}
  return null;
}

async function saveSection(key: string, data: unknown) {
  const r = await fetch(`${API}/homepage/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("API error");
}

// ─── Hero ────────────────────────────────────────────────────────────────────

const HERO_DEFAULT = {
  image: "/assets/images/rizzslide.jpg",
  headline: "Crafted for\nthose who know.",
  subtext: "Artisan leather footwear and accessories.\nEach piece made by hand. None made in haste.",
  cta_primary_label: "Shop the Collection",
  cta_primary_href: "/brand/catalog",
  cta_secondary_label: "New Arrivals",
  cta_secondary_href: "/brand/catalog?sort=new",
  location_tag: "Chittagong · Bangladesh",
};

function HeroTab() {
  const [form, setForm] = useState(HERO_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSection("hero").then((d) => { if (d) setForm({ ...HERO_DEFAULT, ...d }); });
  }, []);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("hero", form);
      setMsg({ text: "Hero saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}

      {/* Preview */}
      <div className="relative rounded-xl overflow-hidden h-40 bg-slate-900">
        {form.image && (
          <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('${form.image}')` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="text-[9px] uppercase tracking-[0.4em] text-amber-300 opacity-70">{form.location_tag}</p>
          <p className="mt-2 text-white font-light text-lg leading-snug whitespace-pre-line">{form.headline || "Headline"}</p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-white text-slate-900 px-3 py-1 text-[10px] font-semibold">{form.cta_primary_label}</span>
            <span className="rounded-full border border-white/50 text-white px-3 py-1 text-[10px]">{form.cta_secondary_label}</span>
          </div>
        </div>
      </div>

      <ImageUploadField label="Background Image URL" value={form.image} onChange={(url) => set("image", url)} />
      <div>
        <p className={lbl}>Location Tag</p>
        <input value={form.location_tag} onChange={(e) => set("location_tag", e.target.value)} placeholder="Chittagong · Bangladesh" className={field} />
      </div>
      <div>
        <p className={lbl}>Headline (use \n for line break)</p>
        <textarea value={form.headline} onChange={(e) => set("headline", e.target.value)} rows={3} className={field + " resize-none"} />
      </div>
      <div>
        <p className={lbl}>Subtext</p>
        <textarea value={form.subtext} onChange={(e) => set("subtext", e.target.value)} rows={2} className={field + " resize-none"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={lbl}>Primary Button Label</p>
          <input value={form.cta_primary_label} onChange={(e) => set("cta_primary_label", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Primary Button Link</p>
          <input value={form.cta_primary_href} onChange={(e) => set("cta_primary_href", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Secondary Button Label</p>
          <input value={form.cta_secondary_label} onChange={(e) => set("cta_secondary_label", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Secondary Button Link</p>
          <input value={form.cta_secondary_href} onChange={(e) => set("cta_secondary_href", e.target.value)} className={field} />
        </div>
      </div>
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Hero"}
      </button>
    </form>
  );
}

// ─── Brand Bar ───────────────────────────────────────────────────────────────

const BRANDBAR_DEFAULT = {
  items: [
    "Genuine Leather",
    "Hand-Stitched",
    "COD Nationwide",
    "Ships Worldwide",
    "Free Returns",
  ],
  is_active: true,
};

function BrandBarTab() {
  const [items, setItems] = useState(BRANDBAR_DEFAULT.items);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSection("brandbar").then((d) => {
      if (d) { if (d.items) setItems(d.items); if (typeof d.is_active === "boolean") setIsActive(d.is_active); }
    });
  }, []);

  function updateItem(i: number, val: string) {
    setItems((arr) => arr.map((x, idx) => (idx === i ? val : x)));
  }
  function addItem() { setItems((arr) => [...arr, ""]); }
  function removeItem(i: number) { setItems((arr) => arr.filter((_, idx) => idx !== i)); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("brandbar", { items: items.filter(Boolean), is_active: isActive });
      setMsg({ text: "Brand bar saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}

      {/* Preview */}
      <div className="rounded-xl bg-slate-950 py-3 px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        {items.filter(Boolean).map((it, i) => (
          <span key={i} className="text-[9px] uppercase tracking-[0.3em] text-slate-400">{it}</span>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
        <span className="text-sm font-medium text-slate-800">Show brand bar on homepage</span>
      </label>

      <div className="space-y-2">
        <p className={lbl}>Trust Badge Items</p>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={(e) => updateItem(i, e.target.value)} placeholder={`Badge ${i + 1}`} className={field} />
            <button type="button" onClick={() => removeItem(i)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 hover:bg-rose-100 shrink-0">✕</button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">
          + Add Badge
        </button>
      </div>

      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Brand Bar"}
      </button>
    </form>
  );
}

// ─── Editorial Banner ─────────────────────────────────────────────────────────

const EDITORIAL_DEFAULT = {
  image: "/assets/images/rizz_crodile_slide_sandals/image07.jpg",
  tag: "The Signature",
  headline: "Made for men\nof distinction.",
  body: "Every Rizz piece begins as a single hide — selected, cut, and shaped by craftsmen who have spent decades understanding leather.",
  button_label: "Our Craft",
  button_href: "/factory-quality",
};

function EditorialTab() {
  const [form, setForm] = useState(EDITORIAL_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSection("editorial").then((d) => { if (d) setForm({ ...EDITORIAL_DEFAULT, ...d }); });
  }, []);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("editorial", form);
      setMsg({ text: "Editorial banner saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}

      {/* Preview */}
      <div className="relative rounded-xl overflow-hidden h-36 bg-slate-800">
        {form.image && (
          <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url('${form.image}')` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-[9px] uppercase tracking-[0.4em] text-amber-300 opacity-70">{form.tag}</p>
            <p className="mt-1 text-white font-light text-base leading-snug whitespace-pre-line">{form.headline}</p>
            <span className="mt-2 inline-block border border-white/40 text-white px-3 py-1 text-[10px] rounded">{form.button_label}</span>
          </div>
        </div>
      </div>

      <ImageUploadField label="Image URL" value={form.image} onChange={(url) => set("image", url)} />
      <div>
        <p className={lbl}>Tag (small label above headline)</p>
        <input value={form.tag} onChange={(e) => set("tag", e.target.value)} placeholder="The Signature" className={field} />
      </div>
      <div>
        <p className={lbl}>Headline</p>
        <textarea value={form.headline} onChange={(e) => set("headline", e.target.value)} rows={2} className={field + " resize-none"} />
      </div>
      <div>
        <p className={lbl}>Body Text</p>
        <textarea value={form.body} onChange={(e) => set("body", e.target.value)} rows={3} className={field + " resize-none"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={lbl}>Button Label</p>
          <input value={form.button_label} onChange={(e) => set("button_label", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Button Link</p>
          <input value={form.button_href} onChange={(e) => set("button_href", e.target.value)} className={field} />
        </div>
      </div>
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Editorial Banner"}
      </button>
    </form>
  );
}

// ─── Materials ────────────────────────────────────────────────────────────────

const MATERIALS_DEFAULT = {
  hero_image: "",
  hero_tag: "Substance",
  hero_headline: "The Leather We Choose",
  intro_body: "Sourced from the finest tanneries. Every hide is chosen for grain, weight, and how it ages over years of wear.",
  items: [
    { label: "Full-Grain Calfskin", desc: "The pinnacle of leather. Natural texture, unmatched durability." },
    { label: "Premium Suede", desc: "Velvety nap, rich depth. For the discerning touch." },
    { label: "Vegetable-Tanned", desc: "Traditional bark-tanning. Ages into a personal patina." },
    { label: "Crocodile-Emboss", desc: "Exotic texture, refined character. A statement in restraint." },
  ],
};

function MaterialsTab() {
  const [form, setForm] = useState(MATERIALS_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSection("materials").then((d) => { if (d) setForm({ ...MATERIALS_DEFAULT, ...d, items: d.items ?? MATERIALS_DEFAULT.items }); });
  }, []);

  function set(k: "hero_image" | "hero_tag" | "hero_headline" | "intro_body", v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function update(i: number, key: "label" | "desc", val: string) {
    setForm((f) => ({ ...f, items: f.items.map((m, idx) => idx === i ? { ...m, [key]: val } : m) }));
  }
  function add() { setForm((f) => ({ ...f, items: [...f.items, { label: "", desc: "" }] })); }
  function remove(i: number) { setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("materials", form);
      setMsg({ text: "Materials saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <p className="text-xs text-slate-400">
        The items below appear in the "The Leather We Choose" section on the homepage AND on the full /materials page.
        The hero fields below are used only on the full /materials page.
      </p>

      <ImageUploadField label="Materials Page Hero Image" value={form.hero_image} onChange={(url) => set("hero_image", url)} />
      <div>
        <p className={lbl}>Hero Tag</p>
        <input value={form.hero_tag} onChange={(e) => set("hero_tag", e.target.value)} placeholder="Substance" className={field} />
      </div>
      <div>
        <p className={lbl}>Hero Headline</p>
        <input value={form.hero_headline} onChange={(e) => set("hero_headline", e.target.value)} placeholder="The Leather We Choose" className={field} />
      </div>
      <div>
        <p className={lbl}>Intro Body</p>
        <textarea value={form.intro_body} onChange={(e) => set("intro_body", e.target.value)} rows={3} className={field + " resize-none"} />
      </div>

      <div className="space-y-3">
        <p className={lbl}>Material Items</p>
        {form.items.map((m, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Material {i + 1}</span>
              <button type="button" onClick={() => remove(i)} className="text-xs text-rose-600 hover:text-rose-800">Remove</button>
            </div>
            <div>
              <p className={lbl}>Label</p>
              <input value={m.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Full-Grain Calfskin" className={field} />
            </div>
            <div>
              <p className={lbl}>Description</p>
              <input value={m.desc} onChange={(e) => update(i, "desc", e.target.value)} placeholder="Short description..." className={field} />
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">
          + Add Material
        </button>
      </div>
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Materials"}
      </button>
    </form>
  );
}

// ─── Quote ────────────────────────────────────────────────────────────────────

const QUOTE_DEFAULT = {
  text: "Luxury is not about the price.\nIt is about how something makes you feel every time you wear it.",
  attribution: "— Rizz Atelier, Chittagong",
};

function QuoteTab() {
  const [form, setForm] = useState(QUOTE_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSection("quote").then((d) => { if (d) setForm({ ...QUOTE_DEFAULT, ...d }); });
  }, []);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("quote", form);
      setMsg({ text: "Quote saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}

      {/* Preview */}
      <div className="rounded-xl bg-slate-950 px-8 py-8 text-center">
        <p className="text-slate-200 italic text-base leading-relaxed whitespace-pre-line">
          &ldquo;{form.text}&rdquo;
        </p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.4em] text-amber-400 opacity-70">{form.attribution}</p>
      </div>

      <div>
        <p className={lbl}>Quote Text</p>
        <textarea value={form.text} onChange={(e) => set("text", e.target.value)} rows={4} className={field + " resize-none"} />
        <p className="mt-1 text-xs text-slate-400">Use \n for line breaks. No need to add quotation marks — they're added automatically.</p>
      </div>
      <div>
        <p className={lbl}>Attribution</p>
        <input value={form.attribution} onChange={(e) => set("attribution", e.target.value)} placeholder="— Rizz Atelier, Chittagong" className={field} />
      </div>
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Quote"}
      </button>
    </form>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

const CTA_DEFAULT = {
  image: "/assets/images/rizz_double_bockles-sandals/image02.jpg",
  tag: "Exclusive Access",
  headline: "The full collection awaits.",
  cta_primary_label: "Shop Now",
  cta_primary_href: "/brand/catalog",
  cta_secondary_label: "Enquire",
  cta_secondary_href: "/contact",
};

function CtaTab() {
  const [form, setForm] = useState(CTA_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSection("cta").then((d) => { if (d) setForm({ ...CTA_DEFAULT, ...d }); });
  }, []);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("cta", form);
      setMsg({ text: "CTA banner saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}

      {/* Preview */}
      <div className="relative rounded-xl overflow-hidden h-32 bg-slate-800">
        {form.image && (
          <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url('${form.image}')` }} />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="text-[9px] uppercase tracking-[0.4em] text-amber-300 opacity-70">{form.tag}</p>
          <p className="mt-1 text-white font-light text-base">{form.headline}</p>
          <div className="mt-2 flex gap-2">
            <span className="rounded-full bg-white text-slate-900 px-3 py-1 text-[10px] font-semibold">{form.cta_primary_label}</span>
            <span className="rounded-full border border-white/50 text-white px-3 py-1 text-[10px]">{form.cta_secondary_label}</span>
          </div>
        </div>
      </div>

      <ImageUploadField label="Background Image URL" value={form.image} onChange={(url) => set("image", url)} />
      <div>
        <p className={lbl}>Tag</p>
        <input value={form.tag} onChange={(e) => set("tag", e.target.value)} placeholder="Exclusive Access" className={field} />
      </div>
      <div>
        <p className={lbl}>Headline</p>
        <input value={form.headline} onChange={(e) => set("headline", e.target.value)} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={lbl}>Primary Button Label</p>
          <input value={form.cta_primary_label} onChange={(e) => set("cta_primary_label", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Primary Button Link</p>
          <input value={form.cta_primary_href} onChange={(e) => set("cta_primary_href", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Secondary Button Label</p>
          <input value={form.cta_secondary_label} onChange={(e) => set("cta_secondary_label", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Secondary Button Link</p>
          <input value={form.cta_secondary_href} onChange={(e) => set("cta_secondary_href", e.target.value)} className={field} />
        </div>
      </div>
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save CTA Banner"}
      </button>
    </form>
  );
}

// ─── Factory & Quality Page ────────────────────────────────────────────────────

const FACTORY_DEFAULT = {
  hero_image: "",
  hero_tag: "Our Craft",
  hero_headline: "Made for men of distinction.",
  intro_body: "Every Rizz piece begins as a single hide — selected, cut, and shaped by craftsmen who have spent decades understanding leather.",
  steps: [
    { title: "Selection", body: "Every hide is hand-inspected for grain, thickness, and finish before it ever touches a cutting table." },
    { title: "Cutting & Stitching", body: "Patterns are cut by hand, stitched by craftsmen who have spent years perfecting their trade." },
    { title: "Finishing", body: "Edges are burnished, hardware is fitted, and every piece is inspected before it leaves the workshop." },
  ],
};

function FactoryQualityTab() {
  const [form, setForm] = useState(FACTORY_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSection("factory-quality").then((d) => { if (d) setForm({ ...FACTORY_DEFAULT, ...d, steps: d.steps ?? FACTORY_DEFAULT.steps }); });
  }, []);

  function set(k: "hero_image" | "hero_tag" | "hero_headline" | "intro_body", v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function updateStep(i: number, key: "title" | "body", val: string) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? { ...s, [key]: val } : s) }));
  }
  function addStep() { setForm((f) => ({ ...f, steps: [...f.steps, { title: "", body: "" }] })); }
  function removeStep(i: number) { setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("factory-quality", form);
      setMsg({ text: "Factory & Quality page saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <p className="text-xs text-slate-400">Controls the /factory-quality page, linked from the "Our Craft" button on the homepage editorial banner.</p>

      <ImageUploadField label="Hero Image" value={form.hero_image} onChange={(url) => set("hero_image", url)} />
      <div>
        <p className={lbl}>Hero Tag</p>
        <input value={form.hero_tag} onChange={(e) => set("hero_tag", e.target.value)} placeholder="Our Craft" className={field} />
      </div>
      <div>
        <p className={lbl}>Hero Headline</p>
        <input value={form.hero_headline} onChange={(e) => set("hero_headline", e.target.value)} className={field} />
      </div>
      <div>
        <p className={lbl}>Intro Body</p>
        <textarea value={form.intro_body} onChange={(e) => set("intro_body", e.target.value)} rows={3} className={field + " resize-none"} />
      </div>

      <div className="space-y-3">
        <p className={lbl}>Process Steps</p>
        {form.steps.map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Step {i + 1}</span>
              <button type="button" onClick={() => removeStep(i)} className="text-xs text-rose-600 hover:text-rose-800">Remove</button>
            </div>
            <div>
              <p className={lbl}>Title</p>
              <input value={s.title} onChange={(e) => updateStep(i, "title", e.target.value)} placeholder="Selection" className={field} />
            </div>
            <div>
              <p className={lbl}>Description</p>
              <input value={s.body} onChange={(e) => updateStep(i, "body", e.target.value)} placeholder="Short description..." className={field} />
            </div>
          </div>
        ))}
        <button type="button" onClick={addStep} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">
          + Add Step
        </button>
      </div>
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Factory & Quality Page"}
      </button>
    </form>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function HomepagePage() {
  const [activeTab, setActiveTab] = useState<TabId>("hero");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Content</p>
          <h1 className="mt-1 text-2xl font-semibold">Homepage Editor</h1>
          <p className="mt-1 text-sm text-slate-400">
            Edit every section of the homepage — hero, banners, materials, quote, and more.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          {activeTab === "hero"      && <HeroTab />}
          {activeTab === "brandbar"  && <BrandBarTab />}
          {activeTab === "editorial" && <EditorialTab />}
          {activeTab === "materials" && <MaterialsTab />}
          {activeTab === "quote"     && <QuoteTab />}
          {activeTab === "cta"       && <CtaTab />}
          {activeTab === "factory"   && <FactoryQualityTab />}
        </section>
      </div>
    </div>
  );
}
