"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, ArrowRight, CalendarDays, Users } from "lucide-react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";

export default function MyClassroomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/api/enrollments/mine")
      .then((d) => setRooms(d.classrooms ?? []))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <AppShell title="My Classrooms" sub="Group cohorts you are enrolled in. Browse more on the live schedule.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      {rooms.length === 0 && !err ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><Radio size={19} className="text-slate-400" /></span>
          <p className="mt-4 font-display text-lg font-bold">No classrooms yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">Join a live cohort and your timetable, materials and recordings appear here.</p>
          <Link href="/live" className="btn-aurora mt-5 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white">
            Browse live classes <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rooms.map((r: any) => (
            <Link key={r.id} href={`/classrooms/${r.slug}`} className="card-lift rounded-3xl border border-white/10 bg-stone-900/70 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Enrolled cohort</p>
              <h3 className="mt-1.5 font-display text-lg font-bold">{r.title}</h3>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-400">
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {r.schedule_text || "Scheduled"}</span>
                {r.starts_at && <span className="inline-flex items-center gap-1.5"><Users size={13} /> Starts {new Date(r.starts_at).toLocaleDateString()}</span>}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold">Open workspace <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
