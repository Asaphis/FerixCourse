"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

const STATES = ["pending", "reviewing", "accepted", "rejected", "converted"];

export default function RequestsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});

  async function load() {
    try {
      setItems(await adminFetch(`/admin/requests${filter ? `?status=${filter}` : ""}`));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, [filter]);

  async function setStatus(id: string, status: string) {
    setErr("");
    try {
      await adminFetch(`/admin/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, admin_note: note[id] ?? "" }),
      });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Class Requests</h1>
      <p className="text-sm text-slate-400 mt-1">Custom training requests. Accept the good ones, convert them into classrooms.</p>
      <div className="mt-4 flex gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input max-w-xs">
          <option value="">All statuses</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid gap-3">
        {items.map((r) => (
          <div key={r.id} className="card">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{r.topic}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{r.status}</span>
              <span className="text-xs text-slate-400 ml-auto">{r.user_email} • {r.mode} • {r.audience}</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">Level: {r.current_level} • Knows: {r.background || "—"} • Wants: {r.goals || "—"}</p>
            <p className="text-sm text-slate-400">Schedule: {r.preferred_days} {r.preferred_time} {r.preferred_schedule} • Budget: {(r.budget_kobo / 100).toLocaleString()}</p>
            {r.message && <p className="text-sm mt-1">“{r.message}”</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <input value={note[r.id] ?? ""} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })}
                placeholder="Admin note…" className="input flex-1 min-w-[200px]" />
              {STATES.filter((s) => s !== r.status).map((s) => (
                <button key={s} onClick={() => setStatus(r.id, s)} className="btn-ghost text-xs">{s}</button>
              ))}
            </div>
          </div>
        ))}
        {!items.length && !err && <p className="card text-sm text-slate-400">No requests found.</p>}
      </div>
    </Shell>
  );
}
