"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function SessionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch("/admin/sessions").then(setItems).catch((e) => setErr(e.message));
  }, []);
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Live Sessions</h1>
      <p className="text-sm text-slate-400 mt-1">Classroom sessions. LiveKit rooms + automatic recording attach in Phase 3.</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid gap-3">
        {items.map((s) => (
          <div key={s.id} className="card text-sm">
            <p className="font-semibold">{s.title} <span className="text-xs text-slate-400">• {s.classroom_title}</span></p>
            <p className="text-xs text-slate-400 mt-1">Room: {s.livekit_room} • Recording: {s.recording_status}</p>
          </div>
        ))}
        {!items.length && !err && <p className="card text-sm text-slate-400">No sessions yet. Sessions are created per classroom schedule.</p>}
      </div>
    </Shell>
  );
}
