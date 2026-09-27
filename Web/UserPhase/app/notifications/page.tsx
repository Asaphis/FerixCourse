"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon, type IconName } from "@/components/ui/icons";
import { Chip, EmptyState, LoadingGrid, timeAgo } from "@/components/ui/primitives";

/*
  Notifications — real rows from GET /notifications/mine.

  The backend exposes no mark-as-read endpoint, so read state is tracked
  locally per notification id and is labelled as such in the UI. Nothing is
  faked: the list, titles, bodies and timestamps are all server data.
*/

const KIND_ICON: Record<string, IconName> = {
  enrollment: "bookOpen",
  welcome: "sparkles",
  payment_failed: "alertCircle",
  payment: "wallet",
  live: "video",
  recording: "monitorPlay",
  message: "messageSquare",
  booking: "calendarCheck",
};

const READ_KEY = "fc_notif_read";

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const { data, loading, failures, reload } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const [read, setRead] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(READ_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const items = data?.notifications ?? [];
  const unreadRows = useMemo(() => items.filter((n) => !read.includes(n.id)), [items, read]);
  const visible = filter === "unread" ? unreadRows : items;

  function persist(next: string[]) {
    setRead(next);
    try {
      window.localStorage.setItem(READ_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked — session-only read state */
    }
  }

  return (
    <>
      <PageHead
        title="Notifications"
        sub="Payments, classes, recordings and messages — all in one place."
        actions={
          unreadRows.length > 0 ? (
            <button
              type="button"
              className="fc-btn fc-btn-ghost"
              onClick={() => persist(Array.from(new Set([...read, ...items.map((n) => n.id)])))}
            >
              <Icon name="check" size={15} /> Mark all read
            </button>
          ) : undefined
        }
      />

      {failures.length > 0 && (
        <div className="fc-alert fc-alert-danger" role="alert">
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>Could not load notifications.</span>
          <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={reload}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <LoadingGrid height={76} count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="All quiet for now"
          body="Class reminders, new recordings and payment confirmations will land here."
          action={
            <Link href="/learn" className="fc-btn fc-btn-ghost fc-btn-sm">
              Browse the catalog
            </Link>
          }
        />
      ) : (
        <>
          <div className="fc-filter-bar">
            <Chip pressed={filter === "all"} onClick={() => setFilter("all")}>
              All ({items.length})
            </Chip>
            <Chip pressed={filter === "unread"} onClick={() => setFilter("unread")}>
              Unread ({unreadRows.length})
            </Chip>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon="checkCircle" title="Nothing unread" body="You are all caught up." />
          ) : (
            <div className="fc-card" style={{ padding: "4px 20px" }}>
              {visible.map((n) => {
                const isUnread = !read.includes(n.id);
                return (
                  <article key={n.id} className={`fc-notif${isUnread ? " is-unread" : ""}`}>
                    <span
                      className="fc-notif-ico"
                      style={
                        n.kind === "payment_failed"
                          ? { background: "var(--fc-danger-bg)", color: "var(--fc-danger-fg)" }
                          : { background: "var(--fc-brand-soft)", color: "var(--fc-brand)" }
                      }
                    >
                      <Icon name={KIND_ICON[n.kind] ?? "bell"} size={17} />
                    </span>
                    <div className="fc-notif-body">
                      <h2 className="fc-notif-title">{n.title}</h2>
                      {n.body ? <p className="fc-notif-text">{n.body}</p> : null}
                      <p className="fc-notif-time">
                        {timeAgo(n.created_at)} · {new Date(n.created_at).toLocaleString()}
                        {isUnread ? " · unread" : ""}
                      </p>
                    </div>
                    {isUnread && (
                      <button
                        type="button"
                        className="fc-btn fc-btn-quiet fc-btn-sm"
                        onClick={() => persist(Array.from(new Set([...read, n.id])))}
                        aria-label={`Mark "${n.title}" as read`}
                      >
                        <Icon name="check" size={15} /> Mark read
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          <p className="fc-hint" style={{ marginTop: 14 }}>
            Read state is stored on this device. Unread alerts also show as a badge in the sidebar.
          </p>
        </>
      )}
    </>
  );
}
