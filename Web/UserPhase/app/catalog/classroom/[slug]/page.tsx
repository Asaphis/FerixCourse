"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import EnrollButton from "@/components/enroll";
import { api, money, type CatalogClassroom, type ClassroomSession } from "@/lib/dashboard-api";

/*
  Classroom detail inside the dashboard - same data as the public page, on the
  rebuild design, so the catalog no longer throws the learner out of the app.
*/

type Detail = CatalogClassroom & { sessions: ClassroomSession[]; material_count: number };

const STATUS_TONE: Record<string, "ok" | "info" | "warn"> = {
  live: "warn",
  scheduled: "info",
  ended: "ok",
};

function when(iso: string | null): string {
  if (!iso) return "Date to be confirmed";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date to be confirmed";
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CatalogClassroomPage({ params }: { params: { slug: string } }) {
  const [room, setRoom] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .classroom(params.slug)
      .then((d) => {
        if (alive) setRoom(d as Detail);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Could not load this classroom.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [params.slug]);

  const capacity = room?.capacity ?? 0;
  const enrolled = room?.enrolled ?? 0;
  const seatsLeft = Math.max(0, capacity - enrolled);
  const sessions = (room?.sessions ?? []).slice().sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));

  return (
    <>
      <PageHead
        title={room?.title ?? "Classroom"}
        sub={room ? [room.level, room.schedule_text].filter(Boolean).join("  \u00b7  ") : "Loading classroom details"}
        actions={
          <Link href="/catalog" className="btn ghost sm">
            <Icon name="arrowLeft" size={14} /> Catalog
          </Link>
        }
      />

      {error ? (
        <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="catalog-detail" aria-hidden="true">
          <div><div className="card"><div className="skel" style={{ height: 90 }} /></div></div>
          <div className="card"><div className="skel" style={{ height: 150 }} /></div>
        </div>
      ) : !room ? (
        <div className="card empty">
          <div className="ico"><Icon name="users" size={24} /></div>
          <h3>Classroom not found</h3>
          <p>It may no longer be open. Browse the catalog for the cohorts running now.</p>
          <Link href="/catalog" className="btn pri sm">Browse the catalog</Link>
        </div>
      ) : (
        <div className="catalog-detail">
          <div>
            <section className="card" style={{ marginBottom: 16 }}>
              <div className="sec-head">
                <Icon name="info" size={14} />
                <h2 style={{ fontSize: 15 }}>About this cohort</h2>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--muted)" }}>
                {room.description || "The instructor will publish the outline shortly."}
              </p>
            </section>

            <section className="card" style={{ marginBottom: 16 }}>
              <div className="sec-head">
                <Icon name="clock" size={14} />
                <h2 style={{ fontSize: 15 }}>Timetable</h2>
                <span className="sp" />
                <span className="badge" style={{ fontSize: 11 }}>WAT</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                <Icon name="calendarCheck" size={14} />
                {room.schedule_text || "Weekly schedule to be confirmed"}
              </div>
              {sessions.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  Sessions publish before the cohort starts. Members get a notification when one is scheduled.
                </p>
              ) : (
                sessions.map((s) => (
                  <div className="trow" key={s.id}>
                    <span className="tico"><Icon name="video" size={15} /></span>
                    <span className="tbody">
                      <b>{s.title}</b>
                      <span>{when(s.starts_at)}</span>
                    </span>
                    <span className="badge" data-tone={STATUS_TONE[s.status ?? ""] ?? "info"}>
                      {s.status ?? "scheduled"}
                    </span>
                  </div>
                ))
              )}
            </section>

            <section className="card">
              <div className="sec-head">
                <Icon name="layers" size={14} />
                <h2 style={{ fontSize: 15 }}>What members get</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, color: "var(--muted)" }}>
                <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <Icon name="fileText" size={14} /> {room.material_count} private file{room.material_count === 1 ? "" : "s"} in the classroom library
                </span>
                <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <Icon name="video" size={14} /> Join live sessions and watch shared screens
                </span>
                <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <Icon name="layers" size={14} /> The class discussion and any assigned work
                </span>
                <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <Icon name="download" size={14} /> Recordings after a session ends
                </span>
              </div>
            </section>
          </div>

          <aside className="card">
            <div className="sec-head">
              <Icon name="receipt" size={14} />
              <h2 style={{ fontSize: 15 }}>Join this cohort</h2>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 10px" }}>
              {money(room.price_kobo, room.currency)}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)" }}>
                <Icon name="users" size={14} /> {enrolled}/{capacity || "\u2014"} seats taken
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: seatsLeft === 0 ? "var(--danger)" : "var(--muted)" }}>
                <Icon name="clock" size={14} /> {seatsLeft === 0 ? "This cohort is full" : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)" }}>
                <Icon name="calendarCheck" size={14} /> {sessions.length} session{sessions.length === 1 ? "" : "s"} scheduled
              </span>
            </div>
            <EnrollButton
              productType="classroom"
              productId={room.id}
              priceKobo={room.price_kobo}
              currency={room.currency}
            />
            <Link href="/classes" className="btn ghost sm block" style={{ marginTop: 10 }}>
              My classrooms
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
