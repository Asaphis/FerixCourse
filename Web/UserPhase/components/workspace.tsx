"use client";
import { useEffect, useRef, useState } from "react";
import {
  Radio, FileText, Megaphone, ClipboardList, MessageSquare, Disc3,
  Check, Send, AlertCircle, Loader2, Users,
} from "lucide-react";
import { apiFetch } from "@/lib/client";

/*
  Classroom workspace for an enrolled learner.

  Rewritten for three reasons:
    1. The tabs were plain buttons with no tab semantics — a screen reader read
       six unrelated buttons and keyboard users had to Tab through each one.
       They are now a proper tablist (role, aria-selected, aria-controls, roving
       tabindex, arrow/Home/End keys).
    2. Any load failure returned null, so a broken request was indistinguishable
       from "not enrolled" and the learner saw the public enroll card instead of
       an error. Only an access refusal falls through to the enroll card now;
       everything else renders a retry.
    3. The discussion showed only the body. It now shows sender and time (both
       already returned by /scope/classrooms/:id/messages) and scrolls to the
       newest message.

  Endpoints (unchanged — all real):
    GET  /scope/classrooms/:id/workspace
    POST /scope/classrooms/:id/messages
    GET  /files/classroom-material/:id
    GET  /files/recording/:id
    POST /scope/assignments/:id/submit
    POST /live/token
*/

const TABS = [
  { id: "sessions", label: "Timetable", icon: Radio },
  { id: "materials", label: "Materials", icon: FileText },
  { id: "announce", label: "Announcements", icon: Megaphone },
  { id: "assign", label: "Assignments", icon: ClipboardList },
  { id: "discuss", label: "Discuss", icon: MessageSquare },
  { id: "record", label: "Recordings", icon: Disc3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300";

function formatBytes(n: number | undefined): string {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1048576) return `${(v / 1024).toFixed(0)} KB`;
  return `${(v / 1048576).toFixed(1)} MB`;
}

function when(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "TBD" : d.toLocaleString();
}

/**
 * Distinguishes "you are not a member" (fall through to the public enroll card)
 * from a genuine failure (show a retry). apiFetch throws a plain Error carrying
 * the API's message, so the guard is on the wording the backend actually sends:
 * "You don't have access to this classroom."
 */
function isAccessRefusal(message: string): boolean {
  return /don'?t have access|not enrolled|forbidden|no access/i.test(message);
}

export default function ClassroomWorkspace({ classroomId, slug }: { classroomId: string; slug: string }) {
  const [tab, setTab] = useState<TabId>("sessions");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [liveMsg, setLiveMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState("");

  const logRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      setData(await apiFetch(`/scope/classrooms/${classroomId}/workspace`));
    } catch (e: any) {
      setErr(e?.message ?? "Could not load this classroom.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  const messageCount = data?.messages?.length ?? 0;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, tab]);

  if (err && isAccessRefusal(err)) return null; // not a member → public enroll card
  if (loading && !data) {
    return (
      <div className="mt-8 grid gap-2.5" aria-busy="true">
        <div className="h-20 animate-pulse rounded-3xl bg-white/5" />
        <div className="h-56 animate-pulse rounded-3xl bg-white/5" />
      </div>
    );
  }
  if (err && !data) {
    return (
      <div className="mt-8 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6" role="alert">
        <p className="flex items-center gap-2 font-bold text-rose-100">
          <AlertCircle size={17} /> Could not load this classroom
        </p>
        <p className="mt-1.5 text-[13.5px] text-rose-100/80">{err}</p>
        <button onClick={load} className={`mt-4 rounded-xl border border-rose-300/40 px-4 py-2.5 text-sm font-bold text-rose-50 hover:bg-rose-500/15 ${FOCUS}`}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) return null;

  const liveSession = (data.sessions ?? []).find((s: any) => s.status === "live");

  async function joinLive() {
    setLiveMsg("Checking your access…");
    try {
      await apiFetch("/live/token", { method: "POST", body: JSON.stringify({ classroom_id: classroomId }) });
      window.location.href = `/classrooms/${slug}/live`;
    } catch (e: any) {
      setLiveMsg(e?.message ?? "Could not join the session.");
    }
  }

  async function sendDiscuss(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setErr("");
    try {
      const m = await apiFetch(`/scope/classrooms/${classroomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft }),
      });
      setData({
        ...data,
        messages: [
          ...(data.messages ?? []),
          { ...m, sender_name: m?.sender_name ?? "You", created_at: m?.created_at ?? new Date().toISOString() },
        ],
      });
      setDraft("");
    } catch (e: any) {
      setErr(e?.message ?? "Could not post your message.");
    } finally {
      setSending(false);
    }
  }

  async function openFile(id: string) {
    setOpeningId(id);
    setErr("");
    try {
      const r = await apiFetch(`/files/classroom-material/${id}`);
      window.open(r.url, "_blank", "noopener");
    } catch (e: any) {
      setErr(e?.message ?? "Could not open that file.");
    } finally {
      setOpeningId("");
    }
  }

  async function openRecording(id: string) {
    setOpeningId(id);
    setErr("");
    try {
      const r = await apiFetch(`/files/recording/${id}`);
      window.open(r.url, "_blank", "noopener");
    } catch (e: any) {
      setErr(e?.message ?? "Could not open that recording.");
    } finally {
      setOpeningId("");
    }
  }

  async function submit(aid: string) {
    setSubmitting(aid);
    setErr("");
    try {
      await apiFetch(`/scope/assignments/${aid}/submit`, {
        method: "POST",
        body: JSON.stringify({ body: answer[aid] ?? "" }),
      });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Could not submit your answer.");
    } finally {
      setSubmitting("");
    }
  }

  /** Arrow-key traversal across the tablist, plus Home/End. */
  function onTabKey(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-300/25 bg-emerald-400/[.07] p-5">
        <div className="min-w-0">
          <p className="font-display font-bold">You are enrolled in this classroom</p>
          <p className="text-[13px] text-slate-400">Everything below is private to members.</p>
        </div>
        <button
          onClick={joinLive}
          disabled={!liveSession}
          className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-bold ${FOCUS} ${
            liveSession ? "btn-aurora text-white" : "border border-white/15 bg-white/[.06] text-slate-300"
          }`}
        >
          {liveSession ? "Join live now" : "No live session"}
        </button>
      </div>

      {liveMsg && (
        <p className="mt-3 rounded-2xl border border-white/12 bg-white/[.04] px-4 py-3 text-[13px] text-slate-300" role="status">
          {liveMsg}
        </p>
      )}

      {err && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3" role="alert">
          <AlertCircle size={16} className="shrink-0 text-rose-200" />
          <span className="flex-1 text-[13px] text-rose-100">{err}</span>
          <button onClick={load} className={`rounded-lg border border-rose-300/40 px-3 py-1.5 text-xs font-bold text-rose-50 hover:bg-rose-500/15 ${FOCUS}`}>
            Reload
          </button>
        </div>
      )}

      {/* Real tab semantics: one tablist, one tab per panel, arrow-key traversal. */}
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Classroom sections">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${FOCUS} ${
              tab === t.id ? "bg-white text-stone-950" : "border border-white/12 text-slate-300 hover:bg-white/5"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "sessions" && (
          <div role="tabpanel" id="panel-sessions" aria-labelledby="tab-sessions" tabIndex={-1} className="grid gap-2.5">
            {(data.sessions ?? []).map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5 text-sm">
                <span className="font-bold">{s.title}</span>
                <span className="text-xs text-slate-400">{when(s.starts_at)}</span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    s.status === "live" ? "bg-rose-500/20 text-rose-200" : s.status === "ended" ? "bg-white/10 text-slate-300" : "bg-white/10 text-slate-300"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
            {!data.sessions?.length && (
              <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">
                No sessions scheduled yet. Your instructor will post the timetable here.
              </p>
            )}
          </div>
        )}

        {tab === "materials" && (
          <div role="tabpanel" id="panel-materials" aria-labelledby="tab-materials" tabIndex={-1} className="grid gap-2.5">
            {(data.materials ?? []).map((m: any) => (
              <button
                key={m.id}
                onClick={() => openFile(m.id)}
                disabled={openingId === m.id}
                className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5 text-left text-sm hover:border-white/25 disabled:opacity-60 ${FOCUS}`}
              >
                {openingId === m.id ? (
                  <Loader2 size={16} className="shrink-0 animate-spin text-amber-300" />
                ) : (
                  <FileText size={16} className="shrink-0 text-amber-300" />
                )}
                <span className="font-semibold">{m.title}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {m.mime} · {formatBytes(m.size_bytes)}
                </span>
              </button>
            ))}
            {!data.materials?.length && (
              <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">
                No materials yet. Files your instructor uploads appear here.
              </p>
            )}
          </div>
        )}

        {tab === "announce" && (
          <div role="tabpanel" id="panel-announce" aria-labelledby="tab-announce" tabIndex={-1} className="grid gap-2.5">
            {(data.announcements ?? []).map((a: any) => (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5">
                <p className="text-sm font-bold">{a.title}</p>
                <p className="mt-1 whitespace-pre-line text-[13.5px] text-slate-400">{a.body}</p>
                {a.created_at && <p className="mt-2 text-xs text-slate-500">{when(a.created_at)}</p>}
              </div>
            ))}
            {!data.announcements?.length && (
              <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">No announcements yet.</p>
            )}
          </div>
        )}

        {tab === "assign" && (
          <div role="tabpanel" id="panel-assign" aria-labelledby="tab-assign" tabIndex={-1} className="grid gap-3">
            {(data.assignments ?? []).map((a: any) => (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-stone-900/70 p-5">
                <p className="font-bold">
                  {a.title}{" "}
                  {a.submitted > 0 && (
                    <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300">submitted</span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-line text-[13.5px] text-slate-400">{a.description}</p>
                {a.due_at && <p className="mt-1 text-xs text-slate-500">Due {when(a.due_at)}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="sr-only" htmlFor={`answer-${a.id}`}>
                    Your answer for {a.title}
                  </label>
                  <input
                    id={`answer-${a.id}`}
                    value={answer[a.id] ?? ""}
                    onChange={(e) => setAnswer({ ...answer, [a.id]: e.target.value })}
                    placeholder="Your answer…"
                    className={`min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-orange-400/60 ${FOCUS}`}
                  />
                  <button
                    onClick={() => submit(a.id)}
                    disabled={submitting === a.id}
                    className={`btn-aurora flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${FOCUS}`}
                  >
                    {submitting === a.id ? <Loader2 size={14} className="animate-spin" /> : null}
                    Submit
                  </button>
                </div>
              </div>
            ))}
            {!data.assignments?.length && (
              <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">No assignments yet.</p>
            )}
          </div>
        )}

        {tab === "discuss" && (
          <div role="tabpanel" id="panel-discuss" aria-labelledby="tab-discuss" tabIndex={-1} className="rounded-3xl border border-white/10 bg-stone-900/70 p-5">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare size={15} className="text-amber-300" />
              <span className="text-[13px] font-bold">
                Class discussion
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-300" aria-label={`${messageCount} messages`}>
                {messageCount}
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-slate-400">
                <Users size={13} /> Visible to classmates and your instructor
              </span>
            </div>

            <div ref={logRef} className="grid max-h-80 content-start gap-2.5 overflow-y-auto">
              {(data.messages ?? []).map((m: any) => (
                <div key={m.id} className="rounded-xl bg-white/[.05] px-3.5 py-2.5 text-sm">
                  <p className="text-[12px] text-amber-200">
                    <b>{m.sender_name ?? "Member"}</b>
                    {m.sender_role === "ADMIN" ? " · Instructor" : ""}
                    {m.created_at ? <span className="text-slate-400"> · {when(m.created_at)}</span> : null}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              ))}
              {!messageCount && (
                <p className="text-sm text-slate-400">Start the discussion — visible to classmates only.</p>
              )}
            </div>

            <form onSubmit={sendDiscuss} className="mt-4 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="discuss-input">
                Message the class
              </label>
              <input
                id="discuss-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask or share…"
                className={`min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-orange-400/60 ${FOCUS}`}
              />
              <button
                disabled={sending || !draft.trim()}
                className={`btn-aurora flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${FOCUS}`}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post
              </button>
            </form>
          </div>
        )}

        {tab === "record" && (
          <div role="tabpanel" id="panel-record" aria-labelledby="tab-record" tabIndex={-1} className="grid gap-2.5">
            {(data.recordings ?? []).map((r: any) => (
              <button
                key={r.id}
                onClick={() => openRecording(r.id)}
                disabled={openingId === r.id}
                className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3.5 text-left text-sm hover:border-white/25 disabled:opacity-60 ${FOCUS}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                  {openingId === r.id ? <Loader2 size={15} className="animate-spin text-rose-200" /> : <Check size={15} className="text-rose-200" />}
                </span>
                <span className="font-semibold">{r.session_title ?? "Session recording"}</span>
                <span className="ml-auto text-xs text-slate-400">{Math.round((r.duration_sec ?? 0) / 60)} min</span>
              </button>
            ))}
            {!data.recordings?.length && (
              <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">
                Recordings appear here automatically after live sessions.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
