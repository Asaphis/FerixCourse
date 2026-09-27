"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { Chip, EmptyState, LoadingGrid, Progress, initials } from "@/components/ui/primitives";
import { useCoursesProgress } from "@/lib/use-dashboard";

/*
  My Courses — real enrollments, with real lesson progress from
  GET /scope/courses/:id/learn for each owned course.
*/

type Filter = "all" | "in-progress" | "complete" | "not-started";

export default function MyCoursesPage() {
  const { data, loading, failures, reload } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const courses = data?.courses ?? [];
  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);
  const { progress, loading: progressLoading } = useCoursesProgress(courseIds);

  const counts = useMemo(() => {
    let inProgress = 0;
    let complete = 0;
    let notStarted = 0;
    for (const c of courses) {
      const p = progress[c.id];
      if (!p) continue;
      if (p.pct === 100 && p.total > 0) complete += 1;
      else if (p.completed > 0) inProgress += 1;
      else notStarted += 1;
    }
    return { inProgress, complete, notStarted };
  }, [courses, progress]);

  const visible = useMemo(() => {
    if (filter === "all") return courses;
    return courses.filter((c) => {
      const p = progress[c.id];
      if (!p) return false;
      if (filter === "complete") return p.pct === 100 && p.total > 0;
      if (filter === "in-progress") return p.completed > 0 && p.pct < 100;
      return p.completed === 0;
    });
  }, [courses, progress, filter]);

  return (
    <>
      <PageHead
        title="My Courses"
        sub="Recorded courses you own. Progress comes from your completed lessons."
        actions={
          <Link href="/learn" className="fc-btn fc-btn-primary">
            <Icon name="compass" size={16} /> Browse catalog
          </Link>
        }
      />

      {failures.length > 0 && (
        <div className="fc-alert fc-alert-danger" role="alert">
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>Could not load your courses. {failures.join(", ")}.</span>
          <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={reload}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      )}

      {loading || progressLoading ? (
        <LoadingGrid height={168} count={4} />
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
        <>
          <div className="fc-filter-bar">
            <Chip pressed={filter === "all"} onClick={() => setFilter("all")}>
              All ({courses.length})
            </Chip>
            <Chip pressed={filter === "in-progress"} onClick={() => setFilter("in-progress")}>
              In progress ({counts.inProgress})
            </Chip>
            <Chip pressed={filter === "complete"} onClick={() => setFilter("complete")}>
              Completed ({counts.complete})
            </Chip>
            <Chip pressed={filter === "not-started"} onClick={() => setFilter("not-started")}>
              Not started ({counts.notStarted})
            </Chip>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon="filter" title="Nothing in this filter" body="Try another filter to see your other courses." />
          ) : (
            <div className="fc-cards-grid">
              {visible.map((c) => {
                const p = progress[c.id];
                return (
                  <article key={c.id} className="fc-course-card">
                    <div className="fc-course-cover">
                      <span className="fc-course-badge">
                        <span className="fc-badge fc-badge-brand">Owned course</span>
                      </span>
                      <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: 22 }}>
                        {initials(c.title)}
                      </span>
                      {p && p.total > 0 && (
                        <span className="fc-course-dur">
                          {p.total} lesson{p.total === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="fc-course-body">
                      <h3 className="fc-course-title">{c.title}</h3>
                      <p className="fc-course-meta">Enrolled {new Date(c.enrolled_at).toLocaleDateString()}</p>
                      {p ? (
                        <>
                          <Progress
                            value={p.pct}
                            label={`${c.title} progress`}
                            tone={p.pct === 100 ? "ok" : undefined}
                          />
                          <p className="fc-course-meta">
                            {p.completed} of {p.total} lessons · {p.pct}%
                          </p>
                        </>
                      ) : (
                        <p className="fc-course-meta">Progress unavailable right now.</p>
                      )}
                      <div className="fc-course-foot">
                        <Link href={`/courses/${c.slug}`} className="fc-btn fc-btn-primary fc-btn-sm">
                          <Icon name="play" size={14} />
                          {p && p.completed > 0 && p.pct < 100 ? "Continue" : p && p.pct === 100 ? "Review" : "Start"}
                        </Link>
                        {p?.nextLesson && <span className="fc-course-meta">Next: {p.nextLesson.title}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
