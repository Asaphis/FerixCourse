"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { api, type CatalogClassroom, type DashboardSummary } from "@/lib/dashboard-api";

/*
  Live training — the reference live room (#/live), reachable while logged out
  because the public navbar links here.

  Signed in: your live sessions first, with a real join button (POST
  /live/token → the LiveKit room at /classrooms/<slug>/live). Signed out: the
  published cohorts, so the page still does its marketing job. No simulated
  viewers, no fake "live" state — a session is live because the database says
  so.
*/

export default function LivePage() {
  const { data, publicMode, liveSession } = useDashboard();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [rooms, setRooms] = useState<CatalogClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const cohorts = await api.classrooms();
      setRooms(cohorts);
      // Signed out: the summary needs a session, and that is fine.
      if (!publicMode) {
        api
          .dashboardSummary()
          .then(setSummary)
          .catch(() => setSummary(null));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load live sessions.");
    } finally {
      setLoading(false);
    }
  }, [publicMode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (liveSession && !publicMode) void load();
  }, [liveSession, load]);

  const sessions = summary?.up_next ?? [];
  const live = sessions.filter((s) => s.live);
  const soon = sessions.filter((s) => !s.live);

  async function join(classroomSlug: string, key: string) {
    setJoining(key);
    setError("");
    try {
      // Real token check first: this is also the access gate for the room.
      const room = data?.classrooms.find((c) => c.slug === classroomSlug);
      if (room) {
        await api.liveToken({ classroom_id: room.id });
        window.location.href = `/classrooms/${classroomSlug}/live`;
        return;
      }
      // Coarse path: the public classroom page knows whether you are enrolled.
      window.location.href = `/classrooms/${classroomSlug}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not join that session.");
    } finally {
      setJoining("");
    }
  }

  return (
    <>
      <PageHead
        title="Live training"
        sub="Instructor-led cohorts. When a session is live you can join the room and watch the shared screen."
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

      {/* Live right now */}
      {!publicMode && (
        <section className="sec" aria-label="Live now">
          <h2 className="eyebrow-sm" style={{ marginBottom: 10 }}>Live now · {live.length}</h2>
          {loading ? (
            <div className="skel" style={{ height: 96 }} />
          ) : live.length === 0 ? (
            <div className="card empty">
              <div className="ico"><Icon name="radio" size={24} /></div>
              <h3>Nothing live at this moment</h3>
              <p>You get a notification the moment an instructor goes live in a classroom you are enrolled in.</p>
            </div>
          ) : (
            <div className="card-grid">
              {live.map((s) => (
                <article key={s.session_id} className="tile">
                  <h3><span className="live-pill" style={{ padding: "2px 8px" }}>Live</span></h3>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</p>
                  <p className="sub">{s.classroom_title}</p>
                  <button
                    type="button"
                    className="btn pri sm"
                    style={{ marginTop: 12 }}
                    onClick={() => void join(s.classroom_slug, s.session_id)}
                    disabled={joining === s.session_id}
                  >
                    <Icon name="video" size={14} /> {joining === s.session_id ? "Opening…" : "Join the room"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Your upcoming sessions */}
      {!publicMode && (
        <section className="sec" aria-label="Upcoming sessions">
          <h2 className="eyebrow-sm" style={{ marginBottom: 10 }}>Your schedule · {soon.length}</h2>
          {loading ? (
            <div className="skel" style={{ height: 72 }} />
          ) : soon.length === 0 ? (
            <div className="card">
              <p className="sub" style={{ margin: 0 }}>
                No upcoming sessions in your classrooms yet.{" "}
                <Link href="/catalog" style={{ color: "var(--brand-text)" }}>Browse cohorts</Link> to join one.
              </p>
            </div>
          ) : (
            <div className="qa">
              {soon.map((s) => (
                <Link key={s.session_id} href={`/classrooms/${s.classroom_slug}`} className="filecard" style={{ color: "inherit" }}>
                  <Icon name="clock" size={16} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{s.title}</b>
                    <span className="hint" style={{ display: "block" }}>
                      {s.classroom_title} · {s.starts_at ? new Date(s.starts_at).toLocaleString() : "TBD"}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={15} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Open cohorts (public) */}
      <section className="sec" aria-label="Open cohorts">
        <h2 className="eyebrow-sm" style={{ marginBottom: 10 }}>Open cohorts · {rooms.length}</h2>
        {loading ? (
          <div className="card-grid" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="tile"><div className="skel" style={{ height: 64 }} /></div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="card empty">
            <div className="ico"><Icon name="monitorPlay" size={24} /></div>
            <h3>No cohorts published</h3>
            <p>Live cohorts appear here as soon as an instructor publishes them.</p>
            <Link href="/catalog" className="btn pri sm">Browse the catalog</Link>
          </div>
        ) : (
          <div className="card-grid">
            {rooms.map((r) => (
              <article key={r.id} className="tile">
                <h3><Icon name="monitorPlay" size={14} /> {r.level}</h3>
                <p style={{ fontSize: 16, fontWeight: 700 }}>{r.title}</p>
                <p className="sub">{r.schedule_text || (r.starts_at ? `Starts ${new Date(r.starts_at).toLocaleDateString()}` : "Schedule TBD")}</p>
                <p className="hint">{r.enrolled}/{r.capacity ?? 0} seats</p>
                <Link href={`/classrooms/${r.slug}`} className="btn ghost sm" style={{ marginTop: 12 }}>
                  View cohort <Icon name="chevronRight" size={14} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
