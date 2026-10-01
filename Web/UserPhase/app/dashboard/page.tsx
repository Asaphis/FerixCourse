"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { initials, timeAgo } from "@/components/ui/primitives";
import { api, type DashboardSummary } from "@/lib/dashboard-api";

/*
  Board — the learner's home, ported from demo/rebuild-learner.html (#/board).

  One request (GET /api/dashboard/summary) drives the whole screen: greeting,
  statline, "continue learning", "up next" and the recent feed. Every number is
  real; a learner with nothing yet sees honest empty states, not placeholders.
  A session going live/ended arrives over SSE, so the board re-reads the
  summary instead of polling.
*/

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data, liveSession } = useDashboard();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setSummary(await api.dashboardSummary());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load your board.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* A live session starting or ending changes "live now" and "up next". */
  useEffect(() => {
    if (liveSession) void load();
  }, [liveSession, load]);

  const name = data?.profile?.full_name || data?.profile?.email?.split("@")[0] || "there";
  const first = name.split(" ")[0] || "there";
  const stats = summary?.stats;
  const cont = summary?.continue_learning;
  const upNext = summary?.up_next ?? [];
  const recent = summary?.recent ?? [];

  return (
    <>
      <PageHead
        title={`${greeting(new Date().getHours())}, ${first}`}
        sub={summary?.date_label ?? undefined}
        actions={
          stats && stats.live_now > 0 ? (
            <Link href="/classes" className="live-pill">
              <span className="dot" style={{ background: "currentColor" }} />
              {stats.live_now} live now
            </Link>
          ) : null
        }
      />

      {error && (
        <div className="alert danger" role="alert" style={{ marginBottom: 18 }}>
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" className="btn ghost sm" onClick={() => void load()}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="statline" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tile">
              <div className="skel" style={{ height: 12, width: "55%", marginBottom: 12 }} />
              <div className="skel" style={{ height: 28, width: "35%" }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="statline" style={{ marginBottom: 18 }}>
          <Link href="/classes" className="tile" style={{ color: "inherit" }}>
            <h3>
              <Icon name="radio" size={14} /> Live now
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{stats?.live_now ?? 0}</div>
            <p className="hint">{stats?.classes_total ?? 0} classrooms joined</p>
          </Link>
          <Link href="/messages" className="tile" style={{ color: "inherit" }}>
            <h3>
              <Icon name="inbox" size={14} /> Awaiting reply
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{stats?.awaiting_reply ?? 0}</div>
            <p className="hint">Threads where you spoke last</p>
          </Link>
          <Link href="/messages" className="tile" style={{ color: "inherit" }}>
            <h3>
              <Icon name="messageSquare" size={14} /> Unread
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{stats?.unread ?? 0}</div>
            <p className="hint">Messages from your instructors</p>
          </Link>
          <Link href="/my-courses" className="tile" style={{ color: "inherit" }}>
            <h3>
              <Icon name="bookOpen" size={14} /> Courses
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{stats?.courses_total ?? 0}</div>
            <p className="hint">Enrolled and learning</p>
          </Link>
        </div>
      )}

      <div className="bento" style={{ marginBottom: 18 }}>
        {/* Continue learning */}
        <section className="tile" style={{ gridColumn: "span 7" }} aria-label="Continue learning">
          <h3>
            <Icon name="play" size={14} /> Continue learning
          </h3>
          {loading ? (
            <div className="skel" style={{ height: 92 }} />
          ) : cont ? (
            <>
              <p className="eyebrow-sm">{cont.lessons_done} of {cont.lessons_total} lessons</p>
              <h2 style={{ fontSize: 21, margin: "6px 0 4px" }}>{cont.course_title}</h2>
              <p className="sub">Next: {cont.lesson_title}</p>
              <div
                className="prog"
                role="progressbar"
                aria-valuenow={cont.progress_pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${cont.progress_pct}% complete`}
              >
                <i style={{ width: `${Math.max(2, cont.progress_pct)}%` }} />
              </div>
              <p className="hint">{cont.progress_pct}% complete</p>
              <Link href={`/courses/${cont.course_slug}`} className="btn pri sm" style={{ marginTop: 12 }}>
                <Icon name="play" size={14} /> Open course
              </Link>
            </>
          ) : (
            <div className="empty" style={{ padding: "18px 8px" }}>
              <div className="ico">
                <Icon name="bookOpen" size={24} />
              </div>
              <h3>Nothing in progress yet</h3>
              <p>Pick a course from the catalog and your progress will show up here.</p>
              <Link href="/catalog" className="btn pri sm">
                Browse catalog
              </Link>
            </div>
          )}
        </section>

        {/* Up next */}
        <section className="tile" style={{ gridColumn: "span 5" }} aria-label="Upcoming sessions">
          <h3>
            <Icon name="clock" size={14} /> Up next
          </h3>
          {loading ? (
            <div className="skel" style={{ height: 92 }} />
          ) : upNext.length === 0 ? (
            <div className="empty" style={{ padding: "18px 8px" }}>
              <div className="ico">
                <Icon name="calendar" size={24} />
              </div>
              <h3>No sessions scheduled</h3>
              <p>When an instructor schedules a live class, it appears here.</p>
            </div>
          ) : (
            <div className="qa" style={{ marginBottom: 0 }}>
              {upNext.map((s) => (
                <Link
                  key={s.session_id}
                  href={`/classrooms/${s.classroom_slug}`}
                  className="qrow"
                  style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", color: "inherit" }}
                >
                  <span className={`dot-status${s.live ? " live" : ""}`} aria-hidden="true" />
                  <span className="ttl" style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{s.title}</b>
                    <span className="hint" style={{ display: "block" }}>
                      {s.classroom_title} · {s.live ? "live now" : new Date(s.starts_at ?? "").toLocaleString()}
                    </span>
                  </span>
                  {s.live && <span className="live-pill">Live</span>}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent activity */}
      <section className="card" aria-label="Recent activity">
        <div className="sec-head" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontFamily: "var(--font-d)" }}>Recent activity</h2>
          <div className="sp" style={{ flex: 1 }} />
          <Link href="/notifications" className="btn ghost sm">
            All notifications
          </Link>
        </div>

        {loading ? (
          <div className="skel" style={{ height: 64 }} />
        ) : recent.length === 0 ? (
          <div className="empty" style={{ padding: "24px 8px" }}>
            <div className="ico">
              <Icon name="bell" size={24} />
            </div>
            <h3>No activity yet</h3>
            <p>Enrollments, live sessions and instructor replies will show up here.</p>
          </div>
        ) : (
          <div className="qa" style={{ marginBottom: 0 }}>
            {recent.map((n) => (
              <Link key={n.id} href={n.link} className="qrow" style={{ display: "flex", gap: 10, alignItems: "center", color: "inherit" }}>
                <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                  {initials(n.title)}
                </span>
                <span className="ttl" style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13.5 }}>{n.title}</b>
                  <span className="hint" style={{ display: "block" }}>
                    {n.body ? `${n.body.slice(0, 90)}${n.body.length > 90 ? "…" : ""}` : timeAgo(n.created_at)}
                  </span>
                </span>
                <span className="hint">{timeAgo(n.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
