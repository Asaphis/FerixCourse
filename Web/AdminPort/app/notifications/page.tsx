"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, Sk } from "@/components/reb-ui";
import type { IconName } from "@/components/icons";
import { shortDateTime, timeAgo } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { AdminNotification } from "@/lib/admin-types";

/*
  Notification log.

  GET /admin/notifications returns joined rows that include user_email, so the
  console can show who received each event. The `type` column is the real
  backend field (see notify() and migrations/002_phase5.sql).

  There is no endpoint to mark an admin-visible notification read or to send one
  by hand: the API only creates notifications as a side effect of real actions
  (enrolling, going live, uploading, announcing). Rather than fake a button that
  cannot work, this page explains where notifications come from.
*/

const TYPE_ICON: Record<string, IconName> = {
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
      <Ph
        title="Notifications"
        sub="Every message the platform has sent to learners. They are created automatically by real events — you cannot send one by hand."
        actions={
          <button type="button" className="reb-btn ghost sm" onClick={() => notifications.reload()}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        }
      />

      <div className="alert" role="status" style={{ marginBottom: 14 }}>
        <Ic name="info" size={17} />
        <span style={{ flex: 1 }}>
          Notifications are generated when members are enrolled, a session goes live, a file is uploaded, or an
          announcement is posted. This feed is read-only by design.
        </span>
      </div>

      {notifications.error ? <Err msg={notifications.error} onRetry={notifications.reload} /> : null}

      <div className="tabs" role="tablist" aria-label="Filter notifications" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? "on" : undefined}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id === "unread" && unread ? <span className="cnt alert">{unread}</span> : null}
          </button>
        ))}
      </div>

      {notifications.loading && all.length === 0 ? (
        <Sk h={64} mb={10} />
      ) : rows.length === 0 ? (
        <div className="reb-card">
          <Emp
            icon="bell"
            title={filter === "all" ? "No notifications yet" : "Nothing matches this filter"}
            note="Notifications appear here as soon as a learner-facing event happens."
          />
        </div>
      ) : (
        <div className="reb-card">
          {rows.map((n) => (
            <article key={n.id} className="qa" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span className="ico" style={{ width: 36, height: 36, flex: "none" }}>
                <Ic name={TYPE_ICON[n.type] ?? "bell"} size={17} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontSize: 13.5 }}>{n.title}</b>
                  <Badge>{n.type}</Badge>
                  {n.is_read ? <Badge tone="">Read</Badge> : <Badge tone="info">Unread</Badge>}
                </div>
                <p className="sub" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
                  {n.body}
                </p>
                <p className="hint" style={{ marginTop: 6 }}>
                  {n.user_email ? (
                    <>
                      to{" "}
                      <Link href={`/users/${n.user_id}`} style={{ color: "var(--brand-text)" }}>
                        {n.user_email}
                      </Link>{" "}
                      ·{" "}
                    </>
                  ) : null}
                  {timeAgo(n.created_at)} · {shortDateTime(n.created_at)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Shell>
  );
}
