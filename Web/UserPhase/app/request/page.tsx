"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";

const input = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-fuchsia-400/60";

export default function RequestPage() {
  const [f, setF] = useState({ topic: "", current_level: "Beginner", background: "", goals: "", preferred_days: "", preferred_time: "", preferred_schedule: "", mode: "online", audience: "individual", budget_kobo: 0, message: "" });
  const [mine, setMine] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch("/requests/mine").then(setMine).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      await apiFetch("/requests", { method: "POST", body: JSON.stringify(f) });
      setOk("Request sent. We review every request personally.");
      setMine(await apiFetch("/requests/mine"));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  return (
    <AppShell title="Request custom training" sub="Can't find your topic? Describe it — we build a classroom around you.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      {ok && <p className="mb-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{ok}</p>}
      <form onSubmit={submit} className="grid max-w-2xl gap-3.5 rounded-3xl border border-white/10 bg-night-900/70 p-6 sm:grid-cols-2 sm:p-8">
        <label className="text-[13px] font-medium sm:col-span-2">What do you want to learn?<input value={f.topic} onChange={(e) => set(e, "topic")} required placeholder="e.g. Node.js + PostgreSQL backend architecture" className={input} /></label>
        <label className="text-[13px] font-medium">Current level<select value={f.current_level} onChange={(e) => set(e, "current_level")} className={input}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label className="text-[13px] font-medium">Budget (NGN)<input value={Math.round(f.budget_kobo / 100)} onChange={(e) => set(e, "budget_kobo", Number(e.target.value) * 100)} type="number" min={0} className={input} /></label>
        <label className="text-[13px] font-medium sm:col-span-2">What do you already know?<textarea value={f.background} onChange={(e) => set(e, "background")} rows={2} className={input} /></label>
        <label className="text-[13px] font-medium sm:col-span-2">What do you want to achieve?<textarea value={f.goals} onChange={(e) => set(e, "goals")} rows={2} className={input} /></label>
        <label className="text-[13px] font-medium">Preferred days<input value={f.preferred_days} onChange={(e) => set(e, "preferred_days")} placeholder="e.g. Tue + Thu" className={input} /></label>
        <label className="text-[13px] font-medium">Preferred time<input value={f.preferred_time} onChange={(e) => set(e, "preferred_time")} placeholder="e.g. evenings" className={input} /></label>
        <label className="text-[13px] font-medium">Online or physical<select value={f.mode} onChange={(e) => set(e, "mode")} className={input}><option value="online">Online</option><option value="physical">Physical</option></select></label>
        <label className="text-[13px] font-medium">Individual or group<select value={f.audience} onChange={(e) => set(e, "audience")} className={input}><option value="individual">Individual</option><option value="group">Group</option></select></label>
        <label className="text-[13px] font-medium sm:col-span-2">Anything else?<textarea value={f.message} onChange={(e) => set(e, "message")} rows={2} className={input} /></label>
        <button disabled={busy} className="btn-aurora rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{busy ? "Sending…" : "Send request"}</button>
      </form>

      {mine.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg font-bold">Your requests</h2>
          <div className="grid max-w-2xl gap-2.5">
            {mine.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-night-900/70 px-4 py-3 text-sm">
                <span className="font-semibold">{r.topic}</span>
                <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[11px]">{r.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );

  function set(e: any, k: string, v?: any) {
    void e;
    setF((prev) => ({ ...prev, [k]: v ?? (e?.target?.value ?? "") }));
  }
}
