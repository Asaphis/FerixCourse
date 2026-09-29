"use client";
import Link from "next/link";
import { useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { timeAgo } from "@/components/ui/primitives";
import { api, type Notification } from "@/lib/dashboard-api";

/*
  Notifications — real rows from GET /notifications/mine (loaded by the shell),
  marked read one at a time (PATCH /notifications/:id) or all at once
  (POST /notifications/read-all).
*/

const TONE: Record<string, string> = {
  live: "var(--danger, #f87171)",
  announcement: "var(--brand-text)",
  material: "#7dd3fc",
  enrollment: "#34d399",
  feedback: "var(--war, #fbbf24)",
  request_update: "#a78bfa",
  broadcast: "var(--brand-text)",
};

function typeLabel(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NotificationsPage() {
  const { data, loading, setNotifications } = useDashboard();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const items: Notification[] = data?.notifications ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  async function markRead(n: Notification) {
    setBusy(n.id);
    setError("");
    try {
      const updated = await api.patchNotification(n.id, true);
      setNotifications(items.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update that notification.");
    } finally {
      setBusy("");
    }
  }

  async function markAll() {
    setBusy("all");
    setError("");
    try {
      await api.markAllNotificationsRead();
      setNotifications(items.map((n) => ({ ...n, is_read: true })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not mark everything as read.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHead
        title="Notifications"
        sub={unread ? `${unread} unread` : "You are all caught up."}
        actions={
          unread > 0 ? (
            <button type="button" className="btn ghost sm" onClick={() => void markAll()} disabled={busy === "all"}>
              <Icon name="check" size={14} /> {busy === "all" ? "Marking…" : "Mark all read"}
            </button>
          ) : null
        }
      />

      {error && (
        <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="qa" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="qa"><div className="skel" style={{ height: 44 }} /></div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card empty">
          <div className="ico"><Icon name="bell" size={24} /></div>
          <h3>Nothing yet</h3>
          <p>Enrolments, live sessions, materials and instructor replies will show up here.</p>
          <Link href="/catalog" className="btn pri sm">Browse the catalog</Link>
        </div>
      ) : (
        <div className="qa" style={{ marginBottom: 0 }}>
          {items.map((n) => (
            <article key={n.id} className="qa" style={{ borderLeft: `3px solid ${TONE[n.type] ?? "var(--border2)"}` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: n.is_read ? 600 : 800, marginBottom: 2 }}>{n.title}</p>
                  {n.body && <p className="sub" style={{ marginTop: 0 }}>{n.body}</p>}
                  <p className="hint">
                    <span className="badge" style={{ marginRight: 8 }}>{typeLabel(n.type)}</span>
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                {!n.is_read && (
                  <button type="button" className="btn ghost sm" onClick={() => void markRead(n)} disabled={busy === n.id}>
                    <Icon name="check" size={13} /> Mark read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
