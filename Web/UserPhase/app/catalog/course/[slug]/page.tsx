"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import EnrollButton from "@/components/enroll";
import { api, money, type CatalogCourse, type CourseSection } from "@/lib/dashboard-api";

/*
  Course detail inside the dashboard. The catalog used to send learners to the
  public marketing page, which drops them out of the app. Same data, rebuild
  design, plus the enrol action that already handles checkout.
*/

type Detail = CatalogCourse & { sections: CourseSection[] };

export default function CatalogCoursePage({ params }: { params: { slug: string } }) {
  const [course, setCourse] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .course(params.slug)
      .then((d) => {
        if (alive) setCourse(d as Detail);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Could not load this course.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [params.slug]);

  const sections = course?.sections ?? [];
  const lessons = sections.reduce((n, s) => n + (s.lessons?.length ?? 0), 0);

  return (
    <>
      <PageHead
        title={course?.title ?? "Course"}
        sub={
          course
            ? [course.level, course.category, `${course.students} enrolled`].filter(Boolean).join("  \u00b7  ")
            : "Loading course details"
        }
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
          <div>
            <div className="card"><div className="skel" style={{ height: 90 }} /></div>
          </div>
          <div className="card"><div className="skel" style={{ height: 150 }} /></div>
        </div>
      ) : !course ? (
        <div className="card empty">
          <div className="ico"><Icon name="bookOpen" size={24} /></div>
          <h3>Course not found</h3>
          <p>It may have been unpublished. Browse the catalog for what is open now.</p>
          <Link href="/catalog" className="btn pri sm">Browse the catalog</Link>
        </div>
      ) : (
        <div className="catalog-detail">
          <div>
            <section className="card" style={{ marginBottom: 16 }}>
              <div className="sec-head">
                <Icon name="info" size={14} />
                <h2 style={{ fontSize: 15 }}>About this course</h2>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--muted)" }}>
                {course.short_description || "The instructor will publish the outline shortly."}
              </p>
            </section>

            <section className="card">
              <div className="sec-head">
                <Icon name="layers" size={14} />
                <h2 style={{ fontSize: 15 }}>Curriculum</h2>
                <span className="sp" />
                <span className="badge" style={{ fontSize: 11 }}>
                  {lessons} lesson{lessons === 1 ? "" : "s"}
                </span>
              </div>
              {sections.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  Lessons publish with the course. Enrolled learners see them here.
                </p>
              ) : (
                sections
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((s, i) => (
                    <div className="qa" key={s.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span className="badge" style={{ flex: "none" }}>{i + 1}</span>
                        <b style={{ fontSize: 13.5 }}>{s.title}</b>
                      </div>
                      {(s.lessons ?? []).length > 0 ? (
                        <div style={{ marginTop: 8 }}>
                          {(s.lessons ?? []).map((l) => (
                            <div
                              key={l.id}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                                padding: "6px 0",
                                fontSize: 12.5,
                                color: "var(--muted)",
                              }}
                            >
                              <Icon name="play" size={12} />
                              <span style={{ flex: 1, minWidth: 0 }}>{l.title}</span>
                              {l.duration_sec ? <span className="hint">{Math.round(l.duration_sec / 60)} min</span> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
              )}
            </section>
          </div>

          <aside className="card">
            <div className="sec-head">
              <Icon name="receipt" size={14} />
              <h2 style={{ fontSize: 15 }}>Enrol</h2>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 10px" }}>
              {money(course.price_kobo, course.currency)}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)" }}>
                <Icon name="graduationCap" size={14} /> {course.level || "All levels"}
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)" }}>
                <Icon name="users" size={14} /> {course.students} learner{course.students === 1 ? "" : "s"} enrolled
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)" }}>
                <Icon name="video" size={14} /> {lessons} lesson{lessons === 1 ? "" : "s"} with video
              </span>
            </div>
            <EnrollButton
              productType="course"
              productId={course.id}
              priceKobo={course.price_kobo}
              currency={course.currency}
            />
            <Link href="/my-courses" className="btn ghost sm block" style={{ marginTop: 10 }}>
              My courses
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
