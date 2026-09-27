"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageError, PageHead } from "@/components/dashboard/shell";
import { Icon, type IconName } from "@/components/ui/icons";
import { EmptyState, LoadingGrid, Progress, SectionHead, StatCard, StatusBadge, initials, shortDateTime } from "@/components/ui/primitives";
import { api } from "@/lib/dashboard-api";
import { useAsync, useCoursesProgress } from "@/lib/use-dashboard";

/*
  Overview.
  Composition mirrors the approved design: greeting → 4 stat tiles → promo band →
  Continue Learning (wide) + Upcoming Live Classes (rail) → Explore Training →
  My Recent Courses (wide) + Recent Activity & 1-on-1 (rail).
  Every value is real: no placeholder rows, and each empty state offers the
  action that would fill it.
*/

export default function OverviewPage() {
  const { data, loading, failures, reload, unreadNotifications, pendingRequests } = useDashboard();
  const categories = useAsync(() => api.categories(), []);

  const courses = data?.courses ?? [];
  const classrooms = data?.classrooms ?? [];
  const notifications = data?.notifications ?? [];
  const bookings = data?.bookings ?? [];
  const requests = data?.requests;

  /* Real lesson progress for each owned course. */
  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);
  const { progress, loading: progressLoading } = useCoursesProgress(courseIds);

  const name = data?.profile?.full_name || data?.profile?.email?.split("@")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  /* The classroom that is live now, or starts within the next 30 minutes. */
  const liveNow = useMemo(() => {
    const now = Date.now();
    return (
      classrooms.find((c) => {
        if (!c.starts_at) return false;
        const start = new Date(c.starts_at).getTime();
        return start <= now + 30 * 60 * 1000 && start >= now - 3 * 60 * 60 * 1000;
      }) ?? null
    );
  }, [classrooms]);

  const upcomingRooms = useMemo(() => {
    const now = Date.now();
    return classrooms
      .filter((c) => c.starts_at && new Date(c.starts_at).getTime() > now)
      .sort((a, b) => new Date(a.starts_at as string).getTime() - new Date(b.starts_at as string).getTime())
      .slice(0, 4);
  }, [classrooms]);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => ["pending", "confirmed", "paid"].includes(b.status)).slice(0, 2),
    [bookings]
  );

  const recentCourses = courses.slice(0, 3);
  const recentActivity = notifications.slice(0, 4);
  const cats = (categories.data ?? []).slice(0, 8);

  const totalLessons = Object.values(progress).reduce((n, p) => n + p.total, 0);
  const doneLessons = Object.values(progress).reduce((n, p) => n + p.completed, 0);

  return (
    <>
      <PageHead
        title={name ? `${greeting}, ${name}` : greeting}
        sub="Everything below is live from your account."
        actions={
          <>
            <Link href="/learn" className="fc-btn fc-btn-ghost">
              <Icon name="compass" size={16} /> Browse catalog
            </Link>
            <Link href="/request" className="fc-btn fc-btn-primary">
              <Icon name="sparkles" size={16} /> Request training
            </Link>
          </>
        }
      />

      <PageError
        message={failures.length ? `Some panels could not load: ${failures.join(", ")}.` : ""}
        onRetry={reload}
      />

      {/* Live-now banner: a learner arriving early should not have to hunt. */}
      {liveNow && (
        <div className="fc-live-now">
          <span className="fc-live-pill">
            <span className="fc-dot" /> LIVE
          </span>
          <div>
            <p className="fc-ln-title">{liveNow.title}</p>
            <p className="fc-ln-meta">
              {liveNow.schedule_text || "Scheduled session"} · started {shortDateTime(liveNow.starts_at)}
            </p>
          </div>
          <Link href={`/classrooms/${liveNow.slug}`} className="fc-btn fc-btn-primary fc-btn-sm">
            <Icon name="video" size={15} /> Join now
          </Link>
        </div>
      )}

      {/* 4 stat tiles */}
      {loading ? (
        <LoadingGrid height={86} count={4} />
      ) : (
        <div className="fc-stats">
          <StatCard icon="bookOpen" label="Courses owned" value={courses.length} />
          <StatCard icon="monitorPlay" tone="info" label="Live classrooms" value={classrooms.length} />
          <StatCard icon="bell" tone={unreadNotifications ? "warn" : undefined} label="Unread alerts" value={unreadNotifications} />
          <StatCard icon="sparkles" tone={pendingRequests ? "warn" : "ok"} label="Requests awaiting reply" value={pendingRequests} />
        </div>
      )}

      {/* Promo band */}
      <section className="fc-promo" aria-labelledby="ov-promo">
        <div className="fc-promo-copy">
          <h2 id="ov-promo">
            {totalLessons > 0 ? `${doneLessons} of ${totalLessons} lessons complete` : "Pick your next skill and start today"}
          </h2>
          <p>
            {totalLessons > 0
              ? "Keep your streak going — the next lesson is already queued up for you."
              : "Join a live cohort, buy a recorded course, or book private mentorship with an instructor."}
          </p>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {courses.length > 0 ? (
              <Link href="/my-courses" className="fc-btn fc-btn-primary">
                <Icon name="play" size={15} /> Continue learning
              </Link>
            ) : (
              <Link href="/learn" className="fc-btn fc-btn-primary">
                <Icon name="compass" size={15} /> Explore the catalog
              </Link>
            )}
            <Link href="/book" className="fc-btn fc-btn-ghost">
              <Icon name="calendarCheck" size={15} /> Book 1-on-1
            </Link>
          </div>
        </div>
        <div className="fc-promo-art" aria-hidden="true">
          <Icon name="graduationCap" />
        </div>
      </section>

      {/* Continue Learning + Upcoming Live Classes */}
      <div className="fc-band">
        <section className="fc-card" aria-labelledby="ov-continue">
          <SectionHead
            title="Continue Learning"
            id="ov-continue"
            action={
              courses.length > 0 ? (
                <Link href="/my-courses" className="fc-btn-quiet fc-btn">
                  View all <Icon name="arrowRight" size={14} />
                </Link>
              ) : undefined
            }
          />
          {loading || progressLoading ? (
            <LoadingGrid height={104} count={2} />
          ) : courses.length === 0 ? (
            <EmptyState
              icon="bookOpen"
              title="No courses yet"
              body="Buy a recorded course and it lives here forever, with progress tracking across every lesson."
              action={
                <Link href="/learn" className="fc-btn fc-btn-primary fc-btn-sm">
                  Browse catalog <Icon name="arrowRight" size={14} />
                </Link>
              }
            />
          ) : (
            courses.slice(0, 3).map((c) => {
              const p = progress[c.id];
              return (
                <div key={c.id} className="fc-cont-item">
                  <span className="fc-cont-thumb">
                    {initials(c.title)}
                    {p && p.pct === 100 ? (
                      <span className="fc-play">
                        <Icon name="check" />
                      </span>
                    ) : (
                      <span className="fc-play">
                        <Icon name="play" />
                      </span>
                    )}
                  </span>
                  <div className="fc-cont-body">
                    <p className="fc-cont-title">{c.title}</p>
                    <p className="fc-cont-meta">
                      Enrolled {new Date(c.enrolled_at).toLocaleDateString()}
                      {p ? ` · ${p.total} lesson${p.total === 1 ? "" : "s"}` : ""}
                    </p>
                    {p ? (
                      <div className="fc-cont-progress">
                        <div className="fc-cont-pct">
                          <span>{p.completed} completed</span>
                          <span>{p.pct}%</span>
                        </div>
                        <Progress value={p.pct} label={`${c.title} progress`} tone={p.pct === 100 ? "ok" : undefined} />
                      </div>
                    ) : null}
                    <p className="fc-cont-next">
                      {p?.nextLesson ? `Next: ${p.nextLesson.title}` : p && p.total > 0 ? "All lessons complete" : "Open the course to begin"}
                    </p>
                  </div>
                  <Link href={`/courses/${c.slug}`} className="fc-btn fc-btn-ghost fc-btn-sm">
                    Open
                  </Link>
                </div>
              );
            })
          )}
        </section>

        <section className="fc-card" aria-labelledby="ov-live">
          <SectionHead
            title="Upcoming Live Classes"
            id="ov-live"
            action={
              classrooms.length > 0 ? (
                <Link href="/classes" className="fc-btn-quiet fc-btn">
                  All <Icon name="arrowRight" size={14} />
                </Link>
              ) : undefined
            }
          />
          {loading ? (
            <LoadingGrid height={72} count={2} />
          ) : upcomingRooms.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Nothing scheduled"
              body="When a cohort you joined has a session, its start time appears here."
              action={
                <Link href="/classes" className="fc-btn fc-btn-ghost fc-btn-sm">
                  My classrooms
                </Link>
              }
            />
          ) : (
            upcomingRooms.map((r) => (
              <Link key={r.id} href={`/classrooms/${r.slug}`} className="fc-live-item">
                <span className="fc-live-thumb">{initials(r.title)}</span>
                <span className="fc-live-body">
                  <span className="fc-live-title" style={{ display: "block" }}>
                    {r.title}
                  </span>
                  <span className="fc-live-meta">
                    <Icon name="clock" size={12} /> {shortDateTime(r.starts_at)}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} style={{ color: "var(--fc-muted)" }} />
              </Link>
            ))
          )}
        </section>
      </div>

      {/* Explore Training */}
      <section className="fc-card" aria-labelledby="ov-explore">
        <SectionHead
          title="Explore Training"
          id="ov-explore"
          action={
            <Link href="/learn" className="fc-btn-quiet fc-btn">
              See everything <Icon name="arrowRight" size={14} />
            </Link>
          }
        />
        {cats.length > 0 ? (
          <div className="fc-tiles">
            {cats.map((c) => (
              <Link key={c.id} href={`/learn?category=${encodeURIComponent(c.slug)}`} className="fc-tile">
                <span className="fc-tile-ico">
                  <Icon name="layers" size={19} />
                </span>
                <span className="fc-tile-name">{c.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="fc-tiles">
            {(
              [
                ["Recorded courses", "Learn at your own pace", "/learn", "bookOpen"],
                ["Live cohorts", "Join a scheduled class", "/classes", "monitorPlay"],
                ["Custom track", "Request a topic", "/request", "sparkles"],
                ["1-on-1 session", "Book an instructor", "/book", "calendarCheck"],
              ] as Array<[string, string, string, IconName]>
            ).map(([label, sub, href, icon]) => (
              <Link key={href} href={href} className="fc-tile">
                <span className="fc-tile-ico">
                  <Icon name={icon} size={19} />
                </span>
                <span className="fc-tile-name">{label}</span>
                <p>{sub}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent courses + activity rail */}
      <div className="fc-band">
        <section className="fc-card" aria-labelledby="ov-recent">
          <SectionHead
            title="My Recent Courses"
            id="ov-recent"
            action={
              courses.length > 0 ? (
                <Link href="/my-courses" className="fc-btn-quiet fc-btn">
                  View all <Icon name="arrowRight" size={14} />
                </Link>
              ) : undefined
            }
          />
          {loading ? (
            <LoadingGrid height={96} count={3} />
          ) : recentCourses.length === 0 ? (
            <EmptyState icon="bookOpen" title="Nothing here yet" body="Courses you buy show up here with their progress." />
          ) : (
            <div className="fc-mini-grid">
              {recentCourses.map((c) => {
                const p = progress[c.id];
                return (
                  <Link key={c.id} href={`/courses/${c.slug}`} className="fc-mini">
                    <span className="fc-mini-top">
                      <span className="fc-mini-ico">{initials(c.title)}</span>
                      <span className="fc-mini-title">{c.title}</span>
                    </span>
                    {p ? (
                      <>
                        <Progress value={p.pct} label={`${c.title} progress`} tone={p.pct === 100 ? "ok" : undefined} />
                        <span className="fc-mini-pct">
                          <span>
                            {p.completed}/{p.total} lessons
                          </span>
                          <span>{p.pct}%</span>
                        </span>
                      </>
                    ) : (
                      <span className="fc-mini-pct">
                        <span>Open to track progress</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <div className="fc-stack">
          <section className="fc-card" aria-labelledby="ov-activity">
            <SectionHead
              title="Recent Activity"
              id="ov-activity"
              action={
                notifications.length > 0 ? (
                  <Link href="/notifications" className="fc-btn-quiet fc-btn">
                    All <Icon name="arrowRight" size={14} />
                  </Link>
                ) : undefined
              }
            />
            {loading ? (
              <LoadingGrid height={64} count={2} />
            ) : recentActivity.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fc-muted)" }}>Nothing yet — payments, recordings and reminders land here.</p>
            ) : (
              recentActivity.map((n) => {
                const kind = (n.type ?? "").toLowerCase();
                const tone = kind.includes("fail") ? "danger" : kind.includes("enroll") || kind.includes("welcome") ? "ok" : "info";
                return (
                  <div key={n.id} className="fc-act-item">
                    <span className={`fc-act-ico ${tone}`}>
                      <Icon name={tone === "ok" ? "checkCircle" : tone === "danger" ? "alertCircle" : "info"} size={15} />
                    </span>
                    <span className="fc-act-body">
                      <span className="fc-act-text" style={{ display: "block" }}>
                        {n.title}
                      </span>
                      <span className="fc-act-time">{new Date(n.created_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                );
              })
            )}
          </section>

          <section className="fc-card" aria-labelledby="ov-onone">
            <SectionHead title="1-on-1 Sessions" id="ov-onone" />
            {loading ? (
              <LoadingGrid height={64} count={1} />
            ) : upcomingBookings.length === 0 ? (
              <div className="fc-onone">
                <div className="fc-onone-top">
                  <span className="fc-onone-ico">
                    <Icon name="calendarCheck" size={19} />
                  </span>
                  <div>
                    <p className="fc-onone-title">No sessions booked</p>
                    <p className="fc-onone-meta">Pick a slot with an instructor.</p>
                  </div>
                </div>
                <Link href="/book" className="fc-btn fc-btn-primary fc-btn-block fc-btn-sm">
                  Book 1-on-1
                </Link>
              </div>
            ) : (
              upcomingBookings.map((b) => (
                <div key={b.id} className="fc-onone" style={{ marginBottom: 12 }}>
                  <div className="fc-onone-top">
                    <span className="fc-onone-ico">
                      <Icon name="calendarCheck" size={19} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p className="fc-onone-title">{b.topic}</p>
                      <p className="fc-onone-meta">
                        {b.preferred_date || "Date TBC"} · {b.duration_min} min · {b.mode}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge status={b.status} />
                    <Link href={`/bookings/${b.id}`} className="fc-btn fc-btn-ghost fc-btn-sm" style={{ marginLeft: "auto" }}>
                      Open
                    </Link>
                  </div>
                </div>
              ))
            )}
          </section>

          {requests && requests.joined.length > 0 && (
            <section className="fc-card" aria-labelledby="ov-queue">
              <SectionHead title="Waiting Lists" id="ov-queue" />
              {requests.joined.slice(0, 3).map((j) => (
                <div key={j.id} className="fc-row-item">
                  <span className="fc-row-main">
                    <span className="fc-row-title" style={{ display: "block" }}>
                      {j.topic}
                    </span>
                    <span className="fc-row-meta">
                      Position {j.position} of {j.waiting} · responds in ~{requests.sla_hours}h
                    </span>
                  </span>
                  <StatusBadge status={j.status} />
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
