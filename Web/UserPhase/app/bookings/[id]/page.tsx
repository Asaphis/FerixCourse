"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";
import { formatMoney } from "@/lib/api";

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      setData(await apiFetch(`/scope/bookings/${params.id}`));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, [params.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await apiFetch(`/scope/bookings/${params.id}/messages`, { method: "POST", body: JSON.stringify({ body: draft }) });
      setDraft("");
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <AppShell title="Booking workspace" sub="Private room for you and your instructor. Files, price and schedule live here.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      {!data ? (
        <div className="h-48 animate-pulse rounded-3xl bg-white/5" />
      ) : (
        <div className="grid max-w-3xl gap-3">
          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-bold">{data.booking.topic}</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">{data.booking.status}</span>
              <span className="ml-auto text-sm text-slate-400">{data.booking.mode} · {data.booking.duration_min} min</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {data.booking.preferred_date ?? "Date TBD"} {data.booking.preferred_time}
              {data.booking.location ? ` · ${data.booking.location}` : ""}
            </p>
            {(data.booking.price_kobo ?? 0) > 0 && (
              <p className="mt-2 font-display font-bold">Agreed price: {formatMoney(data.booking.price_kobo, "NGN")}</p>
            )}
            {data.booking.message && <p className="mt-2 text-sm text-slate-400">“{data.booking.message}”</p>}
          </div>
          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500">Private discussion</p>
            <div className="mt-3 grid max-h-80 content-start gap-2 overflow-y-auto">
              {(data.messages ?? []).map((m: any) => (
                <p key={m.id} className="rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm">{m.body}</p>
              ))}
              {!data.messages?.length && <p className="text-sm text-slate-500">Discuss time, price and goals here — only you two can read this.</p>}
            </div>
            <form onSubmit={send} className="mt-4 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write to your instructor…" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-orange-400/60" />
              <button className="btn-aurora rounded-xl px-5 py-2.5 text-sm font-bold text-white">Send</button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
