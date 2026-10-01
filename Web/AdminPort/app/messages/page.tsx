"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConversations,
  getThread,
  initials,
  markThreadRead,
  replyToConversation,
  timeAgo,
  uploadMessageFile,
  fileSignedUrl,
} from "@/lib/admin";
import type { ConversationRow, MessageRow } from "@/lib/admin-types";
import { Emp, Err, Ic, Ph, Sk, toast, ToastHost } from "@/components/reb-ui";
import { Shell } from "@/components/shell";
import { subscribeAdminEvents } from "@/lib/live-events";

/*
  Inbox — conversations with learners (GET /admin/conversations, enriched with
  last_body / last_at / unread), a real thread, replies, PDF attachments
  (POST /messages/uploads) and read receipts (POST /admin/conversations/:id/read).

  The list↔thread flow collapses on phones through the same data-open contract
  the learner app uses, and new messages arrive over /admin/events/stream.
*/

export default function InboxPage() {
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [attachment, setAttachment] = useState<{ key: string; name: string; kind: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setConvs(await getConversations());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load the inbox.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openThread = useCallback(async (id: string) => {
    setActiveId(id);
    setThreadLoading(true);
    setError("");
    try {
      setThread(await getThread(id));
      await markThreadRead(id);
      setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load that conversation.");
    } finally {
      setThreadLoading(false);
    }
  }, []);

  /* Realtime: a learner's message bumps the list and the open thread. */
  useEffect(() => {
    const active = activeId;
    return subscribeAdminEvents(({ event, data }) => {
      if (event !== "message") return;
      const p = data as { conversation_id: string; message: MessageRow };
      const incoming = p.message;
      setConvs((prev) => {
        const i = prev.findIndex((c) => c.id === p.conversation_id);
        if (i === -1) return prev;
        const next = [...prev];
        next[i] = {
          ...next[i],
          last_body: incoming.body,
          last_at: incoming.created_at,
          unread: p.conversation_id === active ? 0 : Number(next[i].unread) + 1,
        };
        return next;
      });
      if (p.conversation_id === active) {
        setThread((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      }
    });
  }, [activeId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [thread.length]);

  async function pickFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const up = await uploadMessageFile(file);
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
    if (!activeId || (!body && !attachment) || sending) return;
    setSending(true);
    setError("");
    try {
      const posted = await replyToConversation(activeId, {
        body,
        parent_id: replyTo?.id ?? null,
        attachment: attachment ?? null,
      });
      setThread((prev) => (prev.some((m) => m.id === posted.id) ? prev : [...prev, posted]));
      setDraft("");
      setReplyTo(null);
      setAttachment(null);
      toast("Reply sent");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send the reply.");
    } finally {
      setSending(false);
    }
  }

  async function openAttachment(m: MessageRow) {
    if (!m.attachment) return;
    setError("");
    try {
      const url = await fileSignedUrl(`/files/message/${encodeURIComponent(m.id)}`);
      window.open(url, "_blank", "noopener");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not open that attachment.");
    }
  }

  const unreadTotal = convs.reduce((n, c) => n + (Number(c.unread) || 0), 0);

  return (
    <Shell>
      <Ph
        title="Inbox"
        sub={unreadTotal ? `${unreadTotal} unread across ${convs.length} conversations` : `${convs.length} conversations`}
        actions={
          <button type="button" className="reb-btn ghost sm" onClick={() => void load()}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        }
      />

      {error ? <Err msg={error} onRetry={() => void load()} /> : null}

      <div
        className="msgpage"
        data-open={activeId ? "1" : "0"}
        style={{ borderRadius: "var(--r4)", border: "1px solid var(--border)", overflow: "hidden" }}
      >
        <div className="msglist">
          <div className="mlhead">
            <b style={{ fontSize: 13.5 }}>Conversations</b>
            <span className="hint" style={{ marginLeft: "auto" }}>{convs.length}</span>
          </div>
          <div className="mlitems" role="listbox" aria-label="Conversations" style={{ overflowY: "auto", flex: 1, padding: 8 }}>
            {loading ? (
              <div style={{ padding: 10 }}>
                <Sk h={54} mb={8} />
                <Sk h={54} mb={8} />
                <Sk h={54} />
              </div>
            ) : convs.length === 0 ? (
              <Emp icon="inbox" title="No conversations" note="When a learner starts a thread it lands here." />
            ) : (
              convs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={activeId === c.id}
                  className={`conv${activeId === c.id ? " on" : ""}`}
                  onClick={() => void openThread(c.id)}
                >
                  <span className="cname">
                    <span className="avatar" style={{ width: 38, height: 38, position: "static" }}>
                      {initials(c.student_name || c.student_email)}
                    </span>
                  </span>
                  <span className="cbody">
                    <b className="csub" style={{ opacity: 1 }}>{c.student_name || c.student_email || "Learner"}</b>
                    <span className="csub">{c.subject || "No subject"}</span>
                    <span className="cprev">{c.last_body || "No messages yet"}</span>
                  </span>
                  <span className="crow" style={{ flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {Number(c.unread) > 0 && <span className="cnt alert" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                    <span className="hint">{timeAgo(c.last_at || c.updated_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="msgthread">
          {!activeId ? (
            <div className="thr-empty">
              <Emp icon="messageSquare" title="Pick a conversation" note="Read the thread, reply, and attach a PDF if the learner sent you one to check." />
            </div>
          ) : (
            <>
              <div className="thrhead">
                <button type="button" className="backbtn" onClick={() => setActiveId(null)} aria-label="Back to conversations">
                  <Ic name="arrowLeft" size={16} />
                </button>
                <b style={{ fontSize: 14 }}>
                  {convs.find((c) => c.id === activeId)?.student_name ??
                    convs.find((c) => c.id === activeId)?.student_email ??
                    "Learner"}
                </b>
                <button
                  type="button"
                  className="reb-btn ghost sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => activeId && void openThread(activeId)}
                >
                  <Ic name="refresh" size={14} />
                </button>
              </div>

              <div className="thrlog" ref={logRef} role="log" aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {threadLoading ? <Sk h={60} /> : thread.length === 0 ? <p className="sub">No messages yet.</p> : null}
                {thread.map((m) => (
                  <div key={m.id} className="gm mine">
                    <div className="gbody">
                      <div className="gname">
                        <b>You</b>
                        <span className="hint">{timeAgo(m.created_at)}</span>
                      </div>
                      {m.parent_body ? (
                        <div className="reply-strip">
                          <Ic name="arrowLeft" size={12} />
                          <span style={{ minWidth: 0 }}>
                            <b>{m.parent_sender ?? "Learner"}</b>: {m.parent_body.slice(0, 90)}
                          </span>
                        </div>
                      ) : null}
                      <div className="gbub">
                        {m.body}
                        {m.attachment ? (
                          <button type="button" className="filecard" style={{ marginTop: 10, width: "100%" }} onClick={() => void openAttachment(m)}>
                            <Ic name={m.attachment.kind === "pdf" ? "fileText" : "fileText"} size={16} />
                            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                              <b style={{ fontSize: 13 }}>{m.attachment.name}</b>
                              <span className="hint" style={{ display: "block" }}>{m.attachment.kind.toUpperCase()}</span>
                            </span>
                            <Ic name="external" size={14} />
                          </button>
                        ) : null}
                      </div>
                      <div className="seenrow">
                        <button type="button" className="reb-btn ghost sm" onClick={() => setReplyTo(m)} style={{ padding: "2px 8px" }}>
                          <Ic name="arrowRight" size={12} /> Reply
                        </button>
                        {m.is_read && (
                          <span className="seen">
                            <Ic name="check" size={11} /> Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form className="composer" onSubmit={send} style={{ flexWrap: "wrap" }}>
                {replyTo ? (
                  <div className="reply-strip" style={{ width: "100%", marginBottom: 8 }}>
                    <Ic name="arrowLeft" size={12} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      Replying to your message: {replyTo.body.slice(0, 50)}
                    </span>
                    <button type="button" className="reb-btn ghost sm" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                      <Ic name="x" size={13} />
                    </button>
                  </div>
                ) : null}
                {attachment ? (
                  <div className="reply-strip" style={{ width: "100%", marginBottom: 8 }}>
                    <Ic name="fileText" size={12} />
                    <span style={{ flex: 1, minWidth: 0 }}>{attachment.name}</span>
                    <button type="button" className="reb-btn ghost sm" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                      <Ic name="x" size={13} />
                    </button>
                  </div>
                ) : null}
                <div className="field-wrap">
                  <input
                    className="reb-input"
                    style={{ background: "transparent", border: 0, padding: "9px 0" }}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={replyTo ? "Write a reply…" : "Reply to the learner…"}
                    aria-label="Reply"
                  />
                  <button type="button" className="reb-btn ghost sm" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Attach a file" style={{ padding: 6 }}>
                    <Ic name={uploading ? "refresh" : "fileText"} size={15} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void pickFile(f);
                    }}
                  />
                </div>
                <button type="submit" className="sendbtn" disabled={sending || (!draft.trim() && !attachment)} aria-label="Send reply">
                  <Ic name={sending ? "refresh" : "send"} size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <ToastHost />
    </Shell>
  );
}
