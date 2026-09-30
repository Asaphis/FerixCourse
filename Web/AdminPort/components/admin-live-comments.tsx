"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getClassroomMessages, postClassroomMessage, timeAgo } from "@/lib/admin";
import { subscribeAdminEvents } from "@/lib/live-events";
import { uploadFile } from "@/lib/upload";
import { Ic, Badge, SkList, Emp, Err, toast } from "@/components/reb-ui";

/*
  Classroom discussion — the console side.

  The admin console could already start and end a session, toggle recording and
  watch attendance, but it could not answer a learner's comment in the room.
  This panel closes that gap using endpoints that already exist:

    GET  /admin/classrooms/:id/messages   (same rich shape as the learner side)
    POST /admin/classrooms/:id/messages   { body, parent_id?, is_issue?, attachment?, notify? }

  An instructor's answer is also delivered to the learner app and the admin
  topic over SSE, so both sides stay in step.
*/

type Cm = {
  id: string;
  classroom_id: string;
  body: string;
  created_at: string;
  sender_name?: string | null;
  sender_role?: string | null;
  parent_id?: string | null;
  is_issue?: boolean;
  is_solved?: boolean;
  attachment?: { key: string; name: string; kind: string; url: string } | null;
  seen_count?: number;
};

type Props = { classroomId: string; className?: string; disabled?: boolean };

export function AdminLiveComments({ classroomId, className, disabled = false }: Props) {
  const [messages, setMessages] = useState<Cm[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Cm | null>(null);
  const [file, setFile] = useState<{ key: string; name: string; kind: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const alive = useRef(true);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await getClassroomMessages(classroomId);
      if (!alive.current) return;
      (rows ?? []).forEach((m) => seen.current.add(m.id));
      setMessages(rows ?? []);
      setErr("");
    } catch (e: unknown) {
      if (alive.current) setErr(e instanceof Error ? e.message : "Could not load the discussion.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The console event stream carries `classroom-message` for the admin topic, so
  // a learner question or a colleague's answer lands here immediately. A 30s
  // poll stays as a backstop if the stream drops.
  useEffect(() => {
    const off: unknown = subscribeAdminEvents((e: { event?: string; data?: { classroom_id?: string } }) => {
      if (e?.event !== "classroom-message") return;
      const id = e?.data?.classroom_id;
      if (!id || id === classroomId) void load();
    });
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      if (typeof off === "function") (off as () => void)();
      window.clearInterval(timer);
    };
  }, [load, classroomId]);


  async function attach(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    setBusy(true);
    try {
      const up = await uploadFile(f);
      if (alive.current) setFile({ key: up.key, name: up.name, kind: up.kind });
    } catch (e: unknown) {
      if (alive.current) toast(e instanceof Error ? e.message : "Upload failed", "info");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text && !file) return;
    setBusy(true);
    try {
      const created = (await postClassroomMessage(classroomId, {
        body: text,
        parent_id: replyTo?.id ?? null,
        attachment: file ?? undefined,
        notify: true,
      })) as Cm;
      if (!alive.current) return;
      seen.current.add(created.id);
      setMessages((prev) => (prev.some((x) => x.id === created.id) ? prev : [...prev, created]));
      setBody("");
      setFile(null);
      setReplyTo(null);
      toast("Reply sent to the classroom", "check");
    } catch (e2: unknown) {
      if (alive.current) toast(e2 instanceof Error ? e2.message : "Reply did not send", "info");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const shown = useMemo(() => {
    const roots = messages.filter((m) => !m.parent_id);
    return onlyIssues ? roots.filter((m) => m.is_issue && !m.is_solved) : roots;
  }, [messages, onlyIssues]);
  const repliesOf = useCallback((id: string) => messages.filter((m) => m.parent_id === id), [messages]);
  const openIssues = messages.filter((m) => m.is_issue && !m.is_solved && !m.parent_id).length;

  return (
    <section className={className ?? "reb-card"} aria-label="Classroom discussion">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>
          <Ic name="messageSquare" size={16} /> Discussion
        </h3>
        {openIssues > 0 && <Badge tone="warn">{openIssues} open question{openIssues === 1 ? "" : "s"}</Badge>}
        <span className="hint">{messages.length} message{messages.length === 1 ? "" : "s"}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={"reb-btn sm" + (onlyIssues ? " on" : " ghost")} aria-pressed={onlyIssues} onClick={() => setOnlyIssues((v) => !v)}>
            Questions only
          </button>
          <button type="button" className="reb-btn ghost sm" onClick={() => void load()}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        </span>
      </div>

      {loading && <SkList rows={4} />}
      {!loading && err && <Err msg={err} onRetry={() => void load()} />}

      {!loading && !err && !messages.length && (
        <Emp icon="messageSquare" title="No comments yet" note="Learner questions from this classroom land here, and your answers are delivered back into the room." />
      )}

      {!loading && !err && messages.length > 0 && !shown.length && (
        <Emp icon="messageSquare" title="No open questions" note="Every question in this classroom has been answered." />
      )}

      {!loading && !err && shown.map((m) => (
        <div key={m.id} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 12.5 }}>{m.sender_name ?? "Member"}</strong>
            {m.is_issue && <Badge tone={m.is_solved ? "ok" : "warn"}>{m.is_solved ? "Answered" : "Question"}</Badge>}
            <span className="hint" style={{ marginLeft: "auto" }}>{timeAgo(m.created_at)}</span>
          </div>
          {m.body && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{m.body}</p>}
          {m.attachment && (
            <a className="filecard" href={m.attachment.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", marginTop: 8 }}>
              <span className="fi">FILE</span>
              <span>
                <span style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>{m.attachment.name}</span>
                <span className="hint">Open attachment</span>
              </span>
              <span className="sp"><Ic name="download" size={15} /></span>
            </a>
          )}
          {repliesOf(m.id).map((r) => (
            <div key={r.id} style={{ marginTop: 8, marginLeft: 14, borderLeft: "2px solid var(--brand-line)", paddingLeft: 10 }}>
              <strong style={{ fontSize: 12 }}>{r.sender_name ?? "Member"}</strong>
              {r.body && <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{r.body}</p>}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" className="reb-btn ghost sm" onClick={() => setReplyTo(m)}>
              <Ic name="arrowLeft" size={13} /> Answer
            </button>
          </div>
        </div>
      ))}

      <form onSubmit={send} style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 6 }}>
        {replyTo && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span className="hint">Answering {replyTo.sender_name ?? "a learner"}</span>
            <button type="button" className="reb-btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setReplyTo(null)} aria-label="Cancel answer">
              <Ic name="x" size={13} />
            </button>
          </div>
        )}
        <label className="sr-only" htmlFor={"adm-file-" + classroomId}>Attach a file to your answer</label>
        <input id={"adm-file-" + classroomId} type="file" disabled={disabled || busy} onChange={(e) => void attach(e.target.files?.[0] ?? null)} />
        {file && (
          <div className="filecard" style={{ marginTop: 8 }}>
            <span className="fi">FILE</span>
            <span style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>{file.name}</span>
            <span className="sp" />
            <button type="button" className="reb-btn ghost sm" onClick={() => setFile(null)} aria-label="Remove attachment">
              <Ic name="x" size={13} />
            </button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <label className="sr-only" htmlFor={"adm-body-" + classroomId}>Write a reply</label>
          <input
            id={"adm-body-" + classroomId}
            className="reb-input"
            style={{ flex: "1 1 240px" }}
            placeholder={disabled ? "Open the room to answer" : "Answer this classroom…"}
            value={body}
            disabled={disabled}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" className="reb-btn sm" disabled={disabled || busy || (!body.trim() && !file)}>
            <Ic name="send" size={15} /> {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
