"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";

export default function MessagesPage() {
  const [convs, setConvs] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      setConvs(await apiFetch("/messages/conversations"));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function open(id: string) {
    setActive(id);
    try {
      setMsgs(await apiFetch(`/messages/conversations/${id}`));
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const c = await apiFetch("/messages/conversations", { method: "POST", body: JSON.stringify({ subject }) });
      setSubject("");
      await load();
      open(c.id);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    try {
      const m = await apiFetch(`/messages/conversations/${active}`, { method: "POST", body: JSON.stringify({ body: draft }) });
      setMsgs([...msgs, m]);
      setDraft("");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <AppShell title="Messages" sub="Direct line to your instructors and support.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      <form onSubmit={start} className="mb-4 flex gap-2">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="New conversation subject…" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-rose-400/60" />
        <button className="btn-aurora rounded-xl px-5 py-2.5 text-sm font-bold text-white">Start</button>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid content-start gap-2">
          {convs.map((c) => (
            <button key={c.id} onClick={() => open(c.id)} className={`rounded-2xl border p-4 text-left transition ${active === c.id ? "border-rose-400/40 bg-white/[.06]" : "border-white/10 bg-stone-900/70 hover:border-white/25"}`}>
              <p className="text-sm font-bold">{c.subject || "Conversation"}</p>
              {c.unread > 0 && <span className="mt-1 inline-block rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] text-rose-200">{c.unread} new</span>}
            </button>
          ))}
          {!convs.length && <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-500">No conversations yet. Start one above.</p>}
        </div>
        <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-5 md:col-span-2">
          {!active && <p className="text-sm text-slate-500">Select a conversation to read and reply.</p>}
          {active && (
            <>
              <div className="grid max-h-96 content-start gap-2 overflow-y-auto">
                {msgs.map((m) => (
                  <p key={m.id} className="rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm">{m.body}</p>
                ))}
                {!msgs.length && <p className="text-sm text-slate-500">No messages yet — say hello.</p>}
              </div>
              <form onSubmit={send} className="mt-4 flex gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-rose-400/60" />
                <button className="btn-aurora rounded-xl px-5 py-2.5 text-sm font-bold text-white">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
