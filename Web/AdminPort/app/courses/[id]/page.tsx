"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, Sk, ToastHost, toast } from "@/components/reb-ui";
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
*/

export default function CourseEditorPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const course = useAdmin<CourseDetail>(`/admin/courses/${id}`);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmKey, setConfirmKey] = useState("");

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
    setConfirmKey("");
    try {
      await fn();
      course.reload();
      toast(ok);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "That action failed.");
      return false;
    } finally {
      setBusy("");
    }
  };

  /** Two-step destructive button, shared confirm state. */
  const del = (key: string, label: string, onConfirm: () => void, pendingLabel = "Working…") =>
    confirmKey === key ? (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button type="button" className="reb-btn danger sm" disabled={busy === key} onClick={onConfirm}>
          {busy === key ? pendingLabel : "Confirm delete"}
        </button>
        <button type="button" className="reb-btn ghost sm" onClick={() => setConfirmKey("")}>
          Keep
        </button>
      </span>
    ) : (
      <button type="button" className="reb-btn ghost sm" onClick={() => setConfirmKey(key)} aria-label={label}>
        <Ic name="trash" size={13} />
      </button>
    );

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
      "Section added"
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
      "Lesson added"
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
      "Video attached to the lesson"
    );
  };

  const uploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedFile) return;
    setBusy("upload");
    setError("");
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
      const input = document.getElementById("ce-course-file") as HTMLInputElement | null;
      if (input) input.value = "";
      course.reload();
      toast("File attached to this course");
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
    const ok = await run(
      "meta",
      () => adminFetch(`/admin/courses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      "Course details saved"
    );
    if (ok) setMeta({ title: "", slug: "", price: "", level: "" });
  };

  const deleteCourse = async () => {
    setBusy("delete");
    setError("");
    setConfirmKey("");
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
      <Ph
        title={c?.title ?? "Course"}
        sub={
          c
            ? `${c.level} · ${money(c.price_kobo, c.currency)} · ${c.enrolled} enrolled · created ${shortDate(c.created_at)}`
            : "Sections, lessons and files."
        }
        actions={
          <>
            <Link className="reb-btn ghost sm" href="/courses">
              <Ic name="arrowLeft" size={14} /> All courses
            </Link>
            <button type="button" className="reb-btn ghost sm" onClick={() => course.reload()}>
              <Ic name="refresh" size={14} /> Refresh
            </button>
          </>
        }
      />

      {error ? <Err msg={error} onRetry={() => setError("")} /> : null}
      {course.error ? <Err msg={course.error} onRetry={course.reload} /> : null}
      {course.loading && !c ? <Sk h={150} mb={10} /> : null}

      {c ? (
        <>
          {/* ---------- status + details ---------- */}
          <div className="kgrid" style={{ marginBottom: 16 }}>
            <div className="reb-card">
              <SecHead icon="activity" title="Status" />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <Badge tone={c.is_published ? "ok" : ""}>{c.is_published ? "published" : "draft"}</Badge>
                <Badge tone="info">{c.sections?.length ?? 0} sections</Badge>
                <Badge tone="info">{lessons.length} lessons</Badge>
                <Badge tone="info">{c.materials?.length ?? 0} files</Badge>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="reb-btn pri sm"
                  disabled={busy === "publish"}
                  onClick={() =>
                    run(
                      "publish",
                      () =>
                        adminFetch(`/admin/courses/${id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ is_published: !c.is_published }),
                        }),
                      c.is_published ? "Course unpublished" : "Course published — it is now in the catalog"
                    )
                  }
                >
                  <Ic name={c.is_published ? "eye" : "check"} size={13} />
                  {c.is_published ? "Unpublish" : "Publish"}
                </button>
                {confirmKey === "course" ? (
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      type="button"
                      className="reb-btn danger sm"
                      disabled={busy === "delete"}
                      onClick={deleteCourse}
                    >
                      {busy === "delete" ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button type="button" className="reb-btn ghost sm" onClick={() => setConfirmKey("")}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button type="button" className="reb-btn ghost sm" onClick={() => setConfirmKey("course")}>
                    <Ic name="trash" size={13} /> Delete course
                  </button>
                )}
              </div>
            </div>

            <div className="reb-card">
              <SecHead icon="edit" title="Course details" />
              <p className="hint" style={{ marginTop: -6, marginBottom: 10 }}>
                Leave a field blank to keep the current value.
              </p>
              <form onSubmit={saveMeta} style={{ display: "grid", gap: 10 }}>
                <div className="kgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="kind" htmlFor="ce-title">
                      Title
                    </label>
                    <input
                      id="ce-title"
                      className="reb-input"
                      value={meta.title}
                      onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                      placeholder={c.title}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="kind" htmlFor="ce-slug">
                      Slug
                    </label>
                    <input
                      id="ce-slug"
                      className="reb-input"
                      value={meta.slug}
                      onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
                      placeholder={c.slug}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="kind" htmlFor="ce-level">
                      Level
                    </label>
                    <select
                      id="ce-level"
                      className="select"
                      value={meta.level}
                      onChange={(e) => setMeta({ ...meta, level: e.target.value })}
                    >
                      <option value="">Keep current ({c.level})</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="kind" htmlFor="ce-price">
                      Price
                    </label>
                    <input
                      id="ce-price"
                      className="reb-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={meta.price}
                      onChange={(e) => setMeta({ ...meta, price: e.target.value })}
                      placeholder={(c.price_kobo / 100).toString()}
                    />
                    <span className="hint">Current: {money(c.price_kobo, c.currency)}</span>
                  </div>
                </div>
                <div>
                  <button type="submit" className="reb-btn pri" disabled={busy === "meta"}>
                    <Ic name="check" size={14} /> {busy === "meta" ? "Saving…" : "Save details"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ---------- curriculum ---------- */}
          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="plus" title="Add a section" />
            <form onSubmit={addSection} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px" }}>
                <label className="kind" htmlFor="ce-section-title">
                  Section title
                </label>
                <input
                  id="ce-section-title"
                  className="reb-input"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="Getting started"
                />
              </div>
              <button
                type="submit"
                className="reb-btn pri"
                disabled={busy === "section" || !sectionTitle.trim()}
              >
                <Ic name="plus" size={14} /> {busy === "section" ? "Adding…" : "Add section"}
              </button>
            </form>
          </section>

          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="layers" title={`Curriculum · ${c.sections?.length ?? 0} sections`} />
            {(c.sections ?? []).length === 0 ? (
              <Emp
                icon="layers"
                title="No sections yet"
                note="Add a section above, then add lessons and videos inside it."
              />
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {(c.sections ?? []).map((s) => (
                  <div key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        background: "var(--surface2)",
                        borderBottom: "1px solid var(--border)",
                        flexWrap: "wrap",
                      }}
                    >
                      <Ic name="layers" size={15} />
                      <b style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{s.title}</b>
                      <Badge tone="info">{s.lessons?.length ?? 0} lessons</Badge>
                      <button
                        type="button"
                        className="reb-btn ghost sm"
                        onClick={() => setLessonFor(lessonFor === s.id ? "" : s.id)}
                        aria-expanded={lessonFor === s.id}
                      >
                        <Ic name="plus" size={13} /> Lesson
                      </button>
                      {del(`sec-${s.id}`, `Delete section ${s.title}`, () =>
                        run(`sec-${s.id}`, () => adminFetch(`/admin/sections/${s.id}`, { method: "DELETE" }), "Section deleted")
                      )}
                    </div>

                    {lessonFor === s.id ? (
                      <form
                        onSubmit={(e) => addLesson(e, s.id)}
                        style={{ padding: 14, borderBottom: "1px solid var(--border)", display: "grid", gap: 10 }}
                      >
                        <div className="kgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="kind" htmlFor={`ce-l-title-${s.id}`}>
                              Lesson title
                            </label>
                            <input
                              id={`ce-l-title-${s.id}`}
                              className="reb-input"
                              value={lessonDraft.title}
                              onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })}
                              placeholder="Welcome and setup"
                            />
                          </div>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="kind" htmlFor={`ce-l-video-${s.id}`}>
                              Video key (optional)
                            </label>
                            <input
                              id={`ce-l-video-${s.id}`}
                              className="reb-input"
                              value={lessonDraft.video_key}
                              onChange={(e) => setLessonDraft({ ...lessonDraft, video_key: e.target.value })}
                              placeholder="videos/welcome.mp4"
                            />
                          </div>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="kind" htmlFor={`ce-l-dur-${s.id}`}>
                              Duration (minutes)
                            </label>
                            <input
                              id={`ce-l-dur-${s.id}`}
                              className="reb-input"
                              type="number"
                              min={0}
                              value={lessonDraft.duration_min}
                              onChange={(e) => setLessonDraft({ ...lessonDraft, duration_min: e.target.value })}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="submit"
                            className="reb-btn pri sm"
                            disabled={busy === `lesson-${s.id}`}
                          >
                            <Ic name="plus" size={13} /> Add lesson
                          </button>
                          <button type="button" className="reb-btn ghost sm" onClick={() => setLessonFor("")}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {(s.lessons ?? []).length === 0 ? (
                      <p className="hint" style={{ padding: 14, margin: 0 }}>
                        No lessons in this section yet.
                      </p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table className="tbl">
                          <caption style={{ display: "none" }}>Lessons in {s.title}</caption>
                          <thead>
                            <tr>
                              <th scope="col">#</th>
                              <th scope="col">Lesson</th>
                              <th scope="col">Duration</th>
                              <th scope="col">Video</th>
                              <th scope="col">
                                <span>Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(s.lessons ?? []).map((l, i) => (
                              <tr key={l.id}>
                                <td className="hint">{i + 1}</td>
                                <td>
                                  <b>{l.title}</b>
                                </td>
                                <td className="hint">{durationMin(l.duration_sec)}</td>
                                <td>
                                  {l.video_key ? <Badge tone="ok">Attached</Badge> : <Badge tone="warn">None</Badge>}
                                </td>
                                <td>
                                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                    <button
                                      type="button"
                                      className="reb-btn ghost sm"
                                      onClick={() => void attachVideo(l.id)}
                                    >
                                      <Ic name="video" size={13} /> {l.video_key ? "Replace" : "Attach"}
                                    </button>
                                    {del(`les-${l.id}`, `Delete lesson ${l.title}`, () =>
                                      run(`les-${l.id}`, () => adminFetch(`/admin/lessons/${l.id}`, { method: "DELETE" }), "Lesson deleted")
                                    )}
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
          </section>

          {/* ---------- files ---------- */}
          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="upload" title="Attach a file to this course" />
            <form onSubmit={uploadMaterial} style={{ display: "grid", gap: 10 }}>
              <div className="kgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="kind" htmlFor="ce-course-file">
                    File
                  </label>
                  <input
                    id="ce-course-file"
                    className="reb-input"
                    type="file"
                    onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="hint">Up to 200 MB.</span>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="kind" htmlFor="ce-course-lesson">
                    Attach to lesson (optional)
                  </label>
                  <select
                    id="ce-course-lesson"
                    className="select"
                    value={materialLesson}
                    onChange={(e) => setMaterialLesson(e.target.value)}
                  >
                    <option value="">Whole course</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button type="submit" className="reb-btn pri" disabled={!pickedFile || busy === "upload"}>
                  <Ic name="upload" size={14} /> {busy === "upload" ? "Uploading…" : "Upload file"}
                </button>
              </div>
            </form>
          </section>

          <section className="reb-card">
            <SecHead icon="folder" title={`Files · ${(c.materials ?? []).length}`} />
            {(c.materials ?? []).length === 0 ? (
              <Emp
                icon="folder"
                title="No files yet"
                note="Attach a workbook, slide deck or dataset to this course."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <caption style={{ display: "none" }}>Files attached to this course</caption>
                  <thead>
                    <tr>
                      <th scope="col">File</th>
                      <th scope="col">Type</th>
                      <th scope="col">Size</th>
                      <th scope="col">Added</th>
                      <th scope="col">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(c.materials ?? []).map((m) => (
                      <tr key={m.id}>
                        <td>
                          <b>{m.title}</b>
                        </td>
                        <td className="hint">{m.mime}</td>
                        <td className="hint">{bytes(m.size_bytes)}</td>
                        <td className="hint">{shortDate(m.created_at)}</td>
                        <td>
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <button type="button" className="reb-btn ghost sm" onClick={() => void openMaterial(m.id)}>
                              <Ic name="download" size={13} /> Open
                            </button>
                            {del(`mat-${m.id}`, `Delete file ${m.title}`, () =>
                              run(`mat-${m.id}`, () => adminFetch(`/admin/materials/course/${m.id}`, { method: "DELETE" }), "File removed")
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
      <ToastHost />
    </Shell>
  );
}
