"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";

const LINKS = [
  { href: "/tracks", label: "Tracks" },
  { href: "/method", label: "Method" },
  { href: "/live", label: "Live" },
  { href: "/learn", label: "Catalog" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/75 py-3 pl-4 pr-3 shadow-[0_24px_70px_-24px_rgba(2,4,10,.9)] backdrop-blur-2xl">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 shadow-[0_0_30px_-6px_rgba(217,70,239,.7)] transition group-hover:rotate-6">
              <GraduationCap size={18} className="text-white" />
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight">FerixCourse</span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[.03] p-1 lg:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className={`rounded-full px-4 py-1.5 text-[13.5px] font-medium transition ${path === l.href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-3.5 py-2 text-[13.5px] font-medium text-slate-300 transition hover:text-white sm:inline">Log in</Link>
            <Link href="/register" className="group inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-bold text-white btn-aurora">
              Start learning <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const cols: [string, [string, string][]][] = [
    ["Learn", [["Tracks", "/tracks"], ["Method", "/method"], ["Live classes", "/live"], ["Catalog", "/learn"]]],
    ["Personal", [["Book 1-on-1", "/book"], ["Request training", "/request"], ["Dashboard", "/dashboard"]]],
    ["Account", [["Log in", "/login"], ["Create account", "/register"], ["Profile", "/profile"]]],
  ];
  return (
    <footer className="relative overflow-hidden border-t border-white/8">
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400"><GraduationCap size={18} className="text-white" /></span>
            <span className="font-display text-lg font-bold">FerixCourse</span>
          </p>
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-slate-500">
            Practical technology training — live classrooms, recorded courses, and private mentorship.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {cols.map(([h, links]) => (
            <div key={h}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{h}</p>
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
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[12px] text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 FerixCourse. Learn technology. Ship real software.</span>
          <span className="flex gap-5"><a href="#" className="hover:text-slate-300">Terms</a><a href="#" className="hover:text-slate-300">Privacy</a><a href="#" className="hover:text-slate-300">Support</a></span>
        </div>
      </div>
    </footer>
  );
}

export function MobileNav() {
  const path = usePathname();
  const items: [string, string][] = [["Home", "/"], ["Catalog", "/learn"], ["Live", "/live"], ["Messages", "/messages"], ["You", "/profile"]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="m-3 grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-night-900/95 p-1.5 backdrop-blur-2xl">
        {items.map(([t, h]) => (
          <Link key={t} href={h} className={`rounded-xl py-2 text-center text-[10.5px] font-semibold transition ${path === h ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"}`}>
            {t}
          </Link>
        ))}
      </div>
    </nav>
  );
}
