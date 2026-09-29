"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Icon } from "@/components/ui/icons";
import { initials, timeAgo } from "@/components/ui/primitives";
import {
  api,
  apiFetch,
  type ClassroomMessage,
  type ClassroomWorkspace,
  type WorkspaceMember,
} from "@/lib/dashboard-api";

/*
  Classroom workspace for an enrolled learner — ported from
  demo/rebuild-learner.html (#/class) and wired to the enriched endpoints:

    GET  /scope/classrooms/:id/workspace   (threaded messages + members)
    POST /scope/classrooms/:id/messages   (body, parent_id, is_issue, attachment)
    POST /scope/classrooms/:id/read       (read marker → seen counts)
    POST /messages/uploads                (attachment bytes)

  Discussion behaviour: replies quote the parent message, a question can be
  raised as an issue, attachments ride along with a post, "Seen by N" comes
  from the backend, and new posts arrive over the shell's SSE stream.
  A non-member gets `null` so the public classroom page can show its enroll
  card instead.
*/

const TABS = [
  { id: "sessions", label: "Timetable", icon: "radio" as const },
  { id: "materials", label: "Materials", icon: "fileText" as const },
  { id: "announce", label: "Announcements", icon: "megaphone" as const },
  { id: "assign", label: "Assignments", icon: "clipboardList" as const },
  { id: "discuss", label: "Discuss", icon: "messageSquare" as const },
  { id: "record", label: "Recordings", icon: "play" as const },
];
type TabId = (typeof TABS)[number]["id"];

function bytes(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1048576) return `${(v / 1024).toFixed(0)} KB`;
  return `${(v / 1048576).toFixed(1)} MB`;
}

const isAccessRefusal = (m: string) => /don'?t have access|not enrolled|forbidden|no access/i.test(m);

/** Files are private: fetch the signed URL, then open it. */
async function openPrivate(path: string, what: string): Promise<void> {
  const r = await apiFetch<{ url: string }>(path);
  window.open(r.url, "_blank", "noopener");
  if (!r.url) throw new Error(`Could not open ${what}.`);
}

export default function ClassroomWorkspace({
  classroomId,
  slug,
  title,
}: {
  classroomId: string;
  slug: string;
  title?: string;
}) {
  const { liveClassroom, liveSession } = useDashboard();
  const [tab, setTab] = useState<TabId>("discuss");
  const [data, setData] = useState<ClassroomWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [draft, setDraft] = useState("");
  const [asIssue, setAsIssue] = useState(false);
  const [replyTo, setReplyTo] = useState<ClassroomMessage | null>(null);
  const [attachment, setAttachment] = useState<{ key: string; name: string; kind: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState("");

  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api.classroomWorkspace(classroomId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load this classroom.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    void load();
  }, [load]);

  const messages = data?.messages ?? [];
  const members: WorkspaceMember[] = data?.members ?? [];

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length, tab]);

  /* Opening the discussion marks the room read, so "seen" is honest. */
  useEffect(() => {
    if (tab === "discuss" && data) void api.classroomRead(classroomId).catch(() => undefined);
  }, [tab, data, classroomId, liveClassroom]);

  /* Realtime: append posts from classmates and the instructor. */
  useEffect(() => {
    if (!liveClassroom || liveClassroom.classroom_id !== classroomId) return;
    setData((d) => {
      if (!d) return d;
      if (d.messages.some((m) => m.id === liveClassroom.message.id)) return d;
      return { ...d, messages: [...d.messages, liveClassroom.message] };
    });
  }, [liveClassroom, classroomId]);

  const liveSessionRow = (data?.sessions ?? []).find((s) => s.status === "live");
  const liveIsUp = Boolean(liveSessionRow) || liveSession?.classroom_id === classroomId;
  const me = members.find((m) => m.is_me)?.user_id;

  async function joinLive() {
    setError("");
    try {
      await api.liveToken({ classroom_id: classroomId });
      window.location.href = `/classrooms/${slug}/live`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not join the session.");
    }
  }

  async function pickFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const up = await api.uploadMessageFile(file);
      setAttachment({ key: up.key, name: up.name, kind: up.kind });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not attach that file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if ((!body && !attachment) || sending) return;
    setSending(true);
    setError("");
    try {
      const posted = await api.sendClassroomMessage(classroomId, {
        body,
        parent_id: replyTo?.id ?? null,
        is_issue: asIssue,
        attachment: attachment ?? null,
      });
      setData((d) => (d ? { ...d, messages: [...d.messages, posted] } : d));
      setDraft("");
      setReplyTo(null);
      setAsIssue(false);
      setAttachment(null);
      void api.classroomRead(classroomId).catch(() => undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not post your message.");
    } finally {
      setSending(false);
    }
  }

  async function openMaterial(id: string) {
    setOpening(id);
    setError("");
    try {
      await openPrivate(`/files/classroom-material/${encodeURIComponent(id)}`, "that file");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not open that file.");
    } finally {
      setOpening("");
    }
  }

  async function openRecording(id: string) {
    setOpening(id);
    setError("");
    try {
      await openPrivate(`/files/recording/${encodeURIComponent(id)}`, "that recording");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not open that recording.");
    } finally {
      setOpening("");
    }
  }

  async function openMessageFile(m: ClassroomMessage) {
    if (!m.attachment) return;
    setOpening(m.id);
    setError("");
    try {
      await openPrivate(`/files/classroom-message/${encodeURIComponent(m.id)}`, "that attachment");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not open that attachment.");
    } finally {
      setOpening("");
    }
  }

  async function submitAssignment(id: string) {
    setSubmitting(id);
    setError("");
    try {
      await api.submitAssignment(id, answers[id] ?? "");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not submit your answer.");
    } finally {
      setSubmitting("");
    }
  }

  if (error && isAccessRefusal(error) && !data) return null;
  if (loading && !data) {
    return (
      <div className="sec" aria-busy="true">
        <div className="skel" style={{ height: 120, marginBottom: 12 }} />
        <div className="skel" style={{ height: 320 }} />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="alert danger" role="alert">
        <Icon name="alertCircle" size={17} />
        <span style={{ flex: 1 }}>{error}</span>
        <button type="button" className="btn ghost sm" onClick={() => void load()}>
          <Icon name="refresh" size={14} /> Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="sec" style={{ marginTop: 26 }}>
      {/* Member banner + live join */}
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p className="eyebrow-sm">You are enrolled{title ? ` · ${title}` : ""}</p>
          <p className="sub" style={{ marginTop: 2 }}>
            {members.length} {members.length === 1 ? "member" : "members"} · everything below is private to this class
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/classrooms/${slug}/live`} className="btn ghost sm">
            <Icon name="video" size={14} /> Room
          </Link>
          <button type="button" className={`btn sm ${liveIsUp ? "pri" : "ghost"}`} onClick={() => void joinLive()} disabled={!liveIsUp}>
            <Icon name="radio" size={14} /> {liveIsUp ? "Join live now" : "Not live"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert danger" role="alert" style={{ marginTop: 12 }}>
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" className="btn ghost sm" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Classroom sections" style={{ marginTop: 18 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? "on" : undefined}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={14} /> {t.label}
            {t.id === "discuss" && messages.length > 0 && <span className="cnt">{messages.length}</span>}
          </button>
        ))}
      </div>

      {/* ---- Timetable ---- */}
      {tab === "sessions" && (
        <section id="panel-sessions" role="tabpanel" aria-labelledby="tab-sessions" className="card-grid">
          {data.sessions.length === 0 ? (
            <div className="card empty">
              <div className="ico">
                <Icon name="calendar" size={24} />
              </div>
              <h3>No sessions yet</h3>
              <p>Your instructor posts the timetable here, and you get a notification when it goes live.</p>
            </div>
          ) : (
            data.sessions.map((s) => (
              <article key={s.id} className="tile">
                <h3>
                  <Icon name="clock" size={14} /> {s.starts_at ? new Date(s.starts_at).toLocaleString() : "Time TBD"}
                </h3>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</p>
                <p className="hint">
                  {s.status === "live" ? "Live now" : s.status === "ended" ? "Ended" : "Scheduled"}
                  {s.recording_status && s.recording_status !== "none" ? ` · recording: ${s.recording_status}` : ""}
                </p>
                {s.status === "live" && (
                  <button type="button" className="btn pri sm" style={{ marginTop: 10 }} onClick={() => void joinLive()}>
                    <Icon name="radio" size={14} /> Join
                  </button>
                )}
              </article>
            ))
          )}
        </section>
      )}

      {/* ---- Materials ---- */}
      {tab === "materials" && (
        <section id="panel-materials" role="tabpanel" aria-labelledby="tab-materials">
          {data.materials.length === 0 ? (
            <div className="card empty">
              <div className="ico">
                <Icon name="fileText" size={24} />
              </div>
              <h3>No materials yet</h3>
              <p>Slides, workbooks and recordings your instructor uploads land here.</p>
            </div>
          ) : (
            <div className="qa">
              {data.materials.map((m) => (
                <button key={m.id} type="button" className="filecard" onClick={() => void openMaterial(m.id)} disabled={opening === m.id} style={{ width: "100%", textAlign: "left" }}>
                  <Icon name={opening === m.id ? "loader" : "fileText"} size={17} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{m.title}</b>
                    <span className="hint" style={{ display: "block" }}>
                      {m.mime ?? "file"} · {bytes(m.size_bytes)}
                    </span>
                  </span>
                  <Icon name="download" size={15} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Announcements ---- */}
      {tab === "announce" && (
        <section id="panel-announce" role="tabpanel" aria-labelledby="tab-announce">
          {data.announcements.length === 0 ? (
            <div className="card empty">
              <div className="ico">
                <Icon name="megaphone" size={24} />
              </div>
              <h3>Nothing announced</h3>
              <p>Class-wide announcements from your instructor will appear here.</p>
            </div>
          ) : (
            <div className="qa">
              {data.announcements.map((a) => (
                <article key={a.id} className="qa">
                  <p className="eyebrow-sm">{timeAgo(a.created_at)}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: "4px 0" }}>{a.title}</p>
                  <p className="sub" style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Assignments ---- */}
      {tab === "assign" && (
        <section id="panel-assign" role="tabpanel" aria-labelledby="tab-assign">
          {data.assignments.length === 0 ? (
            <div className="card empty">
              <div className="ico">
                <Icon name="clipboardList" size={24} />
              </div>
              <h3>No assignments</h3>
              <p>When your instructor sets work, you submit it here and get feedback back.</p>
            </div>
          ) : (
            <div className="grid2">
              {data.assignments.map((a) => (
                <article key={a.id} className="tile">
                  <h3>
                    <Icon name="clipboardList" size={14} /> {a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : "No due date"}
                  </h3>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>{a.title}</p>
                  {a.submitted > 0 && <span className="badge" style={{ marginTop: 6 }}>Submitted</span>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <label className="fc-sr-only" htmlFor={`answer-${a.id}`}>Your answer for {a.title}</label>
                    <input
                      id={`answer-${a.id}`}
                      className="input"
                      value={answers[a.id] ?? ""}
                      onChange={(e) => setAnswers({ ...answers, [a.id]: e.target.value })}
                      placeholder="Your answer…"
                    />
                    <button type="button" className="btn pri sm" onClick={() => void submitAssignment(a.id)} disabled={submitting === a.id}>
                      {submitting === a.id ? "…" : "Submit"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Discussion ---- */}
      {tab === "discuss" && (
        <section id="panel-discuss" role="tabpanel" aria-labelledby="tab-discuss" className="disc-main">
          <div className="disc-head">
            <Icon name="messageSquare" size={16} />
            <b style={{ fontSize: 14 }}>Class discussion</b>
            <span className="badge">{messages.length}</span>
            <span className="hint" style={{ marginLeft: "auto" }}>Visible to classmates and your instructor</span>
          </div>

          <div className="disc-log" ref={logRef} role="log" aria-live="polite" aria-label="Class discussion">
            {messages.length === 0 ? (
              <div className="thr-empty">
                <div>
                  <div className="ico" style={{ margin: "0 auto 12px", width: 46, height: 46, borderRadius: 15, display: "grid", placeItems: "center", background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <Icon name="messageSquare" size={22} />
                  </div>
                  <p className="sub">Start the conversation — ask a question or raise it as an issue.</p>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === me;
                const staff = m.sender_role === "ADMIN" || m.sender_role === "INSTRUCTOR";
                return (
                  <div key={m.id} className={`gm ${mine ? "mine" : ""} ${m.is_issue ? "issue" : ""}`}>
                    <span className="avatar" aria-hidden="true">{initials(m.sender_name ?? "?")}</span>
                    <div className="gbody">
                      <div className="gname">
                        <b>{mine ? "You" : m.sender_name ?? "Member"}</b>
                        {staff && <span className="badge">Instructor</span>}
                        {m.is_issue && <span className="issue-tag"><Icon name="alertCircle" size={11} /> Question</span>}
                        {m.is_solved && <span className="solved-tag"><Icon name="check" size={11} /> Solved</span>}
                        <span className="hint" style={{ marginLeft: "auto" }}>{timeAgo(m.created_at)}</span>
                      </div>

                      {m.parent_body && (
                        <div className="reply-strip">
                          <Icon name="arrowLeft" size={12} />
                          <span style={{ minWidth: 0 }}>
                            <b>{m.parent_sender ?? "Earlier"}</b>: {m.parent_body.slice(0, 90)}
                          </span>
                        </div>
                      )}

                      <div className="gbub">
                        {m.body}
                        {m.attachment && (
                          <button type="button" className="filecard" style={{ marginTop: 10, width: "100%" }} onClick={() => void openMessageFile(m)} disabled={opening === m.id}>
                            <Icon name={m.attachment.kind === "pdf" ? "fileText" : "paperclip"} size={16} />
                            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                              <b style={{ fontSize: 13 }}>{m.attachment.name}</b>
                              <span className="hint" style={{ display: "block" }}>Attachment · opens in a new tab</span>
                            </span>
                            <Icon name="externalLink" size={14} />
                          </button>
                        )}
                      </div>

                      <div className="seenrow">
                        <button type="button" className="btn ghost sm" onClick={() => setReplyTo(m)} style={{ padding: "2px 8px" }}>
                          <Icon name="arrowRight" size={12} /> Reply
                        </button>
                        {mine && m.seen_count > 0 && (
                          <span className="seen"><Icon name="eye" size={12} /> Seen by {m.seen_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form className="composer" onSubmit={send} style={{ flexWrap: "wrap" }}>
            {replyTo && (
              <div className="reply-strip" style={{ width: "100%", marginBottom: 8 }}>
                <Icon name="arrowLeft" size={12} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  Replying to <b>{replyTo.sender_name ?? "member"}</b>: {replyTo.body.slice(0, 60)}
                </span>
                <button type="button" className="btn ghost sm" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                  <Icon name="x" size={13} />
                </button>
              </div>
            )}
            {attachment && (
              <div className="reply-strip" style={{ width: "100%", marginBottom: 8 }}>
                <Icon name="paperclip" size={12} />
                <span style={{ flex: 1, minWidth: 0 }}>{attachment.name}</span>
                <button type="button" className="btn ghost sm" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                  <Icon name="x" size={13} />
                </button>
              </div>
            )}

            <div className="field-wrap">
              <input
                className="input"
                style={{ background: "transparent", border: 0, padding: "9px 0" }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={asIssue ? "Ask a question the instructor can answer…" : "Message the class…"}
                aria-label="Message the class"
              />
              <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Attach a file" style={{ padding: 6 }}>
                <Icon name={uploading ? "loader" : "paperclip"} size={15} />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="fc-sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pickFile(f);
                }}
              />
              <button
                type="button"
                className={asIssue ? "btn sm pri" : "btn ghost sm"}
                onClick={() => setAsIssue((v) => !v)}
                aria-pressed={asIssue}
                style={{ padding: 6 }}
                title="Raise as a question the instructor can mark solved"
              >
                <Icon name="alertCircle" size={14} />
              </button>
            </div>

            <button type="submit" className="sendbtn" disabled={sending || (!draft.trim() && !attachment)} aria-label="Post to the class">
              <Icon name={sending ? "loader" : "send"} size={16} />
            </button>
          </form>
        </section>
      )}

      {/* ---- Recordings ---- */}
      {tab === "record" && (
        <section id="panel-record" role="tabpanel" aria-labelledby="tab-record">
          {data.recordings.length === 0 ? (
            <div className="card empty">
              <div className="ico">
                <Icon name="play" size={24} />
              </div>
              <h3>No recordings yet</h3>
              <p>Recorded sessions appear here automatically once the instructor finishes processing them.</p>
            </div>
          ) : (
            <div className="qa">
              {data.recordings.map((r) => (
                <button key={r.id} type="button" className="filecard" onClick={() => void openRecording(r.id)} disabled={opening === r.id} style={{ width: "100%", textAlign: "left" }}>
                  <Icon name="play" size={16} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{r.session_title ?? "Session recording"}</b>
                    <span className="hint" style={{ display: "block" }}>{Math.round((r.duration_sec ?? 0) / 60)} min</span>
                  </span>
                  <Icon name="download" size={15} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="hint" style={{ marginTop: 14 }}>
        {liveSessionRow ? "A session is live right now." : "No live session at the moment."} Timetable, materials and
        recordings are private to enrolled members. Need something else?{" "}
        <Link href="/messages" style={{ color: "var(--brand-text)" }}>Message your instructor</Link>.
      </p>
    </div>
  );
}
