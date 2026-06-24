"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    label: "Dashboard",
    href: "/",
    icon: "⊞",
  },
  {
    section: "Commerce",
    items: [
      { label: "Orders", href: "/orders", icon: "◫" },
      { label: "Checkout Leads", href: "/checkout-leads", icon: "☏" },
      { label: "Delivery", href: "/delivery", icon: "▣" },
      { label: "Products", href: "/products", icon: "◻" },
      { label: "Categories", href: "/categories", icon: "◈" },
      { label: "Reviews", href: "/reviews", icon: "◇" },
      { label: "Campaigns", href: "/campaigns", icon: "◆" },
    ],
  },
  {
    section: "Content",
    items: [
      { label: "Homepage", href: "/homepage", icon: "⬡" },
      { label: "About", href: "/about", icon: "◎" },
      { label: "Policies", href: "/policies", icon: "◉" },
      { label: "FAQ", href: "/faq", icon: "◌" },
      { label: "SEO", href: "/seo", icon: "◑" },
    ],
  },
  {
    section: "Settings",
    items: [
      { label: "Branding & Contact", href: "/branding", icon: "◐" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">RIZZ Admin</p>
        <h1 className="mt-1 text-lg font-semibold text-white">Control Panel</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item, i) => {
          if ("href" in item && item.href) {
            return (
              <Link
                key={item.href as string}
                href={item.href as string}
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
  );
}
