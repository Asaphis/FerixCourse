"use client";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { shortDate } from "@/components/ui/primitives";

/*
  My Classrooms — real enrollments plus the live state the board reports. A
  "Live now" pill only appears when the backend says a session is live.
*/

export default function ClassesPage() {
  const { data, loading, liveSession } = useDashboard();
  const rooms = data?.classrooms ?? [];

  return (
    <>
      <PageHead
        title="My Classrooms"
        sub="Your live cohorts. Each room holds the timetable, materials and the class discussion."
        actions={
          <Link href="/live" className="btn ghost sm">
            <Icon name="radio" size={14} /> Live training
          </Link>
        }
      />

      {loading ? (
        <div className="card-grid" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="tile"><div className="skel" style={{ height: 78 }} /></div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="card empty">
          <div className="ico"><Icon name="monitorPlay" size={24} /></div>
          <h3>You are not in a cohort yet</h3>
          <p>Join a live cohort to get a room, a timetable and a place in the discussion.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/catalog" className="btn pri sm">Browse cohorts</Link>
            <Link href="/request" className="btn ghost sm">Request a class</Link>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {rooms.map((r) => {
            const isLive = liveSession?.classroom_id === r.id;
            return (
              <article key={r.id} className="tile">
                <h3>
                  {isLive ? <span className="live-pill" style={{ padding: "2px 8px" }}>Live</span> : <Icon name="monitorPlay" size={14} />}
                  {r.starts_at ? `Starts ${shortDate(r.starts_at)}` : "Live cohort"}
                </h3>
                <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{r.title}</p>
                <p className="sub">{r.schedule_text || "Schedule published by your instructor"}</p>
                <p className="hint">Enrolled {shortDate(r.enrolled_at)}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Link href={`/classrooms/${r.slug}`} className="btn pri sm">
                    Open classroom
                  </Link>
                  <Link href={`/classrooms/${r.slug}/live`} className="btn ghost sm">
                    <Icon name="video" size={14} /> Room
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
