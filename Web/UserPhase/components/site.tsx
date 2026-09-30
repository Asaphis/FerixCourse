"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/tracks", label: "Tracks" },
  { href: "/method", label: "Method" },
  { href: "/live", label: "Live" },
  { href: "/catalog", label: "Catalog" },
];

export function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-4 rounded-2xl border border-white/10 bg-stone-950/85 shadow-[0_24px_70px_-24px_rgba(2,4,10,.9)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#f97316] to-[#e11d48] font-display text-[14px] font-extrabold tracking-tight text-white shadow-[0_8px_18px_-8px_rgba(249,115,22,.8)] transition group-hover:rotate-6"
                aria-hidden="true"
              >
                FC
              </span>
              <span className="leading-none">
                <span className="block font-display text-[16px] font-bold tracking-tight">FerixCourse</span>
                <span className="block text-[10.5px] font-medium text-slate-400">Learn. Ship. Repeat.</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[.03] p-1 lg:flex">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`relative rounded-full px-4 py-1.5 text-[13.5px] font-medium transition ${path === l.href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                  {l.label}
                  {path === l.href && <span className="absolute -bottom-[1px] left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f97316] to-[#e11d48]" />}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden px-3.5 py-2 text-[13.5px] font-medium text-slate-300 transition hover:text-white sm:inline">Log in</Link>
              <Link href="/register" className="group hidden items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-bold text-white btn-aurora sm:inline-flex">
                Start learning <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button onClick={() => setOpen(!open)} aria-label="Menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 lg:hidden">
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
          {open && (
            <nav className="grid gap-1 border-t border-white/8 p-3 lg:hidden">
              {[...LINKS, { href: "/login", label: "Log in" }, { href: "/register", label: "Start learning" }].map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${path === l.href ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}>
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const cols: [string, [string, string][]][] = [
    ["Learn", [["Tracks", "/tracks"], ["Method", "/method"], ["Live classes", "/live"], ["Catalog", "/catalog"]]],
    ["Personal", [["Book 1-on-1", "/book"], ["Request training", "/request"], ["Dashboard", "/dashboard"]]],
    ["Account", [["Log in", "/login"], ["Create account", "/register"], ["Profile", "/profile"]]],
  ];
  return (
    <footer className="relative overflow-hidden border-t border-white/8">
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#f97316] to-[#e11d48] font-display text-[14px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(249,115,22,.8)]" aria-hidden="true">FC</span>
            <span className="font-display text-lg font-bold">FerixCourse</span>
          </p>
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-slate-400">
            The live-first technology school. Small cohorts, real instructors, proof of skill.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {cols.map(([h, links]) => (
            <div key={h}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{h}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map(([t, href]) => (
                  <li key={t}><Link href={href} className="text-[13.5px] text-slate-400 transition hover:text-white">{t}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="relative border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[12px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 FerixCourse. Learn technology. Ship real software.</span>
          <span className="flex gap-5"><Link href="/about" className="hover:text-slate-300">About</Link><Link href="/terms" className="hover:text-slate-300">Terms</Link><Link href="/privacy" className="hover:text-slate-300">Privacy</Link><Link href="/contact" className="hover:text-slate-300">Contact</Link></span>
        </div>
      </div>
    </footer>
  );
}

export function MobileNav() {
  const path = usePathname();
  const items: [string, string][] = [["Home", "/"], ["Catalog", "/catalog"], ["Live", "/live"], ["Messages", "/messages"], ["You", "/profile"]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="m-3 grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-stone-900/95 p-1.5 backdrop-blur-2xl">
        {items.map(([t, h]) => (
          <Link key={t} href={h} className={`rounded-xl py-2 text-center text-[10.5px] font-semibold transition ${path === h ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"}`}>
            {t}
          </Link>
        ))}
      </div>
    </nav>
  );
}
