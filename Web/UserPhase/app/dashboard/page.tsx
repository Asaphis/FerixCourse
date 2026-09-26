"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Radio, ArrowRight, BookOpen, Sparkles, CalendarDays, Inbox, Bell, MessageSquare } from "lucide-react";
import AppShell from "@/components/shell";
import { apiFetch, currentUser } from "@/lib/client";

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [data, setData] = useState<{ courses: any[]; classrooms: any[] } | null>(null);
  const [reqs, setReqs] = useState<any>({ mine: [], joined: [], sla_hours: 48 });
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [convCount, setConvCount] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const u = await currentUser().catch(() => null);
      if (!u) return router.push("/login");
      setName(String(u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "Learner"));
      try {
        const [enr, rs, bk, nt, cv] = await Promise.all([
          apiFetch("/api/enrollments/mine"),
          apiFetch("/scope/requests/status").catch(() => ({ mine: [], joined: [], sla_hours: 48 })),
          apiFetch("/bookings/mine").catch(() => []),
          apiFetch("/notifications/mine").catch(() => []),
          apiFetch("/messages/conversations").catch(() => []),
        ]);
        setData(enr); setReqs(rs); setBookings(bk); setNotifs(nt.slice(0, 3)); setConvCount(cv.length ?? 0);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [router]);

  const courses = data?.courses ?? [];
  const rooms = data?.classrooms ?? [];
  const upcoming = rooms.filter((r: any) => r.starts_at && new Date(r.starts_at) > new Date()).slice(0, 4);
  const pendReqs = (reqs.mine ?? []).filter((r: any) => ["pending", "reviewing"].includes(r.status));
  const pendBooks = bookings.filter((b: any) => ["pending", "confirmed"].includes(b.status));

  return (
    <AppShell title={name ? `Welcome back, ${name}` : "Welcome back"} sub="Your learning at a glance. Everything below is live data.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl border border-white/8 bg-white/[.03]" />)}
        </div>
      ) : courses.length + rooms.length === 0 && pendReqs.length === 0 && pendBooks.length === 0 ? (
        <div className="grain relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-orange-600/20 via-stone-900 to-stone-900 p-8 sm:p-12">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500"><Sparkles size={20} className="text-white" /></span>
          <h2 className="mt-5 max-w-lg font-display text-2xl font-bold sm:text-3xl">Your journey starts with a first enrollment.</h2>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-400">Join a live cohort, pick a recorded course, or book private mentorship — then track everything here.</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/live" className="btn-aurora rounded-xl px-5 py-2.5 text-sm font-bold text-white">Find a live class</Link>
            <Link href="/learn" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5">Browse catalog</Link>
            <Link href="/book" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5">Book 1-on-1</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><PlayCircle size={14} /> My courses ({courses.length})</p>
            {courses.slice(0, 3).map((c: any) => (
              <Link key={c.id} href={`/courses/${c.slug}`} className="group mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3 hover:border-white/20">
                <span className="text-sm font-semibold">{c.title}</span>
                <ArrowRight size={15} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            ))}
            {!courses.length && <p className="mt-3 text-sm text-slate-500">No courses yet. <Link href="/learn" className="font-bold text-white">Browse</Link></p>}
            {courses.length > 0 && <Link href="/my-courses" className="mt-3 inline-block text-[13px] font-bold text-slate-300 hover:text-white">View all →</Link>}
          </div>
          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><Radio size={14} /> My classrooms ({rooms.length})</p>
            {rooms.slice(0, 3).map((r: any) => (
              <Link key={r.id} href={`/classrooms/${r.slug}`} className="group mt-3 block rounded-2xl border border-white/8 bg-black/30 px-4 py-3 hover:border-white/20">
                <span className="flex items-center justify-between text-sm font-semibold">{r.title}
                  <ArrowRight size={15} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" /></span>
                <span className="text-xs text-slate-500">{r.schedule_text}</span>
              </Link>
            ))}
            {!rooms.length && <p className="mt-3 text-sm text-slate-500">No live classes yet. <Link href="/live" className="font-bold text-white">Browse</Link></p>}
            {rooms.length > 0 && <Link href="/classes" className="mt-3 inline-block text-[13px] font-bold text-slate-300 hover:text-white">View all →</Link>}
          </div>

          {upcoming.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><CalendarDays size={14} /> Upcoming timetable</p>
              {upcoming.map((r: any) => (
                <p key={r.id} className="mt-3 flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-sm">
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-xs text-slate-400">{new Date(r.starts_at).toLocaleDateString()} {new Date(r.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </p>
              ))}
            </div>
          )}

          {(pendReqs.length > 0 || pendBooks.length > 0) && (
            <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><Inbox size={14} /> Awaiting response</p>
              {pendReqs.map((r: any) => (
                <Link key={r.id} href="/request" className="mt-3 flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-sm hover:border-white/20">
                  <span className="font-semibold">{r.topic}</span>
                  <span className="text-xs text-slate-400">{r.status} · ~{reqs.sla_hours}h response</span>
                </Link>
              ))}
              {pendBooks.map((b: any) => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="mt-3 flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-sm hover:border-white/20">
                  <span className="font-semibold">{b.topic}</span>
                  <span className="text-xs text-slate-400">{b.status}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><Bell size={14} /> Recent alerts</p>
            {notifs.length === 0 && <p className="mt-3 text-sm text-slate-500">Nothing yet.</p>}
            {notifs.map((n: any) => (
              <p key={n.id} className="mt-2.5 rounded-2xl bg-black/30 px-4 py-2.5 text-sm"><b>{n.title}</b> <span className="text-xs text-slate-500">· {new Date(n.created_at).toLocaleDateString()}</span></p>
            ))}
            <Link href="/notifications" className="mt-3 inline-block text-[13px] font-bold text-slate-300 hover:text-white">All notifications →</Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><MessageSquare size={14} /> Messages</p>
            <p className="mt-3 text-sm text-slate-400">{convCount === 0 ? "No conversations yet." : `${convCount} conversation${convCount === 1 ? "" : "s"} open.`}</p>
            <Link href="/messages" className="btn-aurora mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white">Open messages</Link>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link href="/request" className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-[13px] font-bold text-slate-300 hover:border-white/40 hover:text-white">
          <BookOpen size={14} /> Can&apos;t find your topic? Request it
        </Link>
      </div>
    </AppShell>
  );
}
