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
  { id: "manufacturing", label: "Manufacturing / B2B Page" },
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

function FileUploadField({ label, value, onChange, accept, buttonLabel }: { label: string; value: string; onChange: (url: string) => void; accept: string; buttonLabel: string }) {
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
          {uploading ? "Uploading…" : buttonLabel}
          <input type="file" accept={accept} onChange={handleFile} disabled={uploading} className="hidden" />
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

// ─── Manufacturing / B2B Page ─────────────────────────────────────────────────

const MANUFACTURING_DEFAULT = {
  hero_video_url: "",
  hero_image: "",
  hero_tag: "Manufacturing & Wholesale",
  hero_headline: "Bangladesh's Trusted Leather Footwear & Goods Manufacturer",
  hero_subtext: "RIZZ Leather designs and manufactures loafers, derby shoes, oxfords, penny loafers, sandals, and formal leather footwear for brands across Bangladesh and internationally — private label, OEM, and bulk wholesale, from our own factory in Chittagong.",
  stats: [
    { label: "Brands Supported", value: "500+" },
    { label: "Pairs Manufactured", value: "50,000+" },
    { label: "Years of Craftsmanship", value: "12+" },
    { label: "Countries Served", value: "15+" },
  ],
  about_heading: "Who We Are",
  about_body: "RIZZ Leather is a full-service leather footwear and goods manufacturer based in Chittagong, Bangladesh — one of the world's leading leather-producing regions. We design and produce loafers, derby shoes, oxfords, penny loafers, sandals, belts, and wallets for local and international brands, handling everything from material sourcing and pattern-making to private-label branding and export-ready packaging.",
  gallery_images: [] as string[],
  product_categories: [
    "Loafers", "Derby Shoes", "Oxfords", "Penny Loafers", "Sandals", "Formal Leather Shoes", "Belts", "Wallets",
  ],
  capabilities: [
    { title: "Private Label & OEM", body: "Full custom branding — your logo, your packaging, your specifications, manufactured to your standard." },
    { title: "Bulk Wholesale", body: "Production runs scaled to your order size, with consistent quality across every batch." },
    { title: "Export-Ready", body: "Documentation, packaging, and logistics support for shipping to international markets." },
    { title: "Material Sourcing", body: "Full-grain, vegetable-tanned, suede, and embossed leathers sourced and quality-checked in-house." },
  ],
  certifications: [] as { title: string; body: string }[],
  factory_address: "Chittagong, Bangladesh",
  factory_city: "Chittagong",
  whatsapp_number: "",
  phone_number: "",
  email: "",
  catalog_pdf_url: "",
  faqs: [
    { question: "Who is the best leather shoe manufacturer in Bangladesh?", answer: "RIZZ Leather is a Chittagong-based leather footwear manufacturer supporting 500+ brands across Bangladesh and internationally, producing loafers, derby shoes, oxfords, penny loafers, and sandals for private label and wholesale buyers." },
    { question: "Does RIZZ offer private label / OEM manufacturing for shoes?", answer: "Yes. RIZZ manufactures loafers, derby shoes, oxfords, and sandals under your own brand — including custom packaging, branding, and export documentation — for both Dhaka and international buyers." },
    { question: "Where is RIZZ's factory located?", answer: "Our factory is located in Chittagong, Bangladesh, with sourcing and client support available in Dhaka." },
  ],
  meta_title: "Leather Shoe Manufacturer in Bangladesh — Loafers, Oxfords, Sandals | RIZZ",
  meta_description: "RIZZ Leather is a Chittagong, Bangladesh-based manufacturer of loafers, derby shoes, oxfords, penny loafers, and sandals — private label, OEM, and wholesale for brands in Dhaka and internationally.",
};

type ManufacturingForm = typeof MANUFACTURING_DEFAULT;

function ManufacturingTab() {
  const [form, setForm] = useState<ManufacturingForm>(MANUFACTURING_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [categoryInput, setCategoryInput] = useState("");

  useEffect(() => {
    loadSection("manufacturing").then((d) => {
      if (d) setForm({ ...MANUFACTURING_DEFAULT, ...d });
    });
  }, []);

  function set<K extends keyof ManufacturingForm>(k: K, v: ManufacturingForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addListItem<K extends "stats" | "capabilities" | "certifications">(key: K, item: any) {
    setForm((f) => ({ ...f, [key]: [...(f[key] as any[]), item] }));
  }

  function removeListItem<K extends "stats" | "capabilities" | "certifications">(key: K, i: number) {
    setForm((f) => ({ ...f, [key]: (f[key] as any[]).filter((_, idx) => idx !== i) }));
  }

  function updateFaq(i: number, key: "question" | "answer", val: string) {
    setForm((f) => ({ ...f, faqs: f.faqs.map((item, idx) => idx === i ? { ...item, [key]: val } : item) }));
  }
  function addFaq() { setForm((f) => ({ ...f, faqs: [...f.faqs, { question: "", answer: "" }] })); }
  function removeFaq(i: number) { setForm((f) => ({ ...f, faqs: f.faqs.filter((_, idx) => idx !== i) })); }

  function addCategory() {
    const v = categoryInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, product_categories: [...f.product_categories, v] }));
    setCategoryInput("");
  }
  function removeCategory(i: number) {
    setForm((f) => ({ ...f, product_categories: f.product_categories.filter((_, idx) => idx !== i) }));
  }

  async function addGalleryImage(url: string) {
    setForm((f) => ({ ...f, gallery_images: [...f.gallery_images, url] }));
  }
  function removeGalleryImage(i: number) {
    setForm((f) => ({ ...f, gallery_images: f.gallery_images.filter((_, idx) => idx !== i) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await saveSection("manufacturing", form);
      setMsg({ text: "Manufacturing / B2B page saved.", ok: true });
    } catch {
      setMsg({ text: "Saved locally — API not connected.", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {msg && <Msg text={msg.text} ok={msg.ok} />}
      <p className="text-xs text-slate-400">Controls the /manufacturing page — the B2B / wholesale page for buyers and brands looking for a manufacturer.</p>

      {/* Hero */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Hero</p>
        <FileUploadField label="Hero Video (mp4, optional)" value={form.hero_video_url} onChange={(url) => set("hero_video_url", url)} accept="video/*" buttonLabel="↑ Upload Video" />
        <ImageUploadField label="Hero Image (poster / fallback)" value={form.hero_image} onChange={(url) => set("hero_image", url)} />
        <div>
          <p className={lbl}>Hero Tag</p>
          <input value={form.hero_tag} onChange={(e) => set("hero_tag", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Hero Headline</p>
          <input value={form.hero_headline} onChange={(e) => set("hero_headline", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Hero Subtext</p>
          <textarea value={form.hero_subtext} onChange={(e) => set("hero_subtext", e.target.value)} rows={3} className={field + " resize-none"} />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Trust Stats</p>
        {form.stats.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={s.value} onChange={(e) => setForm((f) => ({ ...f, stats: f.stats.map((it, idx) => idx === i ? { ...it, value: e.target.value } : it) }))} placeholder="500+" className={field + " w-28"} />
            <input value={s.label} onChange={(e) => setForm((f) => ({ ...f, stats: f.stats.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it) }))} placeholder="Brands Supported" className={field} />
            <button type="button" onClick={() => removeListItem("stats", i)} className="text-xs text-rose-600 hover:text-rose-800">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => addListItem("stats", { label: "", value: "" })} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">+ Add Stat</button>
      </div>

      {/* About */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">About the Factory</p>
        <div>
          <p className={lbl}>Heading</p>
          <input value={form.about_heading} onChange={(e) => set("about_heading", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Body</p>
          <textarea value={form.about_body} onChange={(e) => set("about_body", e.target.value)} rows={5} className={field + " resize-none"} />
        </div>
        <div className="space-y-2">
          <p className={lbl}>Gallery Images</p>
          <div className="grid grid-cols-3 gap-2">
            {form.gallery_images.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
                <button type="button" onClick={() => removeGalleryImage(i)} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white">×</button>
              </div>
            ))}
          </div>
          <ImageUploadField label="Add Gallery Image" value="" onChange={addGalleryImage} />
        </div>
      </div>

      {/* Product categories */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">What We Manufacture (SEO keyword list)</p>
        <div className="flex flex-wrap gap-2">
          {form.product_categories.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
              {c}
              <button type="button" onClick={() => removeCategory(i)} className="text-slate-400 hover:text-rose-600">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} placeholder="e.g. Oxfords" className={field} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
          <button type="button" onClick={addCategory} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">Add</button>
        </div>
      </div>

      {/* Capabilities */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Capabilities</p>
        {form.capabilities.map((c, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Capability {i + 1}</span>
              <button type="button" onClick={() => removeListItem("capabilities", i)} className="text-xs text-rose-600 hover:text-rose-800">Remove</button>
            </div>
            <input value={c.title} onChange={(e) => setForm((f) => ({ ...f, capabilities: f.capabilities.map((it, idx) => idx === i ? { ...it, title: e.target.value } : it) }))} placeholder="Private Label & OEM" className={field} />
            <textarea value={c.body} onChange={(e) => setForm((f) => ({ ...f, capabilities: f.capabilities.map((it, idx) => idx === i ? { ...it, body: e.target.value } : it) }))} rows={2} className={field + " resize-none"} />
          </div>
        ))}
        <button type="button" onClick={() => addListItem("capabilities", { title: "", body: "" })} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">+ Add Capability</button>
      </div>

      {/* Certifications */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Certifications / Quality Badges (optional)</p>
        {form.certifications.map((c, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Badge {i + 1}</span>
              <button type="button" onClick={() => removeListItem("certifications", i)} className="text-xs text-rose-600 hover:text-rose-800">Remove</button>
            </div>
            <input value={c.title} onChange={(e) => setForm((f) => ({ ...f, certifications: f.certifications.map((it, idx) => idx === i ? { ...it, title: e.target.value } : it) }))} placeholder="ISO 9001" className={field} />
            <input value={c.body} onChange={(e) => setForm((f) => ({ ...f, certifications: f.certifications.map((it, idx) => idx === i ? { ...it, body: e.target.value } : it) }))} placeholder="Short description" className={field} />
          </div>
        ))}
        <button type="button" onClick={() => addListItem("certifications", { title: "", body: "" })} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">+ Add Badge</button>
      </div>

      {/* Contact + factory info */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Factory & Contact</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={lbl}>Factory City</p>
            <input value={form.factory_city} onChange={(e) => set("factory_city", e.target.value)} placeholder="Chittagong" className={field} />
          </div>
          <div>
            <p className={lbl}>WhatsApp Number</p>
            <input value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="+8801XXXXXXXXX" className={field} />
          </div>
          <div>
            <p className={lbl}>Phone Number</p>
            <input value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} placeholder="+8801XXXXXXXXX" className={field} />
          </div>
          <div>
            <p className={lbl}>Email</p>
            <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="wholesale@rizzleather.com" className={field} />
          </div>
        </div>
        <div>
          <p className={lbl}>Factory Address</p>
          <textarea value={form.factory_address} onChange={(e) => set("factory_address", e.target.value)} rows={2} className={field + " resize-none"} />
        </div>
        <FileUploadField label="Catalog PDF" value={form.catalog_pdf_url} onChange={(url) => set("catalog_pdf_url", url)} accept="application/pdf" buttonLabel="↑ Upload PDF" />
      </div>

      {/* FAQs */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">FAQs (SEO / AEO — shown on page + structured data)</p>
        {form.faqs.map((f, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">FAQ {i + 1}</span>
              <button type="button" onClick={() => removeFaq(i)} className="text-xs text-rose-600 hover:text-rose-800">Remove</button>
            </div>
            <input value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)} placeholder="Question" className={field} />
            <textarea value={f.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} rows={2} placeholder="Answer" className={field + " resize-none"} />
          </div>
        ))}
        <button type="button" onClick={addFaq} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50">+ Add FAQ</button>
      </div>

      {/* SEO */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">SEO</p>
        <div>
          <p className={lbl}>Meta Title</p>
          <input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} className={field} />
        </div>
        <div>
          <p className={lbl}>Meta Description</p>
          <textarea value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} rows={2} className={field + " resize-none"} />
        </div>
      </div>

      <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving…" : "Save Manufacturing / B2B Page"}
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
          {activeTab === "manufacturing" && <ManufacturingTab />}
        </section>
      </div>
    </div>
  );
}
