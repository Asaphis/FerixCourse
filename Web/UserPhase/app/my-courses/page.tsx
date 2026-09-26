"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";
import { formatMoney } from "@/lib/api";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/api/enrollments/mine")
      .then((d) => setCourses(d.courses ?? []))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <AppShell title="My Courses" sub="Recorded courses you own. Pick up exactly where you stopped.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      {courses.length === 0 && !err ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><BookOpen size={19} className="text-slate-400" /></span>
          <p className="mt-4 font-display text-lg font-bold">No courses yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">Buy a recorded course and it lives here forever, with progress tracking.</p>
          <Link href="/learn" className="btn-aurora mt-5 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white">
            Browse catalog <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {courses.map((c: any) => (
            <Link key={c.id} href={`/courses/${c.slug}`} className="card-lift rounded-3xl border border-white/10 bg-stone-900/70 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Owned course</p>
              <h3 className="mt-1.5 font-display text-lg font-bold">{c.title}</h3>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold">Continue learning <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
