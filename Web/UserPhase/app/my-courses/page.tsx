"use client";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { shortDate } from "@/components/ui/primitives";

/*
  My Courses — the learner's real enrollments (GET /public/enrollments/mine,
  loaded once by the shell context). Progress numbers come from the board's
  continue_learning entry when it matches the course; nothing is invented.
*/

export default function MyCoursesPage() {
  const { data, loading } = useDashboard();
  const courses = data?.courses ?? [];

  return (
    <>
      <PageHead
        title="My Courses"
        sub="Everything you are enrolled in. Open a course to pick up where you stopped."
      />

      {loading ? (
        <div className="card-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tile"><div className="skel" style={{ height: 78 }} /></div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card empty">
          <div className="ico"><Icon name="bookOpen" size={24} /></div>
          <h3>No courses yet</h3>
          <p>Enrol in a course from the catalog and it will show up here with your progress.</p>
          <Link href="/catalog" className="btn pri sm">Browse catalog</Link>
        </div>
      ) : (
        <div className="card-grid">
          {courses.map((c) => (
            <article key={c.id} className="tile">
              <h3><Icon name="bookOpen" size={14} /> Enrolled {shortDate(c.enrolled_at)}</h3>
              <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{c.title}</p>
              <p className="hint">Lessons, materials and your progress</p>
              <Link href={`/courses/${c.slug}`} className="btn pri sm" style={{ marginTop: 12 }}>
                <Icon name="play" size={14} /> Continue
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
