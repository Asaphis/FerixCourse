"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function MaterialsPage() {
  const [data, setData] = useState<{ classroom: any[]; courses: any[] } | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [dest, setDest] = useState<"classroom" | "course">("classroom");
  const [f, setF] = useState({ title: "", storage_key: "", mime: "", classroom_id: "", course_id: "" });

  async function load() {
    try {
      const [m, r, c] = await Promise.all([
        adminFetch("/admin/materials"),
        adminFetch("/admin/classrooms").catch(() => []),
        adminFetch("/admin/courses").catch(() => []),
      ]);
      setData(m); setRooms(r); setCourses(c);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const body: any = { title: f.title, storage_key: f.storage_key, mime: f.mime || undefined };
      if (dest === "classroom") {
        if (!f.classroom_id) return setErr("Pick the destination classroom.");
        body.classroom_id = f.classroom_id;
      } else {
        if (!f.course_id) return setErr("Pick the destination course.");
        body.course_id = f.course_id;
      }
      await adminFetch("/admin/materials", { method: "POST", body: JSON.stringify(body) });
      setMsg(`Saved to ${dest === "classroom" ? "classroom" : "course"} only — nowhere else.`);
      setF({ title: "", storage_key: "", mime: "", classroom_id: "", course_id: "" });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Materials</h1>
      <p className="text-sm text-slate-400 mt-1">Every file names ONE destination. Members of that room — or buyers of that course — are the only ones who can open it.</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      {msg && <p className="card mt-4 text-sm text-emerald-200">{msg}</p>}
      <form onSubmit={save} className="card mt-5 grid sm:grid-cols-2 gap-3">
        <div className="flex gap-2 sm:col-span-2">
          {(["classroom", "course"] as const).map((d) => (
            <button type="button" key={d} onClick={() => setDest(d)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${dest === d ? "bg-white text-ink-950" : "border border-white/15 text-slate-300"}`}>
              To a classroom{d === "course" ? "" : ""}
              {d === "classroom" ? " (members only)" : " (buyers only)"}
            </button>
          ))}
        </div>
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required placeholder="Title e.g. Week 2 slides" className="input" />
        <input value={f.storage_key} onChange={(e) => setF({ ...f, storage_key: e.target.value })} required placeholder="R2 storage key e.g. class-x/week2.pdf" className="input" />
        {dest === "classroom" ? (
          <select value={f.classroom_id} onChange={(e) => setF({ ...f, classroom_id: e.target.value })} className="input sm:col-span-2">
            <option value="">Destination classroom…</option>
            {rooms.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        ) : (
          <select value={f.course_id} onChange={(e) => setF({ ...f, course_id: e.target.value })} className="input sm:col-span-2">
            <option value="">Destination course…</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
        <button className="btn sm:col-span-2">Save file record</button>
      </form>
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
