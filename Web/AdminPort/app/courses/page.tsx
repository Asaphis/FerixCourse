"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, Sk, ToastHost, toast } from "@/components/reb-ui";
import { adminFetch, money, shortDate, slugify } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { Course } from "@/lib/admin-types";

/*
  Course list — create a course, then open /courses/:id to author its sections,
  lessons and files. Slug is suggested from the title (still editable), price is
  entered in naira and stored as kobo.

  The Products screen shows the same courses next to classrooms; this screen is
  the authoring entry point.
*/

const EMPTY = {
  title: "",
  slug: "",
  level: "Beginner",
  price: "",
  short_description: "",
};

export default function CoursesPage() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [openForm, setOpenForm] = useState(true);

  const courses = useAdmin<Course[]>("/admin/courses");
  const rows = courses.data ?? [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy("create");
    try {
      await adminFetch("/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug.trim(),
          level: form.level,
          short_description: form.short_description,
          currency: "NGN",
          price_kobo: Math.round((Number(form.price) || 0) * 100),
        }),
      });
      setForm(EMPTY);
      setOpenForm(false);
      courses.reload();
      toast("Course created — open it to add sections and lessons");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create the course.");
    } finally {
      setBusy("");
    }
  }

  async function toggle(c: Course) {
    setErr("");
    setBusy(`toggle-${c.id}`);
    try {
      await adminFetch(`/admin/courses/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !c.is_published }),
      });
      courses.reload();
      toast(c.is_published ? "Course unpublished and hidden from the catalog" : "Course published to the catalog");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update the course.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Shell>
      <Ph
        title="Courses"
        sub="Create courses, author their lessons and files, and control what appears in the catalog."
        actions={
          <>
            <button type="button" className="reb-btn ghost sm" onClick={() => setOpenForm((v) => !v)}>
              <Ic name={openForm ? "x" : "plus"} size={14} /> {openForm ? "Close" : "New course"}
            </button>
            <button type="button" className="reb-btn ghost sm" onClick={() => courses.reload()}>
              <Ic name="refresh" size={14} /> Refresh
            </button>
          </>
        }
      />

      {err ? <Err msg={err} onRetry={() => setErr("")} /> : null}

      {openForm ? (
        <section className="reb-card" style={{ marginBottom: 18 }}>
          <SecHead icon="plus" title="New course" />
          <form onSubmit={create} style={{ display: "grid", gap: 12 }}>
            <div className="kgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              <div className="field">
                <label className="kind" htmlFor="nc-title">
                  Title
                </label>
                <input
                  id="nc-title"
                  className="reb-input"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  placeholder="Frontend Engineering Fundamentals"
                />
              </div>
              <div className="field">
                <label className="kind" htmlFor="nc-slug">
                  Slug
                </label>
                <input
                  id="nc-slug"
                  className="reb-input"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="frontend-engineering-fundamentals"
                />
                <span className="hint">Used in the public URL.</span>
              </div>
              <div className="field">
                <label className="kind" htmlFor="nc-level">
                  Level
                </label>
                <select
                  id="nc-level"
                  className="select"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div className="field">
                <label className="kind" htmlFor="nc-price">
                  Price (NGN)
                </label>
                <input
                  id="nc-price"
                  className="reb-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="45000"
                />
                <span className="hint">Enter naira — stored as kobo.</span>
              </div>
            </div>
            <div className="field">
              <label className="kind" htmlFor="nc-desc">
                Short description
              </label>
              <input
                id="nc-desc"
                className="reb-input"
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                placeholder="What a learner gets from this course, in one line."
              />
            </div>
            <div>
              <button type="submit" className="reb-btn pri" disabled={busy === "create"}>
                <Ic name="plus" size={14} /> {busy === "create" ? "Creating…" : "Create course"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {courses.error ? <Err msg={courses.error} onRetry={courses.reload} /> : null}

      <section className="reb-card">
        <SecHead icon="bookOpen" title={`All courses · ${rows.length}`} />
        {courses.loading && rows.length === 0 ? (
          <Sk h={64} mb={8} />
        ) : rows.length === 0 && !courses.error ? (
          <Emp
            icon="bookOpen"
            title="No courses yet"
            note="Create the first course above, then add its sections and lessons."
            action={
              <button type="button" className="reb-btn pri sm" onClick={() => setOpenForm(true)}>
                <Ic name="plus" size={14} /> New course
              </button>
            }
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <caption style={{ display: "none" }}>All courses</caption>
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Level</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/courses/${c.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        {c.title}
                      </Link>
                      <span className="hint" style={{ display: "block" }}>
                        /{c.slug}
                      </span>
                    </td>
                    <td>
                      <Badge>{c.level}</Badge>
                    </td>
                    <td>
                      <b>{money(c.price_kobo, c.currency)}</b>
                    </td>
                    <td>
                      <Badge tone={c.is_published ? "ok" : ""}>{c.is_published ? "published" : "draft"}</Badge>
                    </td>
                    <td className="hint">{shortDate(c.created_at)}</td>
                    <td>
                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link className="reb-btn ghost sm" href={`/courses/${c.id}`}>
                          <Ic name="edit" size={13} /> Manage
                        </Link>
                        <button
                          type="button"
                          className="reb-btn ghost sm"
                          disabled={busy === `toggle-${c.id}`}
                          onClick={() => toggle(c)}
                        >
                          <Ic name={c.is_published ? "eye" : "check"} size={13} />
                          {c.is_published ? "Unpublish" : "Publish"}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ToastHost />
    </Shell>
  );
}
