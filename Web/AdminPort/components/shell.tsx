"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, BookOpen, Radio, Inbox, CalendarCheck,
  Receipt, MonitorPlay, Disc3, FolderOpen, MessagesSquare, Bell, Settings, LogOut, ExternalLink,
} from "lucide-react";
import { supabase, siteUrl } from "@/lib/admin";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/classrooms", label: "Classrooms", icon: Radio },
  { href: "/requests", label: "Class Requests", icon: Inbox },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/transactions", label: "Payments", icon: Receipt },
  { href: "/sessions", label: "Live Sessions", icon: MonitorPlay },
  { href: "/recordings", label: "Recordings", icon: Disc3 },
  { href: "/materials", label: "Materials", icon: FolderOpen },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? ""));
  }, []);
  const current = nav.find((i) => i.href === path);

  async function logout() {
    await supabase().auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-ink-950 md:flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/10 bg-ink-900/70 min-h-screen sticky top-0 p-4">
        <Link href="/" className="flex items-center gap-2.5 px-2 pt-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-cyan-400 font-display text-sm font-extrabold">F</span>
          <span className="leading-none">
            <span className="block font-display text-[15px] font-extrabold">FerixCourse</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Admin console</span>
          </span>
        </Link>
        <nav className="mt-7 space-y-0.5 overflow-y-auto">
          {nav.map((i) => (
            <Link key={i.href} href={i.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${path === i.href ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              <i.icon size={17} /> {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.03] p-3.5">
          <p className="truncate text-[12px] font-semibold text-slate-300">{email || "Admin"}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={logout} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[11.5px] font-semibold text-slate-400 hover:text-white">
              <LogOut size={12} /> Out
            </button>
            <a href={siteUrl || "/"} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[11.5px] font-semibold text-slate-400 hover:text-white">
              <ExternalLink size={12} /> Site
            </a>
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 border-b border-white/8 bg-ink-950/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:px-6">
            <p className="font-display text-[15px] font-bold">{current?.label ?? "Admin"}</p>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Connected to API
            </span>
            <button onClick={logout} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-400 md:hidden">
              <LogOut size={12} />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 md:pb-10">{children}</div>
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50">
        <div className="m-3 rounded-2xl border border-white/10 bg-ink-900/95 grid grid-cols-5 text-[10px] text-slate-300 py-2">
          {[["/", "Home"], ["/courses", "Courses"], ["/classrooms", "Rooms"], ["/transactions", "Pay"], ["/settings", "Setup"]].map(([h, l]) => (
            <Link key={h} href={h} className={`text-center py-1 ${path === h ? "text-white font-bold" : ""}`}>{l}</Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
