"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useToast } from "@/components/dashboard/preferences";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { EmptyState, LoadingGrid, timeAgo } from "@/components/ui/primitives";
import { api, type Conversation, type Message } from "@/lib/dashboard-api";
import { useMutation } from "@/lib/use-dashboard";

/*
  Messages — real conversations from /messages/conversations, real threads from
  /messages/conversations/:id, real sends via POST.

  Conversation list uses role="listbox" with aria-selected, and the thread is a
  labelled region with a polite live region so new replies are announced.
*/

export default function MessagesPage() {
  const { data, loading, failures, reload, setConversations } = useDashboard();
  const { push } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = data?.conversations ?? [];
  const active = conversations.find((c) => c.id === activeId) ?? null;

  /* Load a thread from the server. */
  const loadThread = useCallback(async (id: string) => {
    setThreadLoading(true);
    setThreadError("");
    try {
      setMessages(await api.conversation(id));
    } catch (e: unknown) {
      setThreadError(e instanceof Error ? e.message : "Could not load this conversation.");
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) void loadThread(activeId);
  }, [activeId, loadThread]);

  /* Keep the newest message in view. */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const newConversation = useMutation(async (s: string) => {
    const c = await api.createConversation(s);
    const fresh = await api.conversations();
    setConversations(fresh);
    setActiveId(c.id);
    push("Conversation started.");
    return c;
  });

  const send = useMutation(async (id: string, body: string) => {
    const m = await api.sendMessage(id, body);
    setMessages((prev) => [...prev, m]);
    // Refresh counts so the sidebar badge is accurate.
    api.conversations().then(setConversations).catch(() => undefined);
    return m;
  });

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    const s = subject.trim();
    if (!s) return;
    const r = await newConversation.run(s);
    if (r) setSubject("");
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!activeId || !body) return;
    const r = await send.run(activeId, body);
    if (r) setDraft("");
  }

  return (
    <>
      <PageHead title="Messages" sub="Your direct line to instructors and support." />

      {failures.length > 0 && (
        <div className="fc-alert fc-alert-danger" role="alert">
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>Could not load your conversations.</span>
          <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={reload}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      )}

      <form className="fc-toolbar" onSubmit={onStart}>
        <label className="fc-sr-only" htmlFor="fc-new-subject">
          New conversation subject
        </label>
        <input
          id="fc-new-subject"
          className="fc-input"
          style={{ maxWidth: 340 }}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Start a new conversation…"
          required
        />
        <button type="submit" className="fc-btn fc-btn-primary" disabled={newConversation.pending}>
          <Icon name="plus" size={15} />
          {newConversation.pending ? "Starting…" : "Start conversation"}
        </button>
        {newConversation.error && (
          <span style={{ color: "var(--fc-danger-fg)", fontSize: 13 }} role="alert">
            {newConversation.error}
          </span>
        )}
      </form>

      {loading ? (
        <LoadingGrid height={280} count={2} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="messageSquare"
          title="No conversations yet"
          body="Start one above and your instructor will pick it up from there."
        />
      ) : (
        <div className="fc-msg-layout">
          <div className="fc-card" style={{ padding: 10 }}>
            <h2 className="fc-sr-only">Conversations</h2>
            <div role="listbox" aria-label="Conversations" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {conversations.map((c: Conversation) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={activeId === c.id}
                  className="fc-conv"
                  onClick={() => {
                    setActiveId(c.id);
                    setConfirmDelete(false);
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="fc-conv-title">{c.subject || "Conversation"}</span>
                    <span className="fc-conv-preview">Updated {timeAgo(c.updated_at)}</span>
                  </span>
                  {Number(c.unread) > 0 && (
                    <span className="fc-unread" aria-label={`${c.unread} unread`}>
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="fc-card" aria-live="polite">
            {!active ? (
              <EmptyState icon="messageSquare" title="Select a conversation" body="Choose one on the left to read and reply." />
            ) : (
              <>
                <div className="fc-sec-head">
                  <h2 className="fc-sec-title">{active.subject || "Conversation"}</h2>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button type="button" className="fc-btn fc-btn-ghost fc-btn-sm" onClick={() => void loadThread(active.id)}>
                      <Icon name="refresh" size={14} /> Refresh
                    </button>
                    <button
                      type="button"
                      className="fc-btn fc-btn-ghost fc-btn-sm"
                      onClick={() => setConfirmDelete(true)}
                      aria-label="Close this conversation"
                    >
                      <Icon name="x" size={14} /> Close
                    </button>
                  </div>
                </div>

                {confirmDelete && (
                  <div className="fc-alert fc-alert-danger" role="alert">
                    <Icon name="alertTriangle" size={17} />
                    <span style={{ flex: 1 }}>
                      Closing a conversation needs a server-side action that does not exist yet, so nothing was changed. Ask
                      support to archive it for you.
                    </span>
                    <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={() => setConfirmDelete(false)}>
                      Dismiss
                    </button>
                  </div>
                )}

                {threadError && (
                  <div className="fc-alert fc-alert-danger" role="alert">
                    <Icon name="alertCircle" size={17} />
                    <span style={{ flex: 1 }}>{threadError}</span>
                    <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={() => void loadThread(active.id)}>
                      Retry
                    </button>
                  </div>
                )}

                <div className="fc-thread" ref={scrollRef} role="log" aria-label={`Messages in ${active.subject || "conversation"}`}>
                  {threadLoading && <p style={{ fontSize: 13, color: "var(--fc-muted)" }}>Loading messages…</p>}
                  {!threadLoading && messages.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--fc-muted)" }}>No messages yet — say hello.</p>
                  )}
                  {messages.map((m) => {
                    const mine = m.sender_id === data?.profile?.id;
                    return (
                      <div key={m.id} style={{ maxWidth: "100%" }}>
                        <p className="fc-thread-meta">
                          {mine ? "You" : "Instructor"} · {new Date(m.created_at).toLocaleString()}
                        </p>
                        <p className={`fc-bubble${mine ? " me" : ""}`}>{m.body}</p>
                      </div>
                    );
                  })}
                </div>

                <form className="fc-toolbar" style={{ marginBottom: 0, marginTop: 16 }} onSubmit={onSend}>
                  <label className="fc-sr-only" htmlFor="fc-reply">
                    Write a message
                  </label>
                  <input
                    id="fc-reply"
                    className="fc-input"
                    style={{ maxWidth: "none", flex: 1 }}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                  />
                  <button type="submit" className="fc-btn fc-btn-primary" disabled={send.pending || !draft.trim()}>
                    <Icon name="arrowRight" size={15} /> {send.pending ? "Sending…" : "Send"}
                  </button>
                </form>
                {send.error && (
                  <p style={{ color: "var(--fc-danger-fg)", fontSize: 13, marginTop: 8 }} role="alert">
                    {send.error}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
