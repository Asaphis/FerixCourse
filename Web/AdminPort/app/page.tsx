"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, SkList, ToastHost } from "@/components/reb-ui";
import { adminFetch, getConversations, getLiveOverview, money, timeAgo } from "@/lib/admin";
import type { ConversationRow, Stats } from "@/lib/admin-types";

/* GET /admin/live/overview row (the enrichments members/attended/classroom_*). */
type LiveSession = {
  id: string;
  title: string;
  starts_at: string | null;
  status: "scheduled" | "live" | "ended";
  classroom_id: string | null;
  classroom_title: string | null;
  members: number;
  attended: number;
};

/*
  Overview — the console landing page. Everything is a real aggregate:
  /admin/stats, /admin/live/overview and the conversation list. No invented
  growth percentages or "active now" numbers.
*/

type RequestRow = { id: string; topic: string; status: string; user_email: string | null; created_at: string };

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState<{ sessions: LiveSession[] } | null>(null);
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [s, l, c, r] = await Promise.all([
        adminFetch<Stats>("/admin/stats"),
        getLiveOverview(),
        getConversations(),
        adminFetch<RequestRow[]>("/admin/requests?status=pending"),
      ]);
      setStats(s);
      setLive(l);
      setConvs(c);
      setRequests(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load the overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = convs.reduce((n, c) => n + (Number(c.unread) || 0), 0);
  const liveNow = (live?.sessions ?? []).filter((s) => s.status === "live");

  return (
    <Shell>
      <Ph
        title="Overview"
        sub="The state of the platform right now — real counts, nothing estimated."
        actions={
          <button type="button" className="reb-btn ghost sm" onClick={() => void load()}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        }
      />

      {error ? <Err msg={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <SkList rows={4} />
      ) : (
        <>
          <div className="statline" style={{ marginBottom: 18 }}>
            <Link href="/users" className="tile" style={{ color: "inherit" }}>
              <h3><Ic name="users" size={14} /> Learners</h3>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{stats?.students ?? 0}</div>
              <p className="hint">{stats?.enrollments ?? 0} enrollments</p>
            </Link>
            <Link href="/transactions" className="tile" style={{ color: "inherit" }}>
              <h3><Ic name="dollar" size={14} /> Revenue</h3>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{money(stats?.revenueKobo ?? 0)}</div>
              <p className="hint">{stats?.successfulPayments ?? 0} successful payments</p>
            </Link>
            <Link href="/live" className="tile" style={{ color: "inherit" }}>
              <h3><Ic name="radio" size={14} /> Live now</h3>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{liveNow.length}</div>
              <p className="hint">{stats?.liveSessions ?? 0} sessions marked live</p>
            </Link>
            <Link href="/messages" className="tile" style={{ color: "inherit" }}>
              <h3><Ic name="inbox" size={14} /> Unread</h3>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{unread}</div>
              <p className="hint">{convs.length} conversations</p>
            </Link>
          </div>

          <div className="grid2" style={{ marginBottom: 18 }}>
            <section className="reb-card">
              <SecHead
                icon="radio"
                title="Live control"
                right={
                  <Link href="/live" className="reb-btn ghost sm">
                    Open <Ic name="chevronRight" size={13} />
                  </Link>
                }
              />
              {liveNow.length === 0 ? (
                <Emp icon="radio" title="Nothing live" note="Start a session from the control room when your cohort is ready." />
              ) : (
                <div>
                  {liveNow.map((s) => (
                    <div key={s.id} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="dot-status live" aria-hidden="true" />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13.5 }}>{s.title}</b>
                        <span className="hint" style={{ display: "block" }}>
                          {s.classroom_title ?? "Classroom"} · {s.attended}/{s.members} attended
                        </span>
                      </span>
                      <Badge tone="danger">Live</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="reb-card">
              <SecHead
                icon="inbox"
                title="Latest messages"
                right={
                  <Link href="/messages" className="reb-btn ghost sm">
                    Inbox <Ic name="chevronRight" size={13} />
                  </Link>
                }
              />
              {convs.length === 0 ? (
                <Emp icon="inbox" title="No conversations" note="Threads started by learners land in the inbox." />
              ) : (
                <div>
                  {convs.slice(0, 5).map((c) => (
                    <div key={c.id} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13.5 }}>{c.student_name || c.student_email || "Learner"}</b>
                        <span className="cprev">{c.last_body || "No messages yet"}</span>
                      </span>
                      {Number(c.unread) > 0 ? <Badge tone="brand">{c.unread}</Badge> : null}
                      <span className="hint">{timeAgo(c.last_at || c.updated_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid2">
            <section className="reb-card">
              <SecHead
                icon="sparkles"
                title={`Pending requests · ${requests.length}`}
                right={
                  <Link href="/requests" className="reb-btn ghost sm">
                    Queue <Ic name="chevronRight" size={13} />
                  </Link>
                }
              />
              {requests.length === 0 ? (
                <Emp icon="sparkles" title="Queue is empty" note="Training requests from learners arrive here for triage." />
              ) : (
                <div>
                  {requests.slice(0, 5).map((r) => (
                    <div key={r.id} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13.5 }}>{r.topic}</b>
                        <span className="hint" style={{ display: "block" }}>{r.user_email ?? "learner"}</span>
                      </span>
                      <Badge tone="warn">{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="reb-card">
              <SecHead icon="layers" title="Quick actions" />
              <div className="qgrid">
                <Link href="/products" className="qa" style={{ color: "inherit" }}>
                  <b style={{ fontSize: 13.5 }}>New product</b>
                  <span className="hint" style={{ display: "block" }}>Course or live cohort</span>
                </Link>
                <Link href="/live" className="qa" style={{ color: "inherit" }}>
                  <b style={{ fontSize: 13.5 }}>Go live</b>
                  <span className="hint" style={{ display: "block" }}>Start a session</span>
                </Link>
                <Link href="/broadcast" className="qa" style={{ color: "inherit" }}>
                  <b style={{ fontSize: 13.5 }}>Broadcast</b>
                  <span className="hint" style={{ display: "block" }}>Message everyone</span>
                </Link>
                <Link href="/reports" className="qa" style={{ color: "inherit" }}>
                  <b style={{ fontSize: 13.5 }}>Reports</b>
                  <span className="hint" style={{ display: "block" }}>Revenue and growth</span>
                </Link>
              </div>
            </section>
          </div>
        </>
      )}
      <ToastHost />
    </Shell>
  );
}
