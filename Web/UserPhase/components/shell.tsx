"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Radio, MessageSquare, User, Bell, Receipt, GraduationCap, CalendarCheck, Wand2,
} from "lucide-react";

import Protected from "./Protected";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-courses", label: "My Courses", icon: BookOpen },
  { href: "/classes", label: "My Classrooms", icon: Radio },
  { href: "/learn", label: "Browse Catalog", icon: GraduationCap },
  { href: "/request", label: "Classroom Requests", icon: Wand2 },
  { href: "/book", label: "One-on-One", icon: CalendarCheck },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/profile", label: "Profile", icon: User },
];

export default function AppShell({ children, title, sub, publicPage }: { children: React.ReactNode; title?: string; sub?: string; publicPage?: boolean }) {
  const path = usePathname();
  return (
    <Protected disabled={publicPage}>
    <div className="relative min-h-screen bg-stone-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-orange-700/15 via-rose-600/5 to-transparent" />
      <div className="relative md:flex">
        <aside className="sticky top-0 hidden min-h-screen w-64 shrink-0 flex-col border-r border-white/8 bg-stone-900/60 p-4 backdrop-blur md:flex">
          <Link href="/" className="flex items-center gap-2.5 px-2 pt-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 via-rose-500 to-amber-400"><GraduationCap size={16} className="text-white" /></span>
            <span className="font-display text-[16px] font-bold">FerixCourse</span>
          </Link>
          <nav className="mt-7 space-y-1">
            {ITEMS.map((i) => (
              <Link key={i.href} href={i.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${path === i.href ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <i.icon size={17} /> {i.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.03] p-4 text-[12px] leading-relaxed text-slate-500">
            Enrollments unlock only after verified payment. Nothing here is simulated.
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8">
            {title && (
              <div className="mb-6">
                <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
                {sub && <p className="mt-1.5 text-[14px] text-slate-400">{sub}</p>}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="m-3 grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-stone-900/95 p-1.5 backdrop-blur-2xl">
          {[["Board", "/dashboard"], ["Catalog", "/learn"], ["Rooms", "/classes"], ["Chat", "/messages"], ["You", "/profile"]].map(([t, h]) => (
            <Link key={t} href={h} className={`rounded-xl py-2 text-center text-[10.5px] font-semibold transition ${path === h ? "bg-white/10 text-white" : "text-slate-500"}`}>{t}</Link>
          ))}
        </div>
      </nav>
    </div>
    </Protected>
  );
}
