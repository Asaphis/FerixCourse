"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

const STATES = ["pending", "confirmed", "paid", "completed", "cancelled"];

export default function BookingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      setItems(await adminFetch(`/admin/bookings${filter ? `?status=${filter}` : ""}`));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, [filter]);

  async function setStatus(id: string, status: string) {
    setErr("");
    try {
      await adminFetch(`/admin/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Bookings</h1>
      <p className="text-sm text-slate-400 mt-1">One-on-one training bookings. Confirm, then payment and scheduling follow.</p>
      <div className="mt-4 flex gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input max-w-xs">
          <option value="">All statuses</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid gap-3">
        {items.map((b) => (
          <div key={b.id} className="card">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{b.topic}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{b.status}</span>
              <span className="text-xs text-slate-400 ml-auto">{b.user_email} • {b.mode} • {b.duration_min} min</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">When: {b.preferred_date ?? "—"} {b.preferred_time} {b.location && `• ${b.location}`}</p>
            {b.message && <p className="text-sm mt-1">“{b.message}”</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {STATES.filter((s) => s !== b.status).map((s) => (
                <button key={s} onClick={() => setStatus(b.id, s)} className="btn-ghost text-xs">{s}</button>
              ))}
            </div>
          </div>
        ))}
        {!items.length && !err && <p className="card text-sm text-slate-400">No bookings found.</p>}
      </div>
    </Shell>
  );
}
