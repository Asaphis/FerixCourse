"use client";
import Link from "next/link";
import { LayoutDashboard, BookOpen, Radio, MessageSquare, User, Bell, Receipt } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/classes", label: "Live Classes", icon: Radio },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/10 bg-ink-900/60 min-h-screen sticky top-0 p-4">
      <Link href="/" className="font-display font-extrabold text-lg px-2">Ferix<span className="text-gradient">Course</span></Link>
      <nav className="mt-6 space-y-1">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white">
            <i.icon size={18} /> {i.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto glass rounded-2xl p-4 text-xs text-slate-400">
        Real backend only — no mock data. Enrollments unlock after verified payment.
      </div>
    </aside>
  );
}

export function BottomNav() {
  const mobile = [
    { href: "/", label: "Home" },
    { href: "/learn", label: "Learn" },
    { href: "/classes", label: "Classes" },
    { href: "/messages", label: "Messages" },
    { href: "/profile", label: "Profile" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50">
      <div className="m-3 glass rounded-2xl grid grid-cols-5 text-[11px] text-slate-300 py-2">
        {mobile.map((t) => (
          <Link key={t.label} href={t.href} className="flex flex-col items-center gap-1 py-1 hover:text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400/60" />{t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
