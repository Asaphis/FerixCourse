"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Alert, Badge, DangerButton, EmptyState, ErrorNote, Field, PageHead, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { adminFetch, bytes, durationMin, money, shortDate } from "@/lib/admin";
import { uploadFile } from "@/lib/upload";
import { useAdmin } from "@/lib/use-admin";
import type { CourseDetail } from "@/lib/admin-types";

/*
  Course editor — the content side of a course.

  Endpoints:
    GET    /admin/courses/:id          course + sections (with lessons) + materials + enrolled count
    PATCH  /admin/courses/:id          title, slug, price, level, description, is_published
    POST   /admin/courses/:id/sections            add a section
    DELETE /admin/sections/:id                    remove a section (cascades to its lessons)
    POST   /admin/sections/:id/lessons            add a lesson
    PATCH  /admin/lessons/:id                     retitle, attach a video key, set duration/preview
    DELETE /admin/lessons/:id
    POST   /admin/uploads                         put bytes in storage
    POST   /admin/materials                       attach a file to the course (optionally to one lesson)
    DELETE /admin/materials/course/:id
    GET    /files/course-material/:id             15-minute signed download URL
    DELETE /admin/courses/:id                     delete (?force=true when learners are enrolled)

  Why: the console could create a course and publish it, but had no way to put a
  single lesson or file inside it — a learner could enroll in an empty shell.
*/

export default function CourseEditorPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const course = useAdmin<CourseDetail>(`/admin/courses/${id}`);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const [sectionTitle, setSectionTitle] = useState("");
  const [lessonFor, setLessonFor] = useState("");
  const [lessonDraft, setLessonDraft] = useState({ title: "", video_key: "", duration_min: "" });
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [materialLesson, setMaterialLesson] = useState("");
  const [meta, setMeta] = useState({ title: "", slug: "", price: "", level: "" });

  const c = course.data;

  const lessons = useMemo(() => (c?.sections ?? []).flatMap((s) => s.lessons ?? []), [c]);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await fn();
      course.reload();
      setNotice(ok);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "That action failed.");
      return false;
    } finally {
      setBusy("");
    }
  };

  const addSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;
    const ok = await run(
      "section",
      () =>
        adminFetch(`/admin/courses/${id}/sections`, {
          method: "POST",
          body: JSON.stringify({ title: sectionTitle.trim() }),
        }),
      "Section added."
    );
    if (ok) setSectionTitle("");
  };

  const addLesson = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault();
    if (!lessonDraft.title.trim()) return;
    const ok = await run(
      `lesson-${sectionId}`,
      () =>
        adminFetch(`/admin/sections/${sectionId}/lessons`, {
          method: "POST",
          body: JSON.stringify({
            title: lessonDraft.title.trim(),
            video_key: lessonDraft.video_key.trim() || null,
            duration_sec: Math.round((Number(lessonDraft.duration_min) || 0) * 60),
          }),
        }),
      "Lesson added."
    );
    if (ok) {
      setLessonDraft({ title: "", video_key: "", duration_min: "" });
      setLessonFor("");
    }
  };

  const attachVideo = async (lessonId: string) => {
    const key = window.prompt("Storage key of the video (e.g. videos/lesson-01.mp4):");
    if (key === null) return;
    await run(
      `video-${lessonId}`,
      () =>
        adminFetch(`/admin/lessons/${lessonId}`, {
          method: "PATCH",
          body: JSON.stringify({ video_key: key.trim() || null }),
        }),
      "Video attached to the lesson."
    );
  };

  const uploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedFile) return;
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const stored = await uploadFile(pickedFile);
      await adminFetch("/admin/materials", {
        method: "POST",
        body: JSON.stringify({
          course_id: id,
          lesson_id: materialLesson || null,
          title: stored.title,
          storage_key: stored.storage_key,
          mime: stored.mime,
          size_bytes: stored.size_bytes,
        }),
      });
      setPickedFile(null);
      const input = document.getElementById("ad-course-file") as HTMLInputElement | null;
      if (input) input.value = "";
      course.reload();
      setNotice("File attached to this course.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not upload the file.");
    } finally {
      setBusy("");
    }
  };

  const openMaterial = async (materialId: string) => {
    setError("");
    try {
      const r = await adminFetch<{ url: string }>(`/files/course-material/${materialId}`);
      window.open(r.url, "_blank", "noopener");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open the file.");
    }
  };

  const saveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    if (meta.title) body.title = meta.title;
    if (meta.slug) body.slug = meta.slug;
    if (meta.level) body.level = meta.level;
    if (meta.price !== "") body.price_kobo = Math.round(Number(meta.price) * 100);
    if (!Object.keys(body).length) return;
    const ok = await run("meta", () => adminFetch(`/admin/courses/${id}`, { method: "PATCH", body: JSON.stringify(body) }), "Course details saved.");
    if (ok) setMeta({ title: "", slug: "", price: "", level: "" });
  };

  const deleteCourse = async () => {
    setBusy("delete");
    setError("");
    try {
      await adminFetch(`/admin/courses/${id}`, { method: "DELETE" });
      window.location.href = "/courses";
    } catch (e: unknown) {
      /* The API answers 409 when learners are enrolled, so the admin has to
         confirm the real consequence — losing access — explicitly. */
      const msg = e instanceof Error ? e.message : "Could not delete the course.";
      setError(msg);
      setBusy("");
      if (msg.includes("enrolled")) {
        if (window.confirm(`${msg}\n\nDelete anyway?`)) {
          await adminFetch(`/admin/courses/${id}?force=true`, { method: "DELETE" })
            .then(() => {
              window.location.href = "/courses";
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not delete the course."));
        }
      }
    }
  };

  return (
    <Shell>
      <PageHead
        title={c?.title ?? "Course"}
        sub={c ? `${c.level} · ${money(c.price_kobo, c.currency)} · ${c.enrolled} enrolled · created ${shortDate(c.created_at)}` : "Sections, lessons and files."}
        actions={
          <>
            <Link className="ad-btn ad-btn-ghost" href="/courses">
              <Icon name="arrowLeft" size={14} /> All courses
            </Link>
            <button type="button" className="ad-btn ad-btn-ghost" onClick={() => course.reload()}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => setError("")} /> : null}
      {notice ? (
        <Alert tone="ok" icon="check">
          {notice}
        </Alert>
      ) : null}
      {course.error ? <ErrorNote message={course.error} onRetry={course.reload} /> : null}
      {course.loading && !c ? <Skeleton height={160} count={3} /> : null}

      {c ? (
        <>
          <div className="ad-grid ad-grid-3">
            <div className="ad-card">
              <p className="ad-sec-title">Status</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <StatusBadge status={c.is_published ? "published" : "draft"} />
                <Badge>{c.sections?.length ?? 0} sections</Badge>
                <Badge>{lessons.length} lessons</Badge>
                <Badge>{c.materials?.length ?? 0} files</Badge>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="ad-btn ad-btn-primary ad-btn-sm"
                  disabled={busy === "publish"}
                  onClick={() =>
                    run(
                      "publish",
                      () =>
                        adminFetch(`/admin/courses/${id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ is_published: !c.is_published }),
                        }),
                      c.is_published ? "Course unpublished." : "Course published — it is now in the catalog."
                    )
                  }
                >
                  <Icon name={c.is_published ? "eye" : "check"} size={13} />
                  {c.is_published ? "Unpublish" : "Publish"}
                </button>
                <DangerButton
                  label="Delete course"
                  confirmLabel="Confirm delete"
                  pending={busy === "delete"}
                  onConfirm={deleteCourse}
                />
              </div>
            </div>

            <div className="ad-card" style={{ gridColumn: "span 2" }}>
              <p className="ad-sec-title">Course details</p>
              <p className="ad-sm ad-muted" style={{ marginTop: 4 }}>
                Leave a field blank to keep the current value.
              </p>
              <form onSubmit={saveMeta} style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <div className="ad-grid ad-grid-2">
                  <Field label="Title" id="ad-c-title">
                    <input id="ad-c-title" className="ad-input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder={c.title} />
                  </Field>
                  <Field label="Slug" id="ad-c-slug">
                    <input id="ad-c-slug" className="ad-input" value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} placeholder={c.slug} />
                  </Field>
                  <Field label="Level" id="ad-c-level">
                    <select id="ad-c-level" className="ad-select" value={meta.level} onChange={(e) => setMeta({ ...meta, level: e.target.value })}>
                      <option value="">Keep current ({c.level})</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </Field>
                  <Field label="Price" id="ad-c-price" hint={`Current: ${money(c.price_kobo, c.currency)}`}>
                    <input id="ad-c-price" className="ad-input" type="number" min={0} step="0.01" value={meta.price} onChange={(e) => setMeta({ ...meta, price: e.target.value })} placeholder={(c.price_kobo / 100).toString()} />
                  </Field>
                </div>
                <div>
                  <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "meta"}>
                    <Icon name="check" size={14} /> {busy === "meta" ? "Saving…" : "Save details"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ---------- curriculum ---------- */}
          <div className="ad-card" style={{ marginTop: 16 }}>
            <SectionHead title="Add a section" />
            <form onSubmit={addSection} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px" }}>
                <Field label="Section title" id="ad-section-title">
                  <input id="ad-section-title" className="ad-input" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Getting started" />
                </Field>
              </div>
              <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "section" || !sectionTitle.trim()}>
                <Icon name="plus" size={14} /> {busy === "section" ? "Adding…" : "Add section"}
              </button>
            </form>
          </div>

          <SectionHead title="Curriculum" count={c.sections?.length ?? 0} />
          {(c.sections ?? []).length === 0 ? (
            <EmptyState icon="layers" title="No sections yet" body="Add a section above, then add lessons and videos inside it." />
          ) : (
            <div className="ad-stack">
              {(c.sections ?? []).map((s) => (
                <div className="ad-card ad-card-pad-0" key={s.id}>
                  <div className="ad-card-head">
                    <Icon name="layers" size={16} />
                    <span className="ad-card-title">{s.title}</span>
                    <Badge>{s.lessons?.length ?? 0} lessons</Badge>
                    <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="ad-btn ad-btn-ghost ad-btn-sm"
                        onClick={() => setLessonFor(lessonFor === s.id ? "" : s.id)}
                        aria-expanded={lessonFor === s.id}
                      >
                        <Icon name="plus" size={13} /> Lesson
                      </button>
                      <DangerButton
                        label="Delete section"
                        confirmLabel="Confirm delete"
                        pending={busy === `del-${s.id}`}
                        onConfirm={() =>
                          run(`del-${s.id}`, () => adminFetch(`/admin/sections/${s.id}`, { method: "DELETE" }), "Section deleted.")
                        }
                      />
                    </span>
                  </div>

                  {lessonFor === s.id ? (
                    <form onSubmit={(e) => addLesson(e, s.id)} style={{ padding: 16, borderBottom: "1px solid var(--ad-border)", display: "grid", gap: 12 }}>
                      <div className="ad-grid ad-grid-3">
                        <Field label="Lesson title" id={`ad-l-title-${s.id}`}>
                          <input
                            id={`ad-l-title-${s.id}`}
                            className="ad-input"
                            value={lessonDraft.title}
                            onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })}
                            placeholder="Welcome and setup"
                          />
                        </Field>
                        <Field label="Video key (optional)" id={`ad-l-video-${s.id}`} hint="Storage key, e.g. videos/welcome.mp4">
                          <input
                            id={`ad-l-video-${s.id}`}
                            className="ad-input"
                            value={lessonDraft.video_key}
                            onChange={(e) => setLessonDraft({ ...lessonDraft, video_key: e.target.value })}
                          />
                        </Field>
                        <Field label="Duration (minutes)" id={`ad-l-dur-${s.id}`}>
                          <input
                            id={`ad-l-dur-${s.id}`}
                            className="ad-input"
                            type="number"
                            min={0}
                            value={lessonDraft.duration_min}
                            onChange={(e) => setLessonDraft({ ...lessonDraft, duration_min: e.target.value })}
                          />
                        </Field>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" className="ad-btn ad-btn-primary ad-btn-sm" disabled={busy === `lesson-${s.id}`}>
                          <Icon name="plus" size={13} /> Add lesson
                        </button>
                        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setLessonFor("")}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {(s.lessons ?? []).length === 0 ? (
                    <p className="ad-sm ad-muted" style={{ padding: 16 }}>
                      No lessons in this section yet.
                    </p>
                  ) : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <caption className="ad-sr-only">Lessons in {s.title}</caption>
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Lesson</th>
                            <th scope="col">Duration</th>
                            <th scope="col">Video</th>
                            <th scope="col">
                              <span className="ad-sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(s.lessons ?? []).map((l, i) => (
                            <tr key={l.id}>
                              <td className="ad-muted">{i + 1}</td>
                              <td className="ad-row-title">{l.title}</td>
                              <td className="ad-muted">{durationMin(l.duration_sec)}</td>
                              <td>
                                {l.video_key ? <Badge tone="ok">Attached</Badge> : <Badge tone="warn">None</Badge>}
                              </td>
                              <td>
                                <span className="ad-row-actions">
                                  <button
                                    type="button"
                                    className="ad-btn ad-btn-ghost ad-btn-sm"
                                    onClick={() => attachVideo(l.id)}
                                  >
                                    <Icon name="video" size={13} /> {l.video_key ? "Replace" : "Attach"}
                                  </button>
                                  <DangerButton
                                    label="Delete"
                                    confirmLabel="Confirm delete"
                                    pending={busy === `del-l-${l.id}`}
                                    onConfirm={() =>
                                      run(`del-l-${l.id}`, () => adminFetch(`/admin/lessons/${l.id}`, { method: "DELETE" }), "Lesson deleted.")
                                    }
                                  />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ---------- files ---------- */}
          <div className="ad-card" style={{ marginTop: 16 }}>
            <SectionHead title="Attach a file to this course" />
            <form onSubmit={uploadMaterial} style={{ display: "grid", gap: 12 }}>
              <div className="ad-grid ad-grid-2">
                <Field label="File" id="ad-course-file" hint="Up to 200 MB.">
                  <input id="ad-course-file" className="ad-input" type="file" onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)} />
                </Field>
                <Field label="Attach to lesson (optional)" id="ad-course-lesson">
                  <select id="ad-course-lesson" className="ad-select" value={materialLesson} onChange={(e) => setMaterialLesson(e.target.value)}>
                    <option value="">Whole course</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={!pickedFile || busy === "upload"}>
                  <Icon name="upload" size={14} /> {busy === "upload" ? "Uploading…" : "Upload file"}
                </button>
              </div>
            </form>
          </div>

          <SectionHead title="Files" count={(c.materials ?? []).length} />
          {(c.materials ?? []).length === 0 ? (
            <EmptyState icon="folder" title="No files yet" body="Attach a workbook, slide deck or dataset to this course." />
          ) : (
            <div className="ad-card ad-card-pad-0">
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <caption className="ad-sr-only">Files attached to this course</caption>
                  <thead>
                    <tr>
                      <th scope="col">File</th>
                      <th scope="col">Type</th>
                      <th scope="col">Size</th>
                      <th scope="col">Added</th>
                      <th scope="col">
                        <span className="ad-sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(c.materials ?? []).map((m) => (
                      <tr key={m.id}>
                        <td className="ad-row-title">{m.title}</td>
                        <td className="ad-muted ad-mono">{m.mime}</td>
                        <td className="ad-muted">{bytes(m.size_bytes)}</td>
                        <td className="ad-muted">{shortDate(m.created_at)}</td>
                        <td>
                          <span className="ad-row-actions">
                            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => openMaterial(m.id)}>
                              <Icon name="download" size={13} /> Open
                            </button>
                            <DangerButton
                              label="Delete"
                              confirmLabel="Confirm delete"
                              pending={busy === `m-${m.id}`}
                              onConfirm={() =>
                                run(`m-${m.id}`, () => adminFetch(`/admin/materials/course/${m.id}`, { method: "DELETE" }), "File removed.")
                              }
                            />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </Shell>
  );
}
