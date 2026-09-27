"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Alert, Badge, DangerButton, EmptyState, ErrorNote, Field, PageHead, SectionHead, Skeleton } from "@/components/ui";
import { adminFetch, bytes, shortDate } from "@/lib/admin";
import { uploadFile } from "@/lib/upload";
import { useAdmin } from "@/lib/use-admin";
import type { Classroom, Course, CourseMaterial, ClassroomMaterial } from "@/lib/admin-types";

/*
  Materials library.

  The previous version asked the admin to type an R2 storage key by hand — there
  was no way to actually put a file into storage, so this form only worked for
  someone who had uploaded the bytes elsewhere first. It now uploads for real:

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
  const [msg, setMsg] = useState("");

  const classroomFiles = library.data?.classroom ?? [];
  const courseFiles = library.data?.courses ?? [];

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !destId) return;
    setBusy("upload");
    setErr("");
    setMsg("");
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
      const input = document.getElementById("ad-file") as HTMLInputElement | null;
      if (input) input.value = "";
      library.reload();
      setMsg(
        dest === "classroom" && notify
          ? "File uploaded and every member notified."
          : "File uploaded."
      );
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
    try {
      await adminFetch(`/admin/materials/${scope}/${id}`, { method: "DELETE" });
      library.reload();
      setMsg("File removed.");
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

  return (
    <Shell>
      <PageHead
        title="Materials"
        sub="Upload files and place each one in a single destination — a classroom (members only) or a course (buyers only)."
        actions={
          <button type="button" className="ad-btn ad-btn-ghost" onClick={() => library.reload()}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        }
      />

      {err ? <ErrorNote message={err} onRetry={() => setErr("")} /> : null}
      {msg ? (
        <Alert tone="ok" icon="check">
          {msg}
        </Alert>
      ) : null}

      <div className="ad-card">
        <SectionHead title="Upload a file" />
        <form onSubmit={upload} style={{ display: "grid", gap: 12 }}>
          <div className="ad-tabs" role="tablist" aria-label="Destination type" style={{ marginBottom: 0 }}>
            {(["classroom", "course"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={dest === d}
                tabIndex={dest === d ? 0 : -1}
                className="ad-tab"
                onClick={() => {
                  setDest(d);
                  setDestId("");
                }}
              >
                <Icon name={d === "classroom" ? "layers" : "bookOpen"} size={15} />
                {d === "classroom" ? "To a classroom (members only)" : "To a course (buyers only)"}
              </button>
            ))}
          </div>

          <div className="ad-grid ad-grid-2">
            <Field label={dest === "classroom" ? "Destination classroom" : "Destination course"} id="ad-dest">
              <select id="ad-dest" className="ad-select" value={destId} onChange={(e) => setDestId(e.target.value)} required>
                <option value="">Select…</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="File" id="ad-file" hint="Up to 200 MB.">
              <input
                id="ad-file"
                className="ad-input"
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </div>

          {dest === "classroom" ? (
            <label className="ad-sm ad-muted" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Notify every member of the classroom when the file is ready
            </label>
          ) : null}

          <div>
            <button type="submit" className="ad-btn ad-btn-primary" disabled={!file || !destId || busy === "upload"}>
              <Icon name="upload" size={14} /> {busy === "upload" ? "Uploading…" : "Upload & save"}
            </button>
          </div>
        </form>
      </div>

      {library.error ? <ErrorNote message={library.error} onRetry={library.reload} /> : null}

      <SectionHead title="Classroom files" count={classroomFiles.length} />
      {library.loading && classroomFiles.length === 0 ? (
        <Skeleton height={52} count={3} />
      ) : classroomFiles.length === 0 ? (
        <EmptyState icon="folder" title="No classroom files" body="Upload one above, or from inside a classroom." />
      ) : (
        <div className="ad-card ad-card-pad-0">
          <div className="ad-table-wrap">
            <table className="ad-table">
              <caption className="ad-sr-only">Files attached to classrooms</caption>
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Classroom</th>
                  <th scope="col">Size</th>
                  <th scope="col">Added</th>
                  <th scope="col">
                    <span className="ad-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {classroomFiles.map((m) => (
                  <tr key={m.id}>
                    <td className="ad-row-title">{m.title}</td>
                    <td className="ad-muted">{m.classroom_title ?? "—"}</td>
                    <td className="ad-muted">{bytes(m.size_bytes)}</td>
                    <td className="ad-muted">{shortDate(m.created_at)}</td>
                    <td>
                      <span className="ad-row-actions">
                        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => open(m.id, "classroom")}>
                          <Icon name="download" size={13} /> Open
                        </button>
                        <DangerButton
                          label="Delete"
                          confirmLabel="Confirm delete"
                          pending={busy === `del-${m.id}`}
                          onConfirm={() => remove(m.id, "classroom")}
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

      <SectionHead title="Course files" count={courseFiles.length} />
      {courseFiles.length === 0 ? (
        <EmptyState icon="bookOpen" title="No course files" body="Upload one above, or from inside a course editor." />
      ) : (
        <div className="ad-card ad-card-pad-0">
          <div className="ad-table-wrap">
            <table className="ad-table">
              <caption className="ad-sr-only">Files attached to courses</caption>
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Course</th>
                  <th scope="col">Size</th>
                  <th scope="col">Added</th>
                  <th scope="col">
                    <span className="ad-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {courseFiles.map((m) => (
                  <tr key={m.id}>
                    <td className="ad-row-title">{m.title}</td>
                    <td className="ad-muted">
                      {m.course_id ? (
                        <Link className="ad-row-title" href={`/courses/${m.course_id}`}>
                          {m.course_title ?? "Open course"}
                        </Link>
                      ) : (
                        (m.course_title ?? "—")
                      )}
                    </td>
                    <td className="ad-muted">{bytes(m.size_bytes)}</td>
                    <td className="ad-muted">{shortDate(m.created_at)}</td>
                    <td>
                      <span className="ad-row-actions">
                        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => open(m.id, "course")}>
                          <Icon name="download" size={13} /> Open
                        </button>
                        <DangerButton
                          label="Delete"
                          confirmLabel="Confirm delete"
                          pending={busy === `del-${m.id}`}
                          onConfirm={() => remove(m.id, "course")}
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
    </Shell>
  );
}
