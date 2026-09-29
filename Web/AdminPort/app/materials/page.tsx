"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, Sk, ToastHost, toast } from "@/components/reb-ui";
import { adminFetch, bytes, shortDate } from "@/lib/admin";
import { uploadFile } from "@/lib/upload";
import { useAdmin } from "@/lib/use-admin";
import type { Classroom, Course, CourseMaterial, ClassroomMaterial } from "@/lib/admin-types";

/*
  Materials library.

  Uploads for real:
    POST   /admin/uploads                     -> { storage_key, title, mime, size_bytes }
    POST   /admin/materials                   -> register against a classroom OR a course
    DELETE /admin/materials/classroom/:id
    DELETE /admin/materials/course/:id
    GET    /files/classroom-material/:id      -> 15-minute signed URL
    GET    /files/course-material/:id

  The API's own rule is preserved: exactly one destination, never both.
*/

type Dest = "classroom" | "course";

export default function MaterialsPage() {
  const library = useAdmin<{ classroom: ClassroomMaterial[]; courses: CourseMaterial[] }>("/admin/materials");
  const rooms = useAdmin<Classroom[]>("/admin/classrooms");
  const courses = useAdmin<Course[]>("/admin/courses");

  const [dest, setDest] = useState<Dest>("classroom");
  const [destId, setDestId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [confirmId, setConfirmId] = useState("");

  const classroomFiles = library.data?.classroom ?? [];
  const courseFiles = library.data?.courses ?? [];

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !destId) return;
    setBusy("upload");
    setErr("");
    try {
      const stored = await uploadFile(file);
      const created = await adminFetch<{ id: string }>("/admin/materials", {
        method: "POST",
        body: JSON.stringify({
          [dest === "classroom" ? "classroom_id" : "course_id"]: destId,
          title: stored.title,
          storage_key: stored.storage_key,
          mime: stored.mime,
          size_bytes: stored.size_bytes,
        }),
      });
      /* Only classroom materials have a notify endpoint — a course file is
         announced by publishing the course. */
      if (dest === "classroom" && notify) {
        await adminFetch(`/admin/materials/classroom/${created.id}/notify`, { method: "POST" }).catch(() => null);
      }
      setFile(null);
      const input = document.getElementById("mt-file") as HTMLInputElement | null;
      if (input) input.value = "";
      library.reload();
      toast(dest === "classroom" && notify ? "Uploaded — every member notified" : "File uploaded");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not upload the file.");
    } finally {
      setBusy("");
    }
  };

  const open = async (id: string, scope: "classroom" | "course") => {
    setErr("");
    try {
      const r = await adminFetch<{ url: string }>(
        scope === "classroom" ? `/files/classroom-material/${id}` : `/files/course-material/${id}`
      );
      window.open(r.url, "_blank", "noopener");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not open the file.");
    }
  };

  const remove = async (id: string, scope: "classroom" | "course") => {
    setBusy(`del-${id}`);
    setErr("");
    setConfirmId("");
    try {
      await adminFetch(`/admin/materials/${scope}/${id}`, { method: "DELETE" });
      library.reload();
      toast("File removed");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not remove the file.");
    } finally {
      setBusy("");
    }
  };

  const destinations: { id: string; title: string }[] =
    dest === "classroom"
      ? (rooms.data ?? []).map((c) => ({ id: c.id, title: c.title }))
      : (courses.data ?? []).map((c) => ({ id: c.id, title: c.title }));

  const delBtn = (id: string, scope: "classroom" | "course", title: string) =>
    confirmId === id ? (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button
          type="button"
          className="reb-btn danger sm"
          disabled={busy === `del-${id}`}
          onClick={() => remove(id, scope)}
        >
          {busy === `del-${id}` ? "Deleting…" : "Confirm delete"}
        </button>
        <button type="button" className="reb-btn ghost sm" onClick={() => setConfirmId("")}>
          Keep
        </button>
      </span>
    ) : (
      <button
        type="button"
        className="reb-btn ghost sm"
        onClick={() => setConfirmId(id)}
        aria-label={`Delete ${title}`}
      >
        <Ic name="trash" size={13} />
      </button>
    );

  const filesTable = (rows: (ClassroomMaterial | CourseMaterial)[], scope: "classroom" | "course") => (
    <div style={{ overflowX: "auto" }}>
      <table className="tbl">
        <caption style={{ display: "none" }}>
          {scope === "classroom" ? "Files attached to classrooms" : "Files attached to courses"}
        </caption>
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">{scope === "classroom" ? "Classroom" : "Course"}</th>
            <th scope="col">Size</th>
            <th scope="col">Added</th>
            <th scope="col">
              <span>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td>
                <b>{m.title}</b>
              </td>
              <td className="hint">
                {scope === "classroom"
                  ? ((m as ClassroomMaterial).classroom_title ?? "—")
                  : (m as CourseMaterial).course_id ? (
                      <Link href={`/courses/${(m as CourseMaterial).course_id}`} style={{ color: "var(--brand-text)" }}>
                        {(m as CourseMaterial).course_title ?? "Open course"}
                      </Link>
                    ) : (
                      ((m as CourseMaterial).course_title ?? "—")
                    )}
              </td>
              <td className="hint">{bytes(m.size_bytes)}</td>
              <td className="hint">{shortDate(m.created_at)}</td>
              <td>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" className="reb-btn ghost sm" onClick={() => open(m.id, scope)}>
                    <Ic name="download" size={13} /> Open
                  </button>
                  {delBtn(m.id, scope, m.title)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Shell>
      <Ph
        title="Materials"
        sub="Upload files and place each one in a single destination — a classroom (members only) or a course (buyers only)."
        actions={
          <button type="button" className="reb-btn ghost sm" onClick={() => library.reload()}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        }
      />

      {err ? <Err msg={err} onRetry={() => setErr("")} /> : null}

      <section className="reb-card" style={{ marginBottom: 18 }}>
        <SecHead icon="upload" title="Upload a file" />
        <form onSubmit={upload} style={{ display: "grid", gap: 12 }}>
          <div className="tabs" role="tablist" aria-label="Destination type" style={{ marginBottom: 0 }}>
            {(["classroom", "course"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={dest === d}
                className={dest === d ? "on" : undefined}
                onClick={() => {
                  setDest(d);
                  setDestId("");
                }}
              >
                <Ic name={d === "classroom" ? "layers" : "bookOpen"} size={15} />
                {d === "classroom" ? "To a classroom (members only)" : "To a course (buyers only)"}
              </button>
            ))}
          </div>

          <div className="kgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div className="field">
              <label className="kind" htmlFor="mt-dest">
                {dest === "classroom" ? "Destination classroom" : "Destination course"}
              </label>
              <select
                id="mt-dest"
                className="select"
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="kind" htmlFor="mt-file">
                File
              </label>
              <input
                id="mt-file"
                className="reb-input"
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="hint">Up to 200 MB.</span>
            </div>
          </div>

          {dest === "classroom" ? (
            <label className="hint" style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Notify every member of the classroom when the file is ready
            </label>
          ) : null}

          <div>
            <button
              type="submit"
              className="reb-btn pri"
              disabled={!file || !destId || busy === "upload"}
            >
              <Ic name="upload" size={14} /> {busy === "upload" ? "Uploading…" : "Upload & save"}
            </button>
          </div>
        </form>
      </section>

      {library.error ? <Err msg={library.error} onRetry={library.reload} /> : null}

      <section className="reb-card" style={{ marginBottom: 16 }}>
        <SecHead icon="folder" title={`Classroom files · ${classroomFiles.length}`} />
        {library.loading && classroomFiles.length === 0 ? (
          <Sk h={52} mb={8} />
        ) : classroomFiles.length === 0 ? (
          <Emp icon="folder" title="No classroom files" note="Upload one above, or from inside a classroom." />
        ) : (
          filesTable(classroomFiles, "classroom")
        )}
      </section>

      <section className="reb-card">
        <SecHead icon="bookOpen" title={`Course files · ${courseFiles.length}`} />
        {courseFiles.length === 0 ? (
          <Emp icon="bookOpen" title="No course files" note="Upload one above, or from inside a course editor." />
        ) : (
          filesTable(courseFiles, "course")
        )}
      </section>
      <ToastHost />
    </Shell>
  );
}
