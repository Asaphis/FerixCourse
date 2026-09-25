"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function MessagesPage() {
  const [convs, setConvs] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    adminFetch("/admin/conversations").then(setConvs).catch((e) => setErr(e.message));
  }, []);

  async function open(id: string) {
    setActive(id);
    try {
      setMsgs(await adminFetch(`/admin/conversations/${id}`));
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    try {
      const m = await adminFetch(`/admin/conversations/${active}`, { method: "POST", body: JSON.stringify({ body: draft }) });
      setMsgs([...msgs, m]);
      setDraft("");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Messages</h1>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          {convs.map((c) => (
            <button key={c.id} onClick={() => open(c.id)} className={`card text-left text-sm ${active === c.id ? "border-brand-400/50" : ""}`}>
              <p className="font-semibold">{c.subject || "Conversation"}</p>
              <p className="text-xs text-slate-400">{c.student_email}</p>
            </button>
          ))}
          {!convs.length && !err && <p className="card text-sm text-slate-400">No conversations yet.</p>}
        </div>
        <div className="card md:col-span-2">
          {!active && <p className="text-sm text-slate-400">Select a conversation.</p>}
          {active && (
            <>
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {msgs.map((m) => (
                  <p key={m.id} className="text-sm px-3 py-2 rounded-xl bg-white/5">{m.body}</p>
                ))}
                {!msgs.length && <p className="text-sm text-slate-400">No messages yet.</p>}
              </div>
              <form onSubmit={send} className="mt-3 flex gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…" className="input" />
                <button className="btn">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
