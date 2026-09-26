"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Radio, ArrowRight, CalendarCheck, BookOpen, Sparkles } from "lucide-react";
import AppShell from "@/components/shell";
import { apiFetch, currentUser } from "@/lib/client";
import { formatMoney } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [data, setData] = useState<{ courses: any[]; classrooms: any[] } | null>(null);
  const [suggest, setSuggest] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const u = await currentUser().catch(() => null);
      if (!u) return router.push("/login");
      setName(String(u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "Learner"));
      try {
        const [enr, feat] = await Promise.all([
          apiFetch("/api/enrollments/mine"),
          apiFetch("/courses/featured", {}, false).catch(() => []),
        ]);
        setData(enr);
        setSuggest(feat);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [router]);

  const courses = data?.courses ?? [];
  const rooms = data?.classrooms ?? [];

  return (
    <AppShell title={name ? `Welcome back, ${name}` : "Welcome back"} sub="Your learning at a glance. Everything below is live data.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl border border-white/8 bg-white/[.03]" />)}
        </div>
      ) : courses.length + rooms.length === 0 ? (
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><PlayCircle size={14} /> Continue learning</p>
            {courses.slice(0, 3).map((c: any) => (
              <Link key={c.id} href={`/courses/${c.slug}`} className="group mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3 hover:border-white/20">
                <span className="text-sm font-semibold">{c.title}</span>
                <ArrowRight size={15} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            ))}
            {!courses.length && <p className="mt-3 text-sm text-slate-500">No courses yet.</p>}
          </div>
          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500"><Radio size={14} /> Upcoming classes</p>
            {rooms.slice(0, 3).map((r: any) => (
              <Link key={r.id} href={`/classrooms/${r.slug}`} className="group mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3 hover:border-white/20">
                <span><span className="block text-sm font-semibold">{r.title}</span><span className="text-xs text-slate-500">{r.schedule_text}</span></span>
                <ArrowRight size={15} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            ))}
            {!rooms.length && <p className="mt-3 text-sm text-slate-500">No live classes yet.</p>}
          </div>
        </div>
      )}

      {suggest.length > 0 && (
        <>
          <h2 className="mb-3 mt-9 flex items-center gap-2 font-display text-lg font-bold"><BookOpen size={17} className="text-rose-300" /> Recommended for you</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {suggest.slice(0, 3).map((c: any) => (
              <Link key={c.id} href={`/courses/${c.slug}`} className="card-lift rounded-2xl border border-white/10 bg-stone-900/70 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{c.category} · {c.level}</p>
                <h3 className="mt-1.5 font-display font-bold">{c.title}</h3>
                <p className="mt-2 font-display font-bold">{formatMoney(c.price_kobo, c.currency)}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link href="/request" className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-[13px] font-bold text-slate-300 hover:border-white/40 hover:text-white">
          <CalendarCheck size={14} /> Can&apos;t find your topic? Request it
        </Link>
      </div>
    </AppShell>
  );
}
