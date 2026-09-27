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
  const [queues, setQueues] = useState<Record<string, any[]>>({});
  const [rooms, setRooms] = useState<any[]>([]);
  const [convertRoom, setConvertRoom] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setItems(await adminFetch(`/admin/requests${filter ? `?status=${filter}` : ""}`));
      setRooms(await adminFetch("/admin/classrooms").catch(() => []));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, [filter]);

  async function showQueue(id: string) {
    try {
      const rows = await adminFetch(`/admin/requests/${id}/queue`);
      setQueues((p) => ({ ...p, [id]: rows }));
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function convert(id: string) {
    setErr(""); setMsg("");
    const classroom_id = convertRoom[id];
    if (!classroom_id) return setErr("Pick the classroom to convert this request into.");
    try {
      const r = await adminFetch(`/admin/requests/${id}/convert`, { method: "POST", body: JSON.stringify({ classroom_id }) });
      setMsg(`Converted. ${r.notified} people notified to enroll.`);
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

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
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input max-w-xs" aria-label="Filter by status" title="Filter by status">
          <option value="">All statuses</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      {msg && <p className="card mt-4 text-sm text-emerald-200">{msg}</p>}
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
              <button onClick={() => showQueue(r.id)} className="btn-ghost text-xs">
                Queue ({(queues[r.id] ?? []).length || "…"})
              </button>
            </div>
            {(queues[r.id] ?? []).length > 0 && (
              <p className="mt-2 text-xs text-slate-400">
                Waiting: {(queues[r.id] ?? []).map((w: any) => w.email).join(", ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-black/30 p-2.5">
              <select value={convertRoom[r.id] ?? ""} onChange={(e) => setConvertRoom({ ...convertRoom, [r.id]: e.target.value })} className="input flex-1 min-w-[200px]" aria-label="Convert into classroom" title="Convert into classroom">
                <option value="">Convert into classroom…</option>
                {rooms.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <button onClick={() => convert(r.id)} className="btn text-xs">Convert + notify queue</button>
            </div>
          </div>
        ))}
        {!items.length && !err && <p className="card text-sm text-slate-400">No requests found.</p>}
      </div>
    </Shell>
  );
}
