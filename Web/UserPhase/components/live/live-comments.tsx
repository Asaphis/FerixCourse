"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type ClassroomMessage } from "@/lib/dashboard-api";
import { useLiveStream } from "@/lib/live-events";
import { Icon } from "@/components/ui/icons";

/*
  Classroom comments — the discussion panel the live room never had.

  Built on the app's own helpers (all verified in the repo):
    • api.classroomWorkspace(id)              -> { messages, sessions, ... }
    • api.sendClassroomMessage(id, payload)   -> the created comment
    • api.uploadMessageFile(file)             -> { key, name, kind, size }
    • api.classroomRead(id)                   -> clears the unread counter
  The server broadcasts the new comment (topic classroom:<id>), so a reply
  appears for everyone without a refresh.

  House rules kept: a failed request is never shown as "there is nothing here";
  nothing sets state after unmount; the composer works on a phone.
*/

type Props = {
  classroomId: string;
  initial?: ClassroomMessage[];
  disabled?: boolean;
  className?: string;
  /** Called for every comment that arrives while the panel is not on screen. */
  onMessage?: (m: ClassroomMessage) => void;
};

export function LiveComments({ classroomId, initial = [], disabled = false, className, onMessage }: Props) {
  const [messages, setMessages] = useState<ClassroomMessage[]>(initial);
  const [loading, setLoading] = useState(!initial.length);
  const [err, setErr] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ClassroomMessage | null>(null);
  const [file, setFile] = useState<{ key: string; name: string; kind: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const alive = useRef(true);
  const logRef = useRef<HTMLDivElement | null>(null);
  const seen = useRef<Set<string>>(new Set(initial.map((m) => m.id)));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const ws = await api.classroomWorkspace(classroomId);
      if (!alive.current) return;
      const list = ws.messages ?? [];
      list.forEach((m) => seen.current.add(m.id));
      setMessages(list);
      setErr("");
      void api.classroomRead(classroomId).catch(() => undefined);
    } catch (e: unknown) {
      if (!alive.current) return;
      setErr(e instanceof Error ? e.message : "Could not load the discussion.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    if (initial.length) return;
    void load();
  }, [load, initial.length]);

  // Real-time: the server broadcasts {classroom_id, message} as
  // \`classroom-message\` on topic classroom:<id>, so a reply from anyone in the
  // room appears immediately for everyone — no refresh, no polling.
  useLiveStream(
    {
      "classroom-message": (data: { classroom_id: string; message: ClassroomMessage }) => {
        if (!alive.current || !data?.classroom_id || data.classroom_id !== classroomId) return;
        const m = data.message;
        if (!m || seen.current.has(m.id)) return;
        seen.current.add(m.id);
        setMessages((prev) => [...prev, m]);
        onMessage?.(m);
      },
    },
    { enabled: !disabled }
  );

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function attach(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    setUploading(true);
    setErr("");
    try {
      const up = await api.uploadMessageFile(f);
      if (alive.current) setFile({ key: up.key, name: up.name, kind: up.kind });
    } catch (e: unknown) {
      if (alive.current) setErr(e instanceof Error ? e.message : "That file could not be uploaded.");
    } finally {
      if (alive.current) setUploading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text && !file) return;
    setSending(true);
    setErr("");
    try {
      const created = await api.sendClassroomMessage(classroomId, {
        body: text,
        parent_id: replyTo?.id,
        attachment: file ?? undefined,
      });
      if (!alive.current) return;
      seen.current.add(created.id);
      setMessages((prev) => (prev.some((x) => x.id === created.id) ? prev : [...prev, created]));
      setBody("");
      setFile(null);
      setReplyTo(null);
    } catch (e2: unknown) {
      if (alive.current) setErr(e2 instanceof Error ? e2.message : "Your comment did not send. Try again.");
    } finally {
      if (alive.current) setSending(false);
    }
  }

  const grouped = useMemo(() => messages.filter((m) => !m.parent_id), [messages]);
  const repliesOf = useCallback((id: string) => messages.filter((m) => m.parent_id === id), [messages]);

  return (
    <section className={className ?? "card"} aria-label="Class discussion">
      <header className="sec-head">
        <h3><Icon name="messageSquare" size={16} /> Comments</h3>
        <span className="hint">{messages.length} message{messages.length === 1 ? "" : "s"}</span>
        <span className="sp" />
        <button type="button" className="btn ghost sm" onClick={() => void load()}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </header>

      <div ref={logRef} className="thrlog" role="log" aria-live="polite" aria-relevant="additions">
        {loading && <p className="sub">Loading the discussion…</p>}

        {err && (
          <div className="alert danger" role="alert">
            <Icon name="alertCircle" size={16} />
            <span>{err}</span>
            <button type="button" className="btn ghost sm" onClick={() => void load()} style={{ marginLeft: "auto" }}>Try again</button>
          </div>
        )}

        {!loading && !err && !messages.length && (
          <div className="empty">
            <div className="ico" aria-hidden="true"><Icon name="messageSquare" size={20} /></div>
            <h3>No comments yet</h3>
            <p className="sub">Ask a question or answer one — everyone in this classroom sees it and the instructor is notified.</p>
          </div>
        )}

        {grouped.map((m) => (
          <article key={m.id} className="bub" style={m.is_issue ? { borderColor: "rgba(251, 191, 36, 0.45)" } : undefined}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <strong style={{ fontSize: 12.5 }}>{m.sender_name ?? "Member"}</strong>
              {m.is_issue && <span className="pill warn">Question</span>}
              <span className="hint" style={{ marginLeft: "auto" }}>
                {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
            {m.body && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{m.body}</p>}
            {m.attachment && (
              <a className="filecard" href={m.attachment.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <span className="fi">{String(m.attachment.kind || "FILE").slice(0, 4).toUpperCase()}</span>
                <span>
                  <span style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>{m.attachment.name}</span>
                  <span className="hint">Open attachment</span>
                </span>
                <span className="sp"><Icon name="download" size={15} /></span>
              </a>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn ghost sm" onClick={() => setReplyTo(m)}>
                <Icon name="arrowLeft" size={13} /> Reply
              </button>
            </div>
            {repliesOf(m.id).map((r) => (
              <div key={r.id} className="bub" style={{ marginTop: 8, marginLeft: 14, background: "var(--surface3)" }}>
                <strong style={{ fontSize: 12 }}>{r.sender_name ?? "Member"}</strong>
                {r.body && <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{r.body}</p>}
              </div>
            ))}
          </article>
        ))}
      </div>

      <form className="composer" onSubmit={send}>
        {replyTo && (
          <div className="reply-strip">
            <span className="hint">Replying to {replyTo.sender_name ?? "a comment"}</span>
            <span className="sp" />
            <button type="button" className="btn ghost sm" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <Icon name="x" size={13} />
            </button>
          </div>
        )}

        <label className="sr-only" htmlFor={"comment-file-" + classroomId}>Attach a file to your comment</label>
        <input
          id={"comment-file-" + classroomId}
          type="file"
          disabled={disabled || uploading}
          onChange={(e) => void attach(e.target.files?.[0] ?? null)}
        />
        {uploading && <p className="hint" style={{ marginTop: 6 }}>Uploading…</p>}
        {file && (
          <div className="filecard" style={{ marginTop: 8 }}>
            <span className="fi">FILE</span>
            <span>
              <span style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>{file.name}</span>
              <span className="hint">Ready to send</span>
            </span>
            <span className="sp" />
            <button type="button" className="btn ghost sm" onClick={() => setFile(null)} aria-label="Remove attachment">
              <Icon name="x" size={13} />
            </button>
          </div>
        )}

        <div className="row">
          <label className="sr-only" htmlFor={"comment-body-" + classroomId}>Write a comment</label>
          <input
            id={"comment-body-" + classroomId}
            className="inp"
            placeholder={disabled ? "Comments open when the session starts" : "Ask a question or leave a comment…"}
            value={body}
            disabled={disabled}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" className="btn pri" disabled={disabled || sending || uploading || (!body.trim() && !file)}>
            <Icon name="send" size={15} /> {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
