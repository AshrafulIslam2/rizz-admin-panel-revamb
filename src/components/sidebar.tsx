"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col border-r border-white/70 bg-slate-950/95 px-5 py-6 text-slate-100 shadow-[0_0_60px_rgba(15,23,42,0.18)] lg:flex">
      <div className="space-y-1 border-b border-white/10 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-300">RIZZ Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Content manager</h1>
        <p className="text-sm text-slate-400">A minimal workspace for nested page management.</p>
      </div>

      <nav className="mt-6 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl border border-teal-400/20 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-teal-300/40 hover:bg-teal-500/15"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-teal-300" />
          Pages
        </Link>

        <Link
          href="/hero"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20"
        >
          Hero
        </Link>

        <Link
          href="/faq"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20"
        >
          FAQ
        </Link>

        <Link
          href="/categories"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20"
        >
          Categories
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20"
        >
          Settings
        </Link>
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Backend connected</p>
        <p className="mt-1 text-slate-400">Hook this up to your pages endpoints.</p>
      </div>
    </aside>
  );
}
