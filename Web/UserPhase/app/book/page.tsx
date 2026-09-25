"use client";
import { useState } from "react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";

const input = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-fuchsia-400/60";

export default function BookPage() {
  const [f, setF] = useState({ topic: "", duration_min: 60, mode: "online", preferred_date: "", preferred_time: "", location: "", message: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      await apiFetch("/bookings", { method: "POST", body: JSON.stringify(f) });
      setOk("Booking received. An instructor will confirm your session shortly.");
      setF({ topic: "", duration_min: 60, mode: "online", preferred_date: "", preferred_time: "", location: "", message: "" });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Book 1-on-1 training" sub="Private mentorship, online or in person. Starts as pending until confirmed.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      {ok && <p className="mb-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{ok}</p>}
      <form onSubmit={submit} className="grid max-w-2xl gap-3.5 rounded-3xl border border-white/10 bg-night-900/70 p-6 sm:grid-cols-2 sm:p-8">
        <label className="text-[13px] font-medium sm:col-span-2">What do you want to learn?<input value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} required placeholder="e.g. React hooks in depth" className={input} /></label>
        <label className="text-[13px] font-medium">Duration<select value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: Number(e.target.value) })} className={input}>
          <option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={240}>Half day</option><option value={480}>Full day</option>
        </select></label>
        <label className="text-[13px] font-medium">Format<select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} className={input}>
          <option value="online">Online</option><option value="physical">Physical</option>
        </select></label>
        <label className="text-[13px] font-medium">Preferred date<input value={f.preferred_date} onChange={(e) => setF({ ...f, preferred_date: e.target.value })} type="date" className={input} /></label>
        <label className="text-[13px] font-medium">Preferred time<input value={f.preferred_time} onChange={(e) => setF({ ...f, preferred_time: e.target.value })} placeholder="e.g. 6pm WAT" className={input} /></label>
        {f.mode === "physical" && (
          <label className="text-[13px] font-medium sm:col-span-2">Location<input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="City / venue" className={input} /></label>
        )}
        <label className="text-[13px] font-medium sm:col-span-2">Anything else?<textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} rows={3} placeholder="Goals, background, questions…" className={input} /></label>
        <button disabled={busy} className="btn-aurora rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{busy ? "Booking…" : "Request booking"}</button>
      </form>
    </AppShell>
  );
}
