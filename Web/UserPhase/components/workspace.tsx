"use client";
import { useEffect, useState } from "react";
import { Radio, FileText, Megaphone, ClipboardList, MessageSquare, Disc3, Check, Send } from "lucide-react";
import { apiFetch } from "@/lib/client";

const TABS = [
  { id: "sessions", label: "Timetable", icon: Radio },
  { id: "materials", label: "Materials", icon: FileText },
  { id: "announce", label: "Announcements", icon: Megaphone },
  { id: "assign", label: "Assignments", icon: ClipboardList },
  { id: "discuss", label: "Discuss", icon: MessageSquare },
  { id: "record", label: "Recordings", icon: Disc3 },
] as const;

export default function ClassroomWorkspace({ classroomId }: { classroomId: string }) {
  const [tab, setTab] = useState<string>("sessions");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState("");
  const [liveMsg, setLiveMsg] = useState("");
  const [answer, setAnswer] = useState<Record<string, string>>({});

  async function load() {
    try {
      setData(await apiFetch(`/scope/classrooms/${classroomId}/workspace`));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, [classroomId]);

  if (err) return null; // not enrolled → page shows public enroll card instead
  if (!data) {
    return <div className="mt-8 grid gap-2.5"><div className="h-12 animate-pulse rounded-2xl bg-white/5" /><div className="h-40 animate-pulse rounded-3xl bg-white/5" /></div>;
  }

  const liveSession = (data.sessions ?? []).find((s: any) => s.status === "live");

  async function joinLive() {
    setLiveMsg("Checking your access…");
    try {
      const r = await apiFetch("/live/token", { method: "POST", body: JSON.stringify({ classroom_id: classroomId }) });
      setLiveMsg(`Access verified for room "${r.room}". Live video opens here in the next release — you will be notified the second it starts.`);
    } catch (e: any) {
      setLiveMsg(e.message);
    }
  }

  async function sendDiscuss(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      const m = await apiFetch(`/scope/classrooms/${classroomId}/messages`, { method: "POST", body: JSON.stringify({ body: draft }) });
      setData({ ...data, messages: [...(data.messages ?? []), { ...m, sender_name: "You" }] });
      setDraft("");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function openFile(id: string) {
    try {
      const r = await apiFetch(`/files/classroom-material/${id}`);
      window.open(r.url, "_blank");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function openRecording(id: string) {
    try {
      const r = await apiFetch(`/files/recording/${id}`);
      window.open(r.url, "_blank");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function submit(aid: string) {
    try {
      await apiFetch(`/scope/assignments/${aid}/submit`, { method: "POST", body: JSON.stringify({ body: answer[aid] ?? "" }) });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-emerald-300/25 bg-emerald-400/[.07] p-5">
        <div>
          <p className="font-display font-bold">You are enrolled in this classroom</p>
          <p className="text-[13px] text-slate-400">Everything below is private to members.</p>
        </div>
        <button onClick={joinLive} disabled={!liveSession}
          className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-bold text-white ${liveSession ? "btn-aurora" : "bg-white/10 opacity-50"}`}>
          {liveSession ? "Join live now" : "No live session"}
        </button>
      </div>
      {liveMsg && <p className="mt-3 rounded-2xl border border-white/12 bg-white/[.04] px-4 py-3 text-[13px] text-slate-300">{liveMsg}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${tab === t.id ? "bg-white text-stone-950" : "border border-white/12 text-slate-300 hover:bg-white/5"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "sessions" && (
          <div className="grid gap-2.5">
            {(data.sessions ?? []).map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5 text-sm">
                <span className="font-bold">{s.title}</span>
                <span className="text-xs text-slate-500">{s.starts_at ? new Date(s.starts_at).toLocaleString() : "TBD"}</span>
                <span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${s.status === "live" ? "bg-rose-500/20 text-rose-200" : s.status === "ended" ? "bg-white/10 text-slate-400" : "bg-white/10 text-slate-300"}`}>{s.status}</span>
              </div>
            ))}
            {!data.sessions?.length && <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-500">Schedule publishes before the cohort starts.</p>}
          </div>
        )}
        {tab === "materials" && (
          <div className="grid gap-2.5">
            {(data.materials ?? []).map((m: any) => (
              <button key={m.id} onClick={() => openFile(m.id)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5 text-left text-sm hover:border-white/25">
                <FileText size={16} className="shrink-0 text-amber-300" />
                <span className="font-semibold">{m.title}</span>
                <span className="ml-auto text-xs text-slate-500">{m.mime} · {(m.size_bytes / 1024).toFixed(0)} KB</span>
              </button>
            ))}
            {!data.materials?.length && <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-500">No materials yet.</p>}
          </div>
        )}
        {tab === "announce" && (
          <div className="grid gap-2.5">
            {(data.announcements ?? []).map((a: any) => (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5">
                <p className="text-sm font-bold">{a.title}</p>
                <p className="mt-1 whitespace-pre-line text-[13.5px] text-slate-400">{a.body}</p>
              </div>
            ))}
            {!data.announcements?.length && <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-500">No announcements yet.</p>}
          </div>
        )}
        {tab === "assign" && (
          <div className="grid gap-3">
            {(data.assignments ?? []).map((a: any) => (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-stone-900/70 p-5">
                <p className="font-bold">{a.title} {a.submitted > 0 && <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300">submitted</span>}</p>
                <p className="mt-1 whitespace-pre-line text-[13.5px] text-slate-400">{a.description}</p>
                {a.due_at && <p className="mt-1 text-xs text-slate-500">Due {new Date(a.due_at).toLocaleString()}</p>}
                <div className="mt-3 flex gap-2">
                  <input value={answer[a.id] ?? ""} onChange={(e) => setAnswer({ ...answer, [a.id]: e.target.value })}
                    placeholder="Your answer…" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-orange-400/60" />
                  <button onClick={() => submit(a.id)} className="btn-aurora rounded-xl px-4 py-2.5 text-sm font-bold text-white">Submit</button>
                </div>
              </div>
            ))}
            {!data.assignments?.length && <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-500">No assignments yet.</p>}
          </div>
        )}
        {tab === "discuss" && (
          <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-5">
            <div className="grid max-h-80 content-start gap-2 overflow-y-auto">
              {(data.messages ?? []).map((m: any) => (
                <p key={m.id} className="rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm">
                  <b className="text-[12px] text-amber-200">{m.sender_name ?? "Member"}</b><br />{m.body}
                </p>
              ))}
              {!data.messages?.length && <p className="text-sm text-slate-500">Start the discussion — visible to classmates only.</p>}
            </div>
            <form onSubmit={sendDiscuss} className="mt-4 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask or share…" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-orange-400/60" />
              <button className="btn-aurora flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white"><Send size={14} /> Post</button>
            </form>
          </div>
        )}
        {tab === "record" && (
          <div className="grid gap-2.5">
            {(data.recordings ?? []).map((r: any) => (
              <button key={r.id} onClick={() => openRecording(r.id)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5 text-left text-sm hover:border-white/25">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15"><Check size={15} className="text-rose-200" /></span>
                <span className="font-semibold">{r.session_title ?? "Session recording"}</span>
                <span className="ml-auto text-xs text-slate-500">{Math.round((r.duration_sec ?? 0) / 60)} min</span>
              </button>
            ))}
            {!data.recordings?.length && <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-500">Recordings appear here automatically after live sessions.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
