"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { EmptyState, LoadingGrid, initials, shortDateTime } from "@/components/ui/primitives";

/*
  My Classrooms — real enrollments, split into live / upcoming / past using the
  real starts_at values from /api/enrollments/mine.
*/

export default function MyClassroomsPage() {
  const { data, loading, failures, reload } = useDashboard();
  const rooms = data?.classrooms ?? [];

  const { live, upcoming, past } = useMemo(() => {
    const now = Date.now();
    const live: typeof rooms = [];
    const upcoming: typeof rooms = [];
    const past: typeof rooms = [];
    for (const r of rooms) {
      if (!r.starts_at) {
        upcoming.push(r);
        continue;
      }
      const t = new Date(r.starts_at).getTime();
      if (t <= now + 3 * 60 * 60 * 1000 && t >= now - 2 * 60 * 60 * 1000) live.push(r);
      else if (t > now) upcoming.push(r);
      else past.push(r);
    }
    const byStart = (a: (typeof rooms)[number], b: (typeof rooms)[number]) =>
      new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime();
    return { live, upcoming: upcoming.sort(byStart), past: past.sort((a, b) => byStart(b, a)) };
  }, [rooms]);

  function RoomCard({ r, tone }: { r: (typeof rooms)[number]; tone?: "live" | "past" }) {
    return (
      <article className="fc-course-card">
        <div className="fc-course-cover">
          <span className="fc-course-badge">
            {tone === "live" ? (
              <span className="fc-live-pill">
                <span className="fc-dot" /> LIVE
              </span>
            ) : (
              <span className={`fc-badge ${tone === "past" ? "fc-badge-neutral" : "fc-badge-info"}`}>
                {tone === "past" ? "Completed" : "Enrolled cohort"}
              </span>
            )}
          </span>
          <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: 22 }}>{initials(r.title)}</span>
        </div>
        <div className="fc-course-body">
          <h3 className="fc-course-title">{r.title}</h3>
          <p className="fc-course-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="calendar" size={13} /> {r.schedule_text || "Schedule to be confirmed"}
          </p>
          <p className="fc-course-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="clock" size={13} />
            {r.starts_at ? `Starts ${shortDateTime(r.starts_at)}` : "No start date set"}
          </p>
          <div className="fc-course-foot">
            <Link href={`/classrooms/${r.slug}`} className="fc-btn fc-btn-primary fc-btn-sm">
              <Icon name="arrowRight" size={14} /> Open workspace
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <PageHead
        title="My Classrooms"
        sub="Group cohorts you are enrolled in. Each has its own timetable, materials and recordings."
        actions={
          <Link href="/learn" className="fc-btn fc-btn-ghost">
            <Icon name="compass" size={16} /> Find a cohort
          </Link>
        }
      />

      {failures.length > 0 && (
        <div className="fc-alert fc-alert-danger" role="alert">
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>Could not load your classrooms. {failures.join(", ")}.</span>
          <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={reload}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <LoadingGrid height={168} count={3} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon="monitorPlay"
          title="No classrooms yet"
          body="Join a live cohort and your timetable, materials and recordings appear here."
          action={
            <Link href="/learn" className="fc-btn fc-btn-primary fc-btn-sm">
              Browse live classes <Icon name="arrowRight" size={14} />
            </Link>
          }
        />
      ) : (
        <div className="fc-stack">
          {live.length > 0 && (
            <section aria-labelledby="cl-live">
              <div className="fc-sec-head">
                <h2 className="fc-sec-title" id="cl-live">
                  Live now
                </h2>
                <span className="fc-badge fc-badge-danger">{live.length}</span>
              </div>
              <div className="fc-cards-grid">
                {live.map((r) => (
                  <RoomCard key={r.id} r={r} tone="live" />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section aria-labelledby="cl-up">
              <div className="fc-sec-head">
                <h2 className="fc-sec-title" id="cl-up">
                  Upcoming
                </h2>
                <span className="fc-badge fc-badge-neutral">{upcoming.length}</span>
              </div>
              <div className="fc-cards-grid">
                {upcoming.map((r) => (
                  <RoomCard key={r.id} r={r} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section aria-labelledby="cl-past">
              <div className="fc-sec-head">
                <h2 className="fc-sec-title" id="cl-past">
                  Past cohorts
                </h2>
                <span className="fc-badge fc-badge-neutral">{past.length}</span>
              </div>
              <div className="fc-cards-grid">
                {past.map((r) => (
                  <RoomCard key={r.id} r={r} tone="past" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
