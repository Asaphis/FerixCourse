"use client";
import { useEffect, useState } from "react";
import { PlayCircle, Check, FileText, LockOpen, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/client";

export default function CourseLearn({ courseId }: { courseId: string }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      setData(await apiFetch(`/scope/courses/${courseId}/learn`));
    } catch (e: any) {
      /* An access refusal is normal here — the public curriculum stands in its
         place. Any other failure is a real error and must be visible, or a
         broken request would be presented to the learner as "not enrolled". */
      setData(null);
      const msg = e?.message ?? "Could not load your progress.";
      setErr(/don'?t have access|not enrolled|forbidden|no access/i.test(msg) ? "" : msg);
    }
  }
  useEffect(() => { load(); }, [courseId]);

  if (err) {
    return (
      <div className="mt-10 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6" role="alert">
        <p className="flex items-center gap-2 font-bold text-rose-100">
          <AlertCircle size={17} /> Could not load your progress
        </p>
        <p className="mt-1.5 text-[13.5px] text-rose-100/80">{err}</p>
        <button onClick={load} className="mt-4 rounded-xl border border-rose-300/40 px-4 py-2.5 text-sm font-bold text-rose-50 hover:bg-rose-500/15">
          Try again
        </button>
      </div>
    );
  }
  if (!data) return null;
  const pct = data.total ? Math.round((data.completed / data.total) * 100) : 0;

  async function complete(lessonId: string) {
    await apiFetch(`/scope/lessons/${lessonId}/complete`, { method: "POST" }).catch(() => {});
    load();
  }

  async function openMaterial(id: string) {
    try {
      const r = await apiFetch(`/files/course-material/${id}`);
      window.open(r.url, "_blank");
    } catch {}
  }

  return (
    <div className="mt-10 rounded-[28px] border border-emerald-300/25 bg-emerald-400/[.05] p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-xl font-bold">Your learning</p>
        <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{pct}% complete</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-6 grid gap-3">
        {(data.sections ?? []).map((s: any) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-stone-900/70 p-5">
            <p className="font-display font-bold">{s.title}</p>
            <div className="mt-3 grid gap-1.5">
              {(s.lessons ?? []).map((l: any) => (
                <div key={l.id} className="flex items-center gap-2.5 rounded-xl bg-black/30 px-3.5 py-2.5 text-[13.5px]">
                  {l.completed
                    ? <Check size={14} className="shrink-0 text-emerald-300" />
                    : l.is_free_preview
                      ? <LockOpen size={13} className="shrink-0 text-emerald-300" />
                      : <PlayCircle size={14} className="shrink-0 text-slate-500" />}
                  <span className={l.completed ? "text-slate-500 line-through" : ""}>{l.title}</span>
                  {!l.completed && (
                    <button onClick={() => complete(l.id)} className="ml-auto shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-bold hover:bg-white/10">
                      Mark done
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {(data.materials ?? []).length > 0 && (
        <>
          <p className="mt-6 font-display font-bold">Your files</p>
          <div className="mt-3 grid gap-2">
            {(data.materials ?? []).map((m: any) => (
              <button key={m.id} onClick={() => openMaterial(m.id)} className="flex items-center gap-2.5 rounded-xl border border-white/10 px-4 py-3 text-left text-sm hover:border-white/25">
                <FileText size={15} className="text-amber-300" /> {m.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
