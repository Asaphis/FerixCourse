"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Badge, EmptyState, ErrorNote, PageHead, SectionHead, Skeleton } from "@/components/ui";
import { shortDateTime, timeAgo } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { AdminNotification } from "@/lib/admin-types";

/*
  Notification log.

  GET /admin/notifications returns joined rows that include user_email, so the
  console can show who received each event. The `type` column is the real backend
  field (see notify() and migrations/002_phase5.sql) — this page used to be the
  only place that read it, which is how the naming drift started.

  There is no endpoint to mark an admin-visible notification read or to send one
  by hand: the API only creates notifications as a side effect of real actions
  (enrolling, going live, uploading, announcing). Rather than fake a button that
  cannot work, this page explains where notifications come from and links to
  those actions.
*/

const TYPE_ICON: Record<string, string> = {
  enrollment: "graduationCap",
  welcome: "sparkles",
  payment_failed: "alertCircle",
  live: "radio",
  recorded: "disc",
  material: "folder",
  announcement: "megaphone",
  feedback: "messageSquare",
  request_converted: "clipboard",
  request_update: "clipboard",
  reminder: "clock",
  booking_update: "calendarCheck",
  booking_price: "calendarCheck",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "live", label: "Live" },
  { id: "enrollment", label: "Enrollments" },
  { id: "material", label: "Files" },
] as const;

export default function NotificationsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const notifications = useAdmin<AdminNotification[]>("/admin/notifications");

  const all = notifications.data ?? [];
  const rows = all.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.is_read;
    return n.type === filter;
  });

  const unread = all.filter((n) => !n.is_read).length;

  return (
    <Shell>
      <PageHead
        title="Notifications"
        sub="Every message the platform has sent to learners. They are created automatically by real events — you cannot send one by hand."
        actions={
          <button type="button" className="ad-btn ad-btn-ghost" onClick={() => notifications.reload()}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        }
      />

      <div className="ad-alert ad-alert-info" role="status">
        <Icon name="info" size={17} />
        <span>
          Notifications are generated when members are enrolled, a session goes live, a file is uploaded, or an
          announcement is posted. There is no API to create or mark-read an admin notification, so this page is
          read-only by design.
        </span>
      </div>

      {notifications.error ? <ErrorNote message={notifications.error} onRetry={notifications.reload} /> : null}

      <div className="ad-tabs" role="tablist" aria-label="Filter notifications">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            tabIndex={filter === f.id ? 0 : -1}
            className="ad-tab"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id === "unread" && unread ? <span className="ad-nav-count is-alert">{unread}</span> : null}
          </button>
        ))}
      </div>

      {notifications.loading && all.length === 0 ? (
        <Skeleton height={64} count={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="bell"
          title={filter === "all" ? "No notifications yet" : "Nothing matches this filter"}
          body="Notifications appear here as soon as a learner-facing event happens."
        />
      ) : (
        <>
          <SectionHead title="Delivered" count={rows.length} />
          <div className="ad-stack">
            {rows.map((n) => (
              <div className="ad-card" key={n.id} style={{ padding: 15 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className="ad-stat-icon" style={{ width: 36, height: 36 }}>
                    <Icon name={TYPE_ICON[n.type] ?? "bell"} size={17} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <p className="ad-row-title">{n.title}</p>
                      <Badge>{n.type}</Badge>
                      {n.is_read ? <Badge tone="neutral">Read</Badge> : <Badge tone="info">Unread</Badge>}
                    </div>
                    <p className="ad-sm ad-muted" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
                      {n.body}
                    </p>
                    <p className="ad-row-meta" style={{ marginTop: 6 }}>
                      {n.user_email ? (
                        <>
                          to{" "}
                          <Link href={`/users/${n.user_id}`} className="ad-row-title">
                            {n.user_email}
                          </Link>{" "}
                          ·{" "}
                        </>
                      ) : null}
                      {timeAgo(n.created_at)} · {shortDateTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
