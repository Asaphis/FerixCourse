import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { getCourses, getClassrooms, getCategories, formatMoney } from "@/lib/api";
import { PageHead } from "@/components/dashboard/shell";

export const metadata = { title: "Catalog — FerixCourse" };

/*
  Catalog — live cohorts and recorded courses.
  Stays a server component: the public endpoints are the source of truth and
  fetching them on the server keeps the first paint fast. The dashboard shell
  comes from app/learn/layout.tsx, which allows a logged-out visitor.
*/

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default async function LearnPage({
  searchParams,
}: {
  searchParams: { q?: string; level?: string; category?: string };
}) {
  const q = searchParams.q ?? "";
  const level = searchParams.level ?? "";
  const category = searchParams.category ?? "";

  const [courses, rooms, cats] = await Promise.all([
    getCourses(`?search=${encodeURIComponent(q)}&level=${encodeURIComponent(level)}&category=${encodeURIComponent(category)}`),
    getClassrooms(`?search=${encodeURIComponent(q)}&level=${encodeURIComponent(level)}`),
    getCategories(),
  ]);

  const filtering = Boolean(q || level || category);

  return (
    <>
      <PageHead
        title="Catalog"
        sub="Live cohorts and recorded courses. Everything listed is real and enrollable today."
      />

      {/* Filters are a plain GET form, so results are bookmarkable and work without JS. */}
      <form method="GET" className="fc-card" style={{ padding: 16, marginBottom: 24 }}>
        <div className="fc-toolbar" style={{ marginBottom: 0 }}>
          <label className="fc-sr-only" htmlFor="cat-q">
            Search training
          </label>
          <div className="fc-search-trigger" style={{ maxWidth: 380, cursor: "text" }}>
            <Icon name="search" size={17} />
            <input
              id="cat-q"
              name="q"
              defaultValue={q}
              placeholder="Search training…"
              className="fc-input"
              style={{ border: 0, background: "none", padding: 0, boxShadow: "none" }}
            />
          </div>

          <label className="fc-sr-only" htmlFor="cat-level">
            Level
          </label>
          <select id="cat-level" name="level" defaultValue={level} className="fc-select" style={{ maxWidth: 180 }}>
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <label className="fc-sr-only" htmlFor="cat-category">
            Category
          </label>
          <select id="cat-category" name="category" defaultValue={category} className="fc-select" style={{ maxWidth: 200 }}>
            <option value="">All categories</option>
            {cats.map((c: { id: string; name: string; slug: string }) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <button type="submit" className="fc-btn fc-btn-primary">
            <Icon name="filter" size={15} /> Apply
          </button>
          {filtering && (
            <Link href="/learn" className="fc-btn fc-btn-ghost">
              Clear
            </Link>
          )}
        </div>
      </form>

      {filtering && (
        <p className="fc-hint" style={{ marginBottom: 18 }} role="status">
          Showing {rooms.length + courses.length} result{rooms.length + courses.length === 1 ? "" : "s"}
          {q ? ` for “${q}”` : ""}
          {level ? ` · ${level}` : ""}.
        </p>
      )}

      {/* Live cohorts */}
      <section aria-labelledby="cat-live" style={{ marginBottom: 32 }}>
        <div className="fc-sec-head">
          <h2 className="fc-sec-title" id="cat-live">
            Live cohorts
          </h2>
          {rooms.length > 0 && <span className="fc-badge fc-badge-info">{rooms.length}</span>}
        </div>
        {rooms.length === 0 ? (
          <EmptyState
            icon="monitorPlay"
            title="No cohorts match"
            body="Try a wider search, or ask us to build this as a custom class."
            action={
              <Link href="/request" className="fc-btn fc-btn-ghost fc-btn-sm">
                Request this topic
              </Link>
            }
          />
        ) : (
          <div className="fc-cards-grid">
            {rooms.map((r: {
              id: string;
              slug: string;
              title: string;
              level: string | null;
              schedule_text: string | null;
              price_kobo: number;
              currency: string;
              capacity: number | null;
              enrolled: number;
            }) => {
              const seatsLeft = Math.max(0, (r.capacity ?? 0) - (r.enrolled ?? 0));
              return (
                <article key={r.id} className="fc-course-card">
                  <div className="fc-course-cover">
                    <span className="fc-course-badge">
                      <span className="fc-badge fc-badge-info">{r.level || "All levels"}</span>
                    </span>
                    <Icon name="monitorPlay" size={34} style={{ opacity: 0.85 }} />
                    <span className="fc-course-dur">
                      {r.enrolled ?? 0}/{r.capacity ?? "—"} seats
                    </span>
                  </div>
                  <div className="fc-course-body">
                    <h3 className="fc-course-title">{r.title}</h3>
                    <p className="fc-course-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="calendar" size={13} /> {r.schedule_text || "Schedule announced soon"}
                    </p>
                    <p className="fc-course-meta">
                      {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left` : "Cohort full"}
                    </p>
                    <div className="fc-course-foot">
                      <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: 17 }}>
                        {formatMoney(r.price_kobo, r.currency)}
                      </span>
                      <Link
                        href={`/classrooms/${r.slug}`}
                        className="fc-btn fc-btn-primary fc-btn-sm"
                        style={{ marginLeft: "auto" }}
                      >
                        View cohort
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Recorded courses */}
      <section aria-labelledby="cat-courses">
        <div className="fc-sec-head">
          <h2 className="fc-sec-title" id="cat-courses">
            Recorded courses
          </h2>
          {courses.length > 0 && <span className="fc-badge fc-badge-brand">{courses.length}</span>}
        </div>
        {courses.length === 0 ? (
          <EmptyState
            icon="bookOpen"
            title="No courses match"
            body="Try a different search — or request this topic and we will build it."
            action={
              <Link href="/request" className="fc-btn fc-btn-primary fc-btn-sm">
                Request training
              </Link>
            }
          />
        ) : (
          <div className="fc-cards-grid">
            {courses.map((c: {
              id: string;
              slug: string;
              title: string;
              level: string | null;
              category: string | null;
              short_description: string | null;
              price_kobo: number;
              currency: string;
              students: number;
            }) => (
              <article key={c.id} className="fc-course-card">
                <div className="fc-course-cover">
                  {c.category && (
                    <span className="fc-course-badge">
                      <span className="fc-badge fc-badge-neutral">{c.category}</span>
                    </span>
                  )}
                  <Icon name="bookOpen" size={34} style={{ opacity: 0.85 }} />
                  <span className="fc-course-dur">{c.level || "All levels"}</span>
                </div>
                <div className="fc-course-body">
                  <h3 className="fc-course-title">{c.title}</h3>
                  {c.short_description && <p className="fc-course-meta">{c.short_description}</p>}
                  <p className="fc-course-meta">
                    {c.students ?? 0} student{c.students === 1 ? "" : "s"} enrolled
                  </p>
                  <div className="fc-course-foot">
                    <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: 17 }}>
                      {formatMoney(c.price_kobo, c.currency)}
                    </span>
                    <Link
                      href={`/courses/${c.slug}`}
                      className="fc-btn fc-btn-primary fc-btn-sm"
                      style={{ marginLeft: "auto" }}
                    >
                      View course
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
