"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Badge, EmptyState, ErrorNote, Field, PageHead, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { adminFetch, money, shortDate, slugify } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { Course } from "@/lib/admin-types";

/*
  Course list.

  Two changes over the previous version:
    - each course links to /courses/:id, where its sections, lessons and files
      are authored. Before this, a course could be created and published but
      never filled with content.
    - slug is suggested from the title (still editable) instead of being typed
      from scratch, and currency is sent explicitly rather than left implicit.
      The price field now takes the major unit a human thinks in, and the API
      stores kobo.
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
  const [msg, setMsg] = useState("");

  const courses = useAdmin<Course[]>("/admin/courses");
  const rows = courses.data ?? [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
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
      courses.reload();
      setMsg("Course created. Open it to add sections, lessons and files.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create the course.");
    } finally {
      setBusy("");
    }
  }

  async function toggle(c: Course) {
    setErr("");
    setMsg("");
    setBusy(`toggle-${c.id}`);
    try {
      await adminFetch(`/admin/courses/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !c.is_published }),
      });
      courses.reload();
      setMsg(c.is_published ? "Course unpublished and hidden from the catalog." : "Course published to the catalog.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update the course.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Shell>
      <PageHead
        title="Courses"
        sub="Create courses, author their lessons and files, and control what appears in the catalog."
        actions={
          <button type="button" className="ad-btn ad-btn-ghost" onClick={() => courses.reload()}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        }
      />

      {err ? <ErrorNote message={err} onRetry={() => setErr("")} /> : null}
      {msg ? (
        <div className="ad-alert ad-alert-ok" role="status">
          <Icon name="check" size={17} />
          <span>{msg}</span>
        </div>
      ) : null}

      <div className="ad-card">
        <SectionHead title="New course" />
        <form onSubmit={create} style={{ display: "grid", gap: 12 }}>
          <div className="ad-grid ad-grid-2">
            <Field label="Title" id="ad-nc-title">
              <input
                id="ad-nc-title"
                className="ad-input"
                required
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })
                }
                placeholder="Frontend Engineering Fundamentals"
              />
            </Field>
            <Field label="Slug" id="ad-nc-slug" hint="Used in the public URL.">
              <input
                id="ad-nc-slug"
                className="ad-input"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="frontend-engineering-fundamentals"
              />
            </Field>
            <Field label="Level" id="ad-nc-level">
              <select id="ad-nc-level" className="ad-select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </Field>
            <Field label="Price (NGN)" id="ad-nc-price" hint="Enter the amount in naira — stored as kobo.">
              <input
                id="ad-nc-price"
                className="ad-input"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="45000"
              />
            </Field>
          </div>
          <Field label="Short description" id="ad-nc-desc">
            <input
              id="ad-nc-desc"
              className="ad-input"
              value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              placeholder="What a learner gets from this course, in one line."
            />
          </Field>
          <div>
            <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "create"}>
              <Icon name="plus" size={14} /> {busy === "create" ? "Creating…" : "Create course"}
            </button>
          </div>
        </form>
      </div>

      {courses.error ? <ErrorNote message={courses.error} onRetry={courses.reload} /> : null}

      <SectionHead title="All courses" count={rows.length} />
      {courses.loading && rows.length === 0 ? (
        <Skeleton height={70} count={4} />
      ) : rows.length === 0 && !courses.error ? (
        <EmptyState icon="bookOpen" title="No courses yet" body="Create the first course above, then add its sections and lessons." />
      ) : (
        <div className="ad-card ad-card-pad-0">
          <div className="ad-table-wrap">
            <table className="ad-table">
              <caption className="ad-sr-only">All courses</caption>
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Level</th>
                  <th scope="col" className="num">
                    Price
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">
                    <span className="ad-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link className="ad-row-title" href={`/courses/${c.id}`}>
                        {c.title}
                      </Link>
                      <span className="ad-row-meta ad-mono">{c.slug}</span>
                    </td>
                    <td>
                      <Badge>{c.level}</Badge>
                    </td>
                    <td className="num">{money(c.price_kobo, c.currency)}</td>
                    <td>
                      <StatusBadge status={c.is_published ? "published" : "draft"} />
                    </td>
                    <td className="ad-muted">{shortDate(c.created_at)}</td>
                    <td>
                      <span className="ad-row-actions">
                        <Link className="ad-btn ad-btn-ghost ad-btn-sm" href={`/courses/${c.id}`}>
                          <Icon name="edit" size={13} /> Manage
                        </Link>
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost ad-btn-sm"
                          disabled={busy === `toggle-${c.id}`}
                          onClick={() => toggle(c)}
                        >
                          <Icon name={c.is_published ? "eye" : "check"} size={13} />
                          {c.is_published ? "Unpublish" : "Publish"}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
