"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function SessionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setItems(await adminFetch("/admin/sessions"));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    setErr(""); setMsg("");
    try {
      await adminFetch(`/admin/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMsg(status === "live" ? "Live started — members of that classroom notified." : `Session ${status}.`);
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const live = items.filter((s) => s.status === "live");
  const upcoming = items.filter((s) => s.status === "scheduled");

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Live Sessions</h1>
      <p className="text-sm text-slate-400 mt-1">Pick which classroom trains, start it live. Only that room&apos;s members are notified — never anyone else.</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      {msg && <p className="card mt-4 text-sm text-emerald-200">{msg}</p>}

      {live.length > 0 && (
        <>
          <h2 className="mt-6 font-semibold text-rose-200">Live right now ({live.length})</h2>
          <div className="mt-2 grid gap-2">
            {live.map((s) => (
              <div key={s.id} className="card flex items-center gap-3 border-rose-400/30">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" /><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /></span>
                <div>
                  <p className="font-semibold text-sm">{s.title} <span className="text-xs text-slate-400">• {s.classroom_title}</span></p>
                  <p className="text-xs text-slate-500 font-mono">room: {s.livekit_room}</p>
                </div>
                <button onClick={() => setStatus(s.id, "ended")} className="btn-ghost ml-auto text-xs">End session</button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-6 font-semibold">Scheduled ({upcoming.length})</h2>
      <div className="mt-2 grid gap-2">
        {upcoming.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center gap-2">
            <div>
              <p className="font-semibold text-sm">{s.title} <span className="text-xs text-slate-400">• {s.classroom_title}</span></p>
              <p className="text-xs text-slate-500">{s.starts_at ? new Date(s.starts_at).toLocaleString() : "TBD"}</p>
            </div>
            <span className="ml-auto flex gap-1.5">
              <Link href={`/classrooms/${s.classroom_id}`} className="btn-ghost text-xs">Manage room</Link>
              <button onClick={() => setStatus(s.id, "live")} className="btn text-xs !px-3 !py-1.5">Start live</button>
            </span>
          </div>
        ))}
        {!upcoming.length && <p className="card text-sm text-slate-400">Nothing scheduled. Create sessions inside a classroom&apos;s Manage page.</p>}
      </div>
    </Shell>
  );
}
