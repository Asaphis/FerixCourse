"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, Sk, ToastHost, toast } from "@/components/reb-ui";
import { adminFetch, shortDateTime } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { Session } from "@/lib/admin-types";

/*
  Every session, across every classroom.

  Endpoints: GET /admin/sessions (honours ?classroom_id), PATCH /admin/sessions/:id,
  DELETE /admin/sessions/:id, GET /admin/sessions/:id/attendance.

  Starting a session from here notifies only that classroom's members — the
  notification loop lives in the PATCH handler.
*/

function tone(status: string): "" | "ok" | "warn" | "danger" | "info" {
  if (status === "live" || status === "recording") return "danger";
  if (status === "scheduled" || status === "processing") return "info";
  if (status === "ready") return "ok";
  if (status === "failed") return "warn";
  return "";
}

export default function SessionsPage() {
  const sessions = useAdmin<Session[]>("/admin/sessions");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const items = sessions.data ?? [];
  const live = items.filter((s) => s.status === "live");
  const scheduled = items.filter((s) => s.status === "scheduled");
  const ended = items.filter((s) => s.status === "ended");

  async function setStatus(id: string, status: "live" | "ended") {
    setErr("");
    setBusy(`s-${id}`);
    try {
      await adminFetch(`/admin/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      sessions.reload();
      toast(status === "live" ? "Session is live — members notified" : "Session ended");
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
      toast("Session deleted");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not delete the session.");
    } finally {
      setBusy("");
    }
  }

  const section = (title: string, rows: Session[]) => (
    <section key={title} className="reb-card" style={{ marginBottom: 16 }}>
      <SecHead
        icon="calendar"
        title={`${title} · ${rows.length}`}
        right={
          title === "Live right now" ? (
            <Link href="/live" className="reb-btn ghost sm">
              <Ic name="radio" size={13} /> Control room
            </Link>
          ) : null
        }
      />
      {rows.length === 0 ? (
        <Emp
          icon="calendar"
          title={`Nothing here`}
          note="Create sessions from inside a classroom, or from the live control room."
        />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <caption style={{ display: "none" }}>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Classroom</th>
                <th scope="col">Starts</th>
                <th scope="col">Status</th>
                <th scope="col">Recording</th>
                <th scope="col">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.title}</b>
                  </td>
                  <td className="hint">
                    <Link href={`/classrooms/${s.classroom_id}`} style={{ color: "var(--brand-text)" }}>
                      {s.classroom_title ?? "Open"}
                    </Link>
                  </td>
                  <td className="hint">{shortDateTime(s.starts_at)}</td>
                  <td>
                    <Badge tone={tone(s.status)}>{s.status}</Badge>
                  </td>
                  <td>
                    <Badge tone={tone(s.recording_status)}>{s.recording_status}</Badge>
                  </td>
                  <td>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.status !== "live" ? (
                        <button
                          type="button"
                          className="reb-btn ghost sm"
                          disabled={busy === `s-${s.id}`}
                          onClick={() => setStatus(s.id, "live")}
                        >
                          <Ic name="play" size={13} /> Start live
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="reb-btn ghost sm"
                          disabled={busy === `s-${s.id}`}
                          onClick={() => setStatus(s.id, "ended")}
                        >
                          <Ic name="stop" size={13} /> End
                        </button>
                      )}
                      <Link className="reb-btn ghost sm" href="/live">
                        <Ic name="radio" size={13} /> Open
                      </Link>
                      <button
                        type="button"
                        className="reb-btn ghost sm"
                        disabled={busy === `d-${s.id}`}
                        onClick={() => remove(s.id)}
                        aria-label={`Delete ${s.title}`}
                      >
                        <Ic name="trash" size={13} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <Shell>
      <Ph
        title="Sessions"
        sub="Every scheduled, live and completed training session. Starting one notifies only that classroom's members."
        actions={
          <>
            <button type="button" className="reb-btn ghost sm" onClick={() => sessions.reload()}>
              <Ic name="refresh" size={14} /> Refresh
            </button>
            <Link className="reb-btn pri sm" href="/live">
              <Ic name="radio" size={14} /> Live control
            </Link>
          </>
        }
      />

      {err ? <Err msg={err} onRetry={() => setErr("")} /> : null}
      {sessions.error ? <Err msg={sessions.error} onRetry={sessions.reload} /> : null}

      {sessions.loading && items.length === 0 ? (
        <Sk h={64} mb={10} />
      ) : items.length === 0 && !sessions.error ? (
        <div className="reb-card">
          <Emp icon="calendar" title="No sessions yet" note="Create one from a classroom or the live control room." />
        </div>
      ) : (
        <>
          {live.length > 0 ? section("Live right now", live) : null}
          {section("Scheduled", scheduled)}
          {section("Completed", ended)}
          <div style={{ display: "flex", gap: 8 }}>
            <Badge>{items.length} total</Badge>
          </div>
        </>
      )}
      <ToastHost />
    </Shell>
  );
}
