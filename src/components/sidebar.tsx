"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NAV = [
  { label: "Dashboard", href: "/", icon: "⊞" },
  {
    section: "Analytics",
    items: [{ label: "Statistics", href: "/statistics", icon: "▲" }],
  },
  {
    section: "Commerce",
    items: [
      { label: "Orders", href: "/orders", icon: "◫" },
      { label: "Checkout Leads", href: "/checkout-leads", icon: "☏" },
      { label: "Delivery", href: "/delivery", icon: "▣" },
      { label: "Products", href: "/products", icon: "◻" },
      { label: "Categories", href: "/categories", icon: "◈" },
      { label: "Variant Settings", href: "/variant-settings", icon: "⋮⋮" },
      { label: "Reviews", href: "/reviews", icon: "◇" },
      { label: "Campaigns", href: "/campaigns", icon: "◆" },
    ],
  },
  {
    section: "Wholesale",
    items: [
      { label: "Production", href: "/wholesale/production", icon: "⚒" },
      { label: "Factory Cost Settings", href: "/wholesale/factory-settings", icon: "⌂" },
      { label: "Retail Cost Settings", href: "/wholesale/retail-settings", icon: "◱" },
      { label: "Cost Fields", href: "/wholesale/cost-fields", icon: "☰" },
    ],
  },
  {
    section: "Retail & POS",
    items: [
      { label: "POS Terminal", href: "/pos", icon: "⊟" },
      { label: "Shop Statistics", href: "/shop-statistics", icon: "▦" },
      { label: "Inventory", href: "/inventory", icon: "⊞" },
      { label: "Suppliers", href: "/suppliers", icon: "◩" },
      { label: "Purchase Orders", href: "/purchases", icon: "◪" },
      { label: "Returns & Exchange", href: "/returns", icon: "↩" },
      { label: "Customers CRM", href: "/customers-crm", icon: "◎" },
      { label: "Barcodes & Price Tags", href: "/barcodes", icon: "🏷" },
    ],
  },
  {
    section: "Content",
    items: [
      { label: "Blog Posts", href: "/posts", icon: "✎" },
      { label: "Homepage", href: "/homepage", icon: "⬡" },
      { label: "About", href: "/about", icon: "◎" },
      { label: "Policies", href: "/policies", icon: "◉" },
      { label: "FAQ", href: "/faq", icon: "◌" },
      { label: "SEO", href: "/seo", icon: "◑" },
    ],
  },
  {
    section: "Settings",
    items: [{ label: "Branding & Contact", href: "/branding", icon: "◐" }],
  },
];

function NavContent({
  onNavigate,
  handleLogout,
  isActive,
}: {
  onNavigate: () => void;
  handleLogout: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">
          RIZZ Admin
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">Control Panel</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item, i) => {
          if ("href" in item && item.href) {
            return (
              <Link
                key={item.href as string}
                href={item.href as string}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive(item.href as string)
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          }

          return (
            <div key={item.section} className={i > 0 ? "mt-4" : ""}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                {item.section}
              </p>
              {(item.items ?? []).map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive(sub.href)
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span className="text-base">{sub.icon}</span>
                  {sub.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-slate-500">RIZZ Leather · Chittagong</p>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-xs text-teal-400 hover:text-teal-300 transition"
        >
          View storefront →
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 text-xs text-slate-500 hover:text-rose-400 transition"
        >
          Log out
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-slate-950 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex flex-col gap-[5px] p-1"
        >
          <span className="block h-0.5 w-5 bg-white rounded" />
          <span className="block h-0.5 w-5 bg-white rounded" />
          <span className="block h-0.5 w-5 bg-white rounded" />
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-teal-400 leading-none">
            RIZZ Admin
          </p>
          <p className="text-sm font-semibold text-white leading-tight">Control Panel</p>
        </div>
      </header>

      {/* ── Mobile drawer backdrop ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile slide-over drawer ── */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-slate-950 shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">RIZZ Admin</p>
            <h1 className="mt-0.5 text-base font-semibold text-white">Control Panel</h1>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-white/60 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item, i) => {
            if ("href" in item && item.href) {
              return (
                <Link
                  key={item.href as string}
                  href={item.href as string}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive(item.href as string)
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={item.section} className={i > 0 ? "mt-4" : ""}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                  {item.section}
                </p>
                {(item.items ?? []).map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive(sub.href)
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{sub.icon}</span>
                    {sub.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-slate-500">RIZZ Leather · Chittagong</p>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs text-teal-400 hover:text-teal-300 transition"
          >
            View storefront →
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 text-xs text-slate-500 hover:text-rose-400 transition"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* ── Desktop sidebar (unchanged) ── */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 lg:flex">
        <NavContent
          onNavigate={() => {}}
          handleLogout={handleLogout}
          isActive={isActive}
        />
      </aside>
    </>
  );
}
