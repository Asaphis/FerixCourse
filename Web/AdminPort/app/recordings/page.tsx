"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function RecordingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch("/admin/recordings").then(setItems).catch((e) => setErr(e.message));
  }, []);
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Recordings</h1>
      <p className="text-sm text-slate-400 mt-1">Automatic classroom recordings. Processing → ready, stored privately.</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid gap-3">
        {items.map((r) => (
          <div key={r.id} className="card text-sm">
            <p className="font-semibold">{r.session_title ?? r.id} <span className="text-xs text-slate-400">• {r.status}</span></p>
            <p className="text-xs text-slate-400 mt-1 font-mono">{r.storage_key} • {Math.round(r.duration_sec / 60)} min • {(r.size_bytes / 1048576).toFixed(1)} MB</p>
          </div>
        ))}
        {!items.length && !err && <p className="card text-sm text-slate-400">No recordings yet. They appear automatically after live sessions end.</p>}
      </div>
    </Shell>
  );
}
