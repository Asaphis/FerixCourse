"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, Radio, Inbox, CalendarCheck,
  Receipt, MonitorPlay, Disc3, FolderOpen, MessagesSquare, Bell, Settings,
} from "lucide-react";

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
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/10 bg-ink-900/70 min-h-screen sticky top-0 p-4">
        <Link href="/" className="font-display font-extrabold px-2">Ferix<span className="text-brand-400">Admin</span></Link>
        <nav className="mt-6 space-y-0.5 overflow-y-auto">
          {nav.map((i) => (
            <Link key={i.href} href={i.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${path === i.href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              <i.icon size={17} /> {i.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">{children}</div>
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50">
        <div className="m-3 rounded-2xl border border-white/10 bg-ink-900/95 grid grid-cols-5 text-[10px] text-slate-300 py-2">
          {[["/", "Home"], ["/courses", "Courses"], ["/classrooms", "Rooms"], ["/transactions", "Pay"], ["/settings", "Setup"]].map(([h, l]) => (
            <Link key={h} href={h} className="text-center py-1">{l}</Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
