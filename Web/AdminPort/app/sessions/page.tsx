"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Alert, Badge, EmptyState, ErrorNote, PageHead, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { adminFetch, shortDateTime } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { Session } from "@/lib/admin-types";

/*
  Every session, across every classroom.

  Endpoints: GET /admin/sessions (now honours ?classroom_id after the duplicate
  shadowing route was removed), PATCH /admin/sessions/:id, GET /admin/sessions/:id/attendance.

  Starting a session from here notifies only that classroom's members — the
  notification loop lives in the PATCH handler.
*/

export default function SessionsPage() {
  const sessions = useAdmin<Session[]>("/admin/sessions");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const items = sessions.data ?? [];
  const live = items.filter((s) => s.status === "live");
  const scheduled = items.filter((s) => s.status === "scheduled");
  const ended = items.filter((s) => s.status === "ended");

  async function setStatus(id: string, status: "live" | "ended") {
    setErr("");
    setMsg("");
    setBusy(`s-${id}`);
    try {
      await adminFetch(`/admin/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      sessions.reload();
      setMsg(status === "live" ? "Session is live — that classroom's members were notified." : "Session ended and the end time recorded.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update the session.");
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string) {
    setErr("");
    setBusy(`d-${id}`);
    try {
      await adminFetch(`/admin/sessions/${id}`, { method: "DELETE" });
      sessions.reload();
      setMsg("Session deleted.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not delete the session.");
    } finally {
      setBusy("");
    }
  }

  const section = (title: string, rows: Session[], tone: "live" | "default") => (
    <>
      <SectionHead title={title} count={rows.length} />
      {rows.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={`Nothing ${tone === "live" ? "live" : title.toLowerCase()}`}
          body="Create sessions from inside a classroom, or from the live control room."
        />
      ) : (
        <div className="ad-card ad-card-pad-0" style={{ marginBottom: 8 }}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <caption className="ad-sr-only">{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Session</th>
                  <th scope="col">Classroom</th>
                  <th scope="col">Starts</th>
                  <th scope="col">Status</th>
                  <th scope="col">Recording</th>
                  <th scope="col">
                    <span className="ad-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="ad-row-title">{s.title}</td>
                    <td className="ad-muted">
                      <Link className="ad-row-title" href={`/classrooms/${s.classroom_id}`}>
                        {s.classroom_title ?? "Open"}
                      </Link>
                    </td>
                    <td className="ad-muted">{shortDateTime(s.starts_at)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <StatusBadge status={s.recording_status} />
                    </td>
                    <td>
                      <span className="ad-row-actions">
                        {s.status !== "live" ? (
                          <button
                            type="button"
                            className="ad-btn ad-btn-ghost ad-btn-sm"
                            disabled={busy === `s-${s.id}`}
                            onClick={() => setStatus(s.id, "live")}
                          >
                            <Icon name="play" size={13} /> Start live
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ad-btn ad-btn-ghost ad-btn-sm"
                            disabled={busy === `s-${s.id}`}
                            onClick={() => setStatus(s.id, "ended")}
                          >
                            <Icon name="stop" size={13} /> End
                          </button>
                        )}
                        <Link className="ad-btn ad-btn-ghost ad-btn-sm" href="/live">
                          <Icon name="radio" size={13} /> Control room
                        </Link>
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost ad-btn-sm"
                          disabled={busy === `d-${s.id}`}
                          onClick={() => remove(s.id)}
                          aria-label={`Delete ${s.title}`}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  return (
    <Shell>
      <PageHead
        title="Sessions"
        sub="Every scheduled, live and completed training session. Starting one notifies only that classroom's members."
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-ghost" onClick={() => sessions.reload()}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
            <Link className="ad-btn ad-btn-primary" href="/live">
              <Icon name="radio" size={14} /> Live control
            </Link>
          </>
        }
      />

      {err ? <ErrorNote message={err} onRetry={() => setErr("")} /> : null}
      {msg ? (
        <Alert tone="ok" icon="check">
          {msg}
        </Alert>
      ) : null}
      {sessions.error ? <ErrorNote message={sessions.error} onRetry={sessions.reload} /> : null}

      {sessions.loading && items.length === 0 ? (
        <Skeleton height={60} count={4} />
      ) : (
        <>
          {live.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {section("Live right now", live, "live")}
            </div>
          ) : null}
          {section("Scheduled", scheduled, "default")}
          {section("Completed", ended, "default")}
          {items.length === 0 ? (
            <EmptyState icon="calendar" title="No sessions yet" body="Create one from a classroom or the live control room." />
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Badge>{items.length} total</Badge>
          </div>
        </>
      )}
    </Shell>
  );
}
