"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useToast } from "@/components/dashboard/preferences";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { initials, timeAgo } from "@/components/ui/primitives";
import { api, apiFetch, type Conversation, type Message } from "@/lib/dashboard-api";

/*
  Messages — ported from demo/rebuild-learner.html (#/messages): a conversation
  list and a thread, with the list↔thread flow working on a phone (the shell's
  `fit` mode plus data-open collapse the list when a thread is open).

  Real endpoints only: GET /messages/conversations, GET /messages/conversations/:id
  (?since=), POST (reply + attachment), POST .../read, POST /messages/uploads,
  POST /messages/typing. New messages arrive over the shell's SSE stream.
  The open thread is mirrored into the URL (?c=<id>) so back/forward work.
*/

export default function MessagesPage() {
  const { data, setConversations, liveMessage, liveTyping, clearLiveMessage } = useDashboard();
  const { push } = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachment, setAttachment] = useState<{ key: string; name: string; kind: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState("");
  const [starting, setStarting] = useState(false);
  const [typing, setTyping] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef(0);

  const conversations = data?.conversations ?? [];
  const active = conversations.find((c) => c.id === activeId) ?? null;
  const me = data?.profile?.id;

  /* URL is the source of truth for which thread is open. */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("c");
    if (fromUrl) setActiveId(fromUrl);
  }, []);

  const select = useCallback((id: string | null) => {
    setActiveId(id);
    setReplyTo(null);
    setAttachment(null);
    setError("");
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("c", id);
    else url.searchParams.delete("c");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const loadThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    setError("");
    try {
      setMessages(await api.conversation(id));
      // Opening the thread is the read receipt.
      const r = await api.markConversationRead(id);
      api
        .conversations()
        .then(setConversations)
        .catch(() => undefined);
      if (r.read > 0) setTyping(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load this conversation.");
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, [setConversations]);

  useEffect(() => {
    if (activeId) void loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length]);

  /* Realtime: append incoming messages, and answer with a read receipt. */
  useEffect(() => {
    if (!liveMessage) return;
    if (liveMessage.conversation_id !== activeId) return;
    setMessages((prev) => (prev.some((m) => m.id === liveMessage.message.id) ? prev : [...prev, liveMessage.message]));
    clearLiveMessage();
    void api.markConversationRead(activeId).catch(() => undefined);
  }, [liveMessage, activeId, clearLiveMessage]);

  /* Typing indicator from the other side (ephemeral, no DB write). */
  useEffect(() => {
    if (!liveTyping || liveTyping.conversation_id !== activeId || liveTyping.user_id === me) return;
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 4000);
    return () => clearTimeout(t);
  }, [liveTyping, activeId, me]);

  function onDraft(v: string) {
    setDraft(v);
    if (!activeId) return;
    const now = Date.now();
    if (now - lastTypingRef.current > 2500) {
      lastTypingRef.current = now;
      void api.sendTyping(activeId).catch(() => undefined);
    }
  }

  async function startConversation(e: React.FormEvent) {
    e.preventDefault();
    const s = subject.trim();
    if (!s) return;
    setStarting(true);
    setError("");
    try {
      const c = await api.createConversation(s);
      const fresh = await api.conversations();
      setConversations(fresh);
      setSubject("");
      push("Conversation started.");
      select(c.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start the conversation.");
    } finally {
      setStarting(false);
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
    if (!activeId || (!body && !attachment) || sending) return;
    setSending(true);
    setError("");
    try {
      const posted = await api.sendMessage(activeId, {
        body,
        parent_id: replyTo?.id ?? null,
        attachment: attachment ?? null,
      });
      setMessages((prev) => (prev.some((m) => m.id === posted.id) ? prev : [...prev, posted]));
      setDraft("");
      setReplyTo(null);
      setAttachment(null);
      api
        .conversations()
        .then(setConversations)
        .catch(() => undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  async function openAttachment(m: Message) {
    if (!m.attachment) return;
    setError("");
    try {
      // Private file: fetch the signed URL first, then open it.
      const signed = await apiFetch<{ url: string }>(`/files/message/${encodeURIComponent(m.id)}`);
      window.open(signed.url, "_blank", "noopener");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open that attachment.");
    }
  }

  return (
    <>
      <PageHead title="Messages" sub="Your direct line to instructors and support." />

      {error && (
        <div className="alert danger" role="alert" style={{ marginBottom: 12 }}>
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" className="btn ghost sm" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="msgpage" data-open={activeId ? "1" : "0"} style={{ height: "calc(100vh - 210px)", borderRadius: "var(--r4)", border: "1px solid var(--border)", overflow: "hidden" }}>
        {/* ---- Conversation list ---- */}
        <div className="msglist">
          <div className="mlhead">
            <form onSubmit={startConversation} style={{ display: "flex", gap: 8 }}>
              <div className="field-wrap">
                <Icon name="plus" size={14} />
                <label className="fc-sr-only" htmlFor="new-conv">New conversation subject</label>
                <input
                  id="new-conv"
                  className="input"
                  style={{ background: "transparent", border: 0, padding: "8px 0" }}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Start a conversation…"
                />
              </div>
              <button type="submit" className="btn pri sm" disabled={starting || !subject.trim()}>
                {starting ? "…" : "Start"}
              </button>
            </form>
          </div>

          <div className="mlitems" role="listbox" aria-label="Conversations" style={{ overflowY: "auto", flex: 1, padding: 8 }}>
            {conversations.length === 0 ? (
              <div className="empty" style={{ padding: "30px 10px" }}>
                <div className="ico"><Icon name="messageSquare" size={22} /></div>
                <h3>No conversations yet</h3>
                <p>Start one above — instructors reply here.</p>
              </div>
            ) : (
              conversations.map((c: Conversation) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={activeId === c.id}
                  className={`conv${activeId === c.id ? " on" : ""}`}
                  onClick={() => select(c.id)}
                >
                  <span className="cname">
                    <span className="avatar" style={{ width: 40, height: 40, position: "static" }}>
                      {initials(c.admin_name || c.subject || "Ferix")}
                    </span>
                  </span>
                  <span className="cbody">
                    <b className="csub" style={{ opacity: 1 }}>{c.admin_name || c.subject || "FerixCourse support"}</b>
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

        {/* ---- Thread ---- */}
        <div className="msgthread">
          {!active ? (
            <div className="thr-empty">
              <div>
                <div className="ico" style={{ margin: "0 auto 12px", width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <Icon name="messageSquare" size={24} />
                </div>
                <p className="sub">Choose a conversation to read and reply.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="thrhead">
                <button type="button" className="backbtn" onClick={() => select(null)} aria-label="Back to conversations">
                  <Icon name="arrowLeft" size={16} />
                </button>
                <span className="avatar" style={{ width: 34, height: 34 }}>{initials(active.admin_name || "Ferix")}</span>
                <span style={{ minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 14 }}>{active.admin_name || "FerixCourse support"}</b>
                  <span className="hint">{typing ? "typing…" : active.subject || "No subject"}</span>
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => activeId && void loadThread(activeId)}
                  aria-label="Refresh this thread"
                >
                  <Icon name="refresh" size={14} />
                </button>
              </div>

              <div className="thrlog" ref={logRef} role="log" aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {loadingThread && <p className="sub">Loading messages…</p>}
                {!loadingThread && messages.length === 0 && <p className="sub">No messages yet — say hello.</p>}
                {messages.map((m) => {
                  const mine = m.sender_id === me;
                  return (
                    <div key={m.id} className={`gm ${mine ? "mine" : ""}`}>
                      {!mine && <span className="avatar" aria-hidden="true">{initials(m.sender_name ?? "Ferix")}</span>}
                      <div className="gbody">
                        <div className="gname">
                          <b>{mine ? "You" : m.sender_name ?? "FerixCourse"}</b>
                          <span className="hint">{timeAgo(m.created_at)}</span>
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
                            <button type="button" className="filecard" style={{ marginTop: 10, width: "100%" }} onClick={() => void openAttachment(m)}>
                              <Icon name={m.attachment.kind === "pdf" ? "fileText" : "paperclip"} size={16} />
                              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                                <b style={{ fontSize: 13 }}>{m.attachment.name}</b>
                                <span className="hint" style={{ display: "block" }}>Attachment</span>
                              </span>
                              <Icon name="externalLink" size={14} />
                            </button>
                          )}
                        </div>

                        <div className="seenrow">
                          <button type="button" className="btn ghost sm" onClick={() => setReplyTo(m)} style={{ padding: "2px 8px" }}>
                            <Icon name="arrowRight" size={12} /> Reply
                          </button>
                          {mine && m.is_read && <span className="seen"><Icon name="check" size={11} /> Read</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typing && <p className="hint" style={{ marginTop: 10 }}>Instructor is typing…</p>}
              </div>

              <form className="composer" onSubmit={send} style={{ flexWrap: "wrap" }}>
                {replyTo && (
                  <div className="reply-strip" style={{ width: "100%", marginBottom: 8 }}>
                    <Icon name="arrowLeft" size={12} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      Replying to <b>{replyTo.sender_name ?? "message"}</b>: {replyTo.body.slice(0, 60)}
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
                    onChange={(e) => onDraft(e.target.value)}
                    placeholder={replyTo ? "Write a reply…" : "Write a message…"}
                    aria-label="Write a message"
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
                </div>
                <button type="submit" className="sendbtn" disabled={sending || (!draft.trim() && !attachment)} aria-label="Send message">
                  <Icon name={sending ? "loader" : "send"} size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        Need a class instead of a conversation? <Link href="/request" style={{ color: "var(--brand-text)" }}>Request training</Link>.
      </p>
    </>
  );
}
