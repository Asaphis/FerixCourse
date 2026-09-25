"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function MaterialsPage() {
  const [data, setData] = useState<{ classroom: any[]; courses: any[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch("/admin/materials").then(setData).catch((e) => setErr(e.message));
  }, []);
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Materials</h1>
      <p className="text-sm text-slate-400 mt-1">Private files for classrooms and courses. Upload UI lands with R2 wiring in Phase 4.</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <h2 className="font-semibold mt-5 text-sm text-slate-300">Classroom materials ({data?.classroom.length ?? 0})</h2>
      <div className="mt-2 grid gap-2">
        {(data?.classroom ?? []).map((m) => (
          <p key={m.id} className="card text-sm">{m.title} <span className="text-xs text-slate-400">• {m.classroom_title} • {m.mime}</span></p>
        ))}
        {!data?.classroom.length && !err && <p className="card text-sm text-slate-400">None yet.</p>}
      </div>
      <h2 className="font-semibold mt-5 text-sm text-slate-300">Course materials ({data?.courses.length ?? 0})</h2>
      <div className="mt-2 grid gap-2">
        {(data?.courses ?? []).map((m) => (
          <p key={m.id} className="card text-sm">{m.title} <span className="text-xs text-slate-400">• {m.course_title} • {m.mime}</span></p>
        ))}
        {!data?.courses.length && !err && <p className="card text-sm text-slate-400">None yet.</p>}
      </div>
    </Shell>
  );
}
