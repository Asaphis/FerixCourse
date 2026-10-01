"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { api, money, type CatalogClassroom, type CatalogCourse, type Category } from "@/lib/dashboard-api";

/*
  Catalog — published courses and live cohorts, from the public endpoints
  (GET /api/courses, /api/classrooms, /api/categories). Reachable while logged
  out, so the shell renders its public variant.
*/

const LEVELS = ["", "Beginner", "Intermediate", "Advanced"];

export default function CatalogPage() {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [rooms, setRooms] = useState<CatalogClassroom[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [c, r, cat] = await Promise.all([
        api.courses({ search: q, level, category }),
        api.classrooms({ search: q, level }),
        api.categories(),
      ]);
      setCourses(c);
      setRooms(r);
      setCategories(cat);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load the catalog.");
    } finally {
      setLoading(false);
    }
  }, [q, level, category]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 220);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      <PageHead
        title="Catalog"
        sub="Self-paced courses and live cohorts. Enrol to unlock lessons, materials and the room."
      />

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <div className="field-wrap" style={{ minWidth: 220 }}>
          <Icon name="search" size={15} />
          <input
            className="input"
            style={{ background: "transparent", border: 0, padding: "9px 0" }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses and cohorts…"
            aria-label="Search the catalog"
          />
        </div>
        <label className="fc-sr-only" htmlFor="cat-level">Level</label>
        <select id="cat-level" className="select" value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: "auto" }}>
          {LEVELS.map((l) => (
            <option key={l || "all"} value={l}>{l || "All levels"}</option>
          ))}
        </select>
        {categories.length > 0 && (
          <>
            <label className="fc-sr-only" htmlFor="cat-cat">Category</label>
            <select id="cat-cat" className="select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "auto" }}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </>
        )}
        <button type="button" className="btn ghost sm" onClick={() => void load()}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert danger" role="alert" style={{ marginBottom: 18 }}>
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" className="btn ghost sm" onClick={() => void load()}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      )}

      <section className="sec" aria-label="Courses">
        <h2 className="eyebrow-sm" style={{ marginBottom: 10 }}>Courses · {courses.length}</h2>
        {loading ? (
          <div className="card-grid" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="tile">
                <div className="skel" style={{ height: 14, width: "60%", marginBottom: 10 }} />
                <div className="skel" style={{ height: 40 }} />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="card empty">
            <div className="ico"><Icon name="bookOpen" size={24} /></div>
            <h3>No published courses match</h3>
            <p>Try clearing the filters, or ask for a custom track and we will build one for you.</p>
            <Link href="/request" className="btn pri sm">Request training</Link>
          </div>
        ) : (
          <div className="card-grid">
            {courses.map((c) => (
              <article key={c.id} className="tile">
                <h3><Icon name="bookOpen" size={14} /> {c.category ?? "Course"}</h3>
                <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{c.title}</p>
                <p className="sub">{c.short_description || "Full syllabus on the course page."}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                  <span className="badge">{c.level}</span>
                  <span className="badge">{c.students} enrolled</span>
                  <span style={{ marginLeft: "auto", fontWeight: 800 }}>{money(c.price_kobo, c.currency)}</span>
                </div>
                <Link href={`/catalog/course/${c.slug}`} className="btn ghost sm" style={{ marginTop: 12 }}>
                  View course <Icon name="chevronRight" size={14} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="sec" aria-label="Live cohorts">
        <h2 className="eyebrow-sm" style={{ marginBottom: 10 }}>Live cohorts · {rooms.length}</h2>
        {loading ? (
          <div className="skel" style={{ height: 90 }} />
        ) : rooms.length === 0 ? (
          <div className="card empty">
            <div className="ico"><Icon name="monitorPlay" size={24} /></div>
            <h3>No open cohorts</h3>
            <p>New live cohorts publish here with their schedule and seats.</p>
          </div>
        ) : (
          <div className="card-grid">
            {rooms.map((r) => (
              <article key={r.id} className="tile">
                <h3><Icon name="monitorPlay" size={14} /> Live cohort</h3>
                <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{r.title}</p>
                <p className="sub">{r.description || "Syllabus announced by the instructor."}</p>
                <p className="hint">
                  {r.schedule_text || (r.starts_at ? `Starts ${new Date(r.starts_at).toLocaleDateString()}` : "Schedule TBD")}
                  {" · "}
                  {r.enrolled}/{r.capacity ?? 0} seats
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                  <span className="badge">{r.level}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 800 }}>{money(r.price_kobo, r.currency)}</span>
                </div>
                <Link href={`/catalog/classroom/${r.slug}`} className="btn pri sm" style={{ marginTop: 12 }}>
                  See details <Icon name="chevronRight" size={14} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
