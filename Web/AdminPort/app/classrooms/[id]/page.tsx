"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, Sk, ToastHost, toast } from "@/components/reb-ui";
import { adminFetch, bytes, fileSignedUrl, initials, money, shortDate, shortDateTime } from "@/lib/admin";
import { uploadFile } from "@/lib/upload";
import { useAdmin, useAdminPoll } from "@/lib/use-admin";
import type { ClassroomDetail, ClassroomMessageRow, Session } from "@/lib/admin-types";

/*
  Manage one classroom — Discussion, Members, Sessions, Materials,
  Announcements and Assignments.

  Endpoints:
    GET    /admin/classrooms/:id                 room + members + sessions + materials + announcements + assignments
    PATCH  /admin/classrooms/:id                 publish state (and other room fields)
    GET    /admin/classrooms/:id/messages        the discussion learners read (polled)
    POST   /admin/classrooms/:id/messages        post into it (optional member notification)
    PATCH  /admin/classrooms/:id/messages/:mid   { is_solved } — close an issue
    POST   /admin/classrooms/:id members / DELETE members/:userId
    POST   /admin/sessions + PATCH /admin/sessions/:sid
    POST   /admin/uploads + POST /admin/materials + DELETE /admin/materials/classroom/:id
    GET    /files/classroom-material/:id         15-minute signed URL
    POST   /admin/announcements                  notifies every member
    POST   /admin/assignments
*/

type TabId = "discussion" | "members" | "sessions" | "materials" | "announcements" | "assignments";

const TABS: { id: TabId; label: string; icon: Parameters<typeof Ic>[0]["name"] }[] = [
  { id: "discussion", label: "Discussion", icon: "messageSquare" },
  { id: "members", label: "Members", icon: "users" },
  { id: "sessions", label: "Sessions", icon: "calendar" },
  { id: "materials", label: "Materials", icon: "folder" },
  { id: "announcements", label: "Announcements", icon: "megaphone" },
  { id: "assignments", label: "Assignments", icon: "clipboard" },
];

function statusTone(status: string): "" | "ok" | "warn" | "danger" | "info" {
  if (status === "live" || status === "recording") return "danger";
  if (status === "scheduled" || status === "processing") return "info";
  if (status === "ready") return "ok";
  if (status === "failed") return "warn";
  return "";
}

export default function ManageClassroomPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const detail = useAdmin<ClassroomDetail>(`/admin/classrooms/${id}`);
  const room = detail.data?.classroom;

  const [tab, setTab] = useState<TabId>("discussion");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  /* ---------- discussion ---------- */
  const messages = useAdminPoll<ClassroomMessageRow[]>(`/admin/classrooms/${id}/messages`, 8000);
  const [draft, setDraft] = useState("");
  const [notifyMembers, setNotifyMembers] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);
  const messageCount = (messages.data ?? []).length;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy("send");
    setError("");
    try {
      await adminFetch(`/admin/classrooms/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, notify: notifyMembers }),
      });
      setDraft("");
      setNotifyMembers(false);
      messages.reload();
      toast("Posted to the classroom discussion");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setBusy("");
    }
  };

  const toggleSolved = async (m: ClassroomMessageRow) => {
    setBusy(`sol-${m.id}`);
    setError("");
    try {
      await adminFetch(`/admin/classrooms/${id}/messages/${m.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_solved: !m.is_solved }),
      });
      messages.reload();
      toast(m.is_solved ? "Issue reopened" : "Issue marked solved");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update the issue.");
    } finally {
      setBusy("");
    }
  };

  const openMessageFile = async (m: ClassroomMessageRow) => {
    if (!m.attachment) return;
    setError("");
    try {
      window.open(await fileSignedUrl(`/files/classroom-message/${m.id}`), "_blank", "noopener");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open that attachment.");
    }
  };

  /* ---------- members ---------- */
  const [memberEmail, setMemberEmail] = useState("");
  const [confirmRemove, setConfirmRemove] = useState("");

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = memberEmail.trim();
    if (!email) return;
    setBusy("add");
    setError("");
    try {
      const r = await adminFetch<{ already_enrolled?: boolean }>(`/admin/classrooms/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMemberEmail("");
      detail.reload();
      toast(r?.already_enrolled ? "That learner is already in this classroom" : "Member added and notified");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add that member.");
    } finally {
      setBusy("");
    }
  };

  const removeMember = async (userId: string) => {
    setBusy(`rm-${userId}`);
    setError("");
    setConfirmRemove("");
    try {
      await adminFetch(`/admin/classrooms/${id}/members/${userId}`, { method: "DELETE" });
      detail.reload();
      toast("Member removed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove that member.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- publish ---------- */
  const togglePublish = async () => {
    if (!room) return;
    setBusy("pub");
    setError("");
    try {
      await adminFetch(`/admin/classrooms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !room.is_published }),
      });
      detail.reload();
      toast(room.is_published ? "Classroom unpublished" : "Classroom published to the catalog");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not change the publish state.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- sessions ---------- */
  const [sessionTitle, setSessionTitle] = useState("");

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("sess");
    setError("");
    try {
      await adminFetch("/admin/sessions", {
        method: "POST",
        body: JSON.stringify({
          classroom_id: id,
          title: sessionTitle.trim() || `${room?.title ?? "Classroom"} — live session`,
        }),
      });
      setSessionTitle("");
      detail.reload();
      toast("Session created — start it from the control room");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create the session.");
    } finally {
      setBusy("");
    }
  };

  const setSessionStatus = async (sid: string, status: "live" | "ended" | "scheduled") => {
    setBusy(`st-${sid}`);
    setError("");
    try {
      await adminFetch(`/admin/sessions/${sid}`, { method: "PATCH", body: JSON.stringify({ status }) });
      detail.reload();
      toast(status === "live" ? "Session is live — members notified" : status === "ended" ? "Session ended" : "Session rescheduled");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update the session.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- materials ---------- */
  const [file, setFile] = useState<File | null>(null);
  const [notifyFile, setNotifyFile] = useState(true);
  const [confirmFile, setConfirmFile] = useState("");

  const uploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy("up");
    setError("");
    try {
      const stored = await uploadFile(file);
      const created = await adminFetch<{ id: string }>("/admin/materials", {
        method: "POST",
        body: JSON.stringify({
          classroom_id: id,
          title: stored.title,
          storage_key: stored.storage_key,
          mime: stored.mime,
          size_bytes: stored.size_bytes,
        }),
      });
      if (notifyFile) {
        await adminFetch(`/admin/materials/classroom/${created.id}/notify`, { method: "POST" }).catch(() => null);
      }
      setFile(null);
      const input = document.getElementById("cm-file") as HTMLInputElement | null;
      if (input) input.value = "";
      detail.reload();
      toast(notifyFile ? "Uploaded — every member notified" : "File uploaded");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not upload the file.");
    } finally {
      setBusy("");
    }
  };

  const openMaterial = async (mid: string) => {
    setError("");
    try {
      window.open(await fileSignedUrl(`/files/classroom-material/${mid}`), "_blank", "noopener");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open that file.");
    }
  };

  const removeMaterial = async (mid: string) => {
    setBusy(`dm-${mid}`);
    setError("");
    setConfirmFile("");
    try {
      await adminFetch(`/admin/materials/classroom/${mid}`, { method: "DELETE" });
      detail.reload();
      toast("File removed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove the file.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- announcements ---------- */
  const [ann, setAnn] = useState({ title: "", body: "" });
  const postAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ann.title.trim()) return;
    setBusy("ann");
    setError("");
    try {
      await adminFetch("/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ classroom_id: id, ...ann }),
      });
      setAnn({ title: "", body: "" });
      detail.reload();
      toast("Announcement posted and members notified");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not post the announcement.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- assignments ---------- */
  const [asg, setAsg] = useState({ title: "", description: "", due_at: "" });
  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asg.title.trim()) return;
    setBusy("asg");
    setError("");
    try {
      await adminFetch("/admin/assignments", {
        method: "POST",
        body: JSON.stringify({
          classroom_id: id,
          title: asg.title,
          description: asg.description,
          due_at: asg.due_at ? new Date(asg.due_at).toISOString() : null,
        }),
      });
      setAsg({ title: "", description: "", due_at: "" });
      detail.reload();
      toast("Assignment created");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create the assignment.");
    } finally {
      setBusy("");
    }
  };

  const announcements = useMemo(() => detail.data?.announcements ?? [], [detail.data]);
  const assignments = useMemo(() => detail.data?.assignments ?? [], [detail.data]);
  const members = detail.data?.members ?? [];
  const sessions = detail.data?.sessions ?? [];
  const materials = detail.data?.materials ?? [];

  return (
    <Shell>
      <Ph
        title={room?.title ?? "Classroom"}
        sub={
          room
            ? `${room.schedule_text || "No schedule yet"} · ${room.level} · ${money(room.price_kobo, room.currency)}`
            : "Manage members, sessions, files and discussion."
        }
        actions={
          <>
            <button
              type="button"
              className={`reb-btn sm ${room?.is_published ? "ghost" : "pri"}`}
              disabled={busy === "pub" || !room}
              onClick={togglePublish}
            >
              <Ic name={room?.is_published ? "x" : "check"} size={14} />
              {busy === "pub" ? "Saving…" : room?.is_published ? "Unpublish" : "Publish"}
            </button>
            <Link
              className="reb-btn ghost sm"
              href={`/classrooms/${room?.slug ?? id}`}
              target="_blank"
            >
              <Ic name="external" size={14} /> Learner view
            </Link>
            <button type="button" className="reb-btn ghost sm" onClick={() => detail.reload()}>
              <Ic name="refresh" size={14} /> Refresh
            </button>
          </>
        }
      />

      {error ? <Err msg={error} onRetry={() => setError("")} /> : null}
      {detail.error ? <Err msg={detail.error} onRetry={detail.reload} /> : null}
      {detail.loading && !detail.data ? <Sk h={120} mb={10} /> : null}

      {room ? (
        <div className="statline" style={{ marginBottom: 16 }}>
          <div className="tile">
            <h3>
              <Ic name="users" size={14} /> Members
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {members.length}/{room.capacity}
            </div>
            <p className="hint">seats filled</p>
          </div>
          <div className="tile">
            <h3>
              <Ic name="calendar" size={14} /> Sessions
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{sessions.length}</div>
            <p className="hint">{sessions.filter((s) => s.status === "live").length} live now</p>
          </div>
          <div className="tile">
            <h3>
              <Ic name="folder" size={14} /> Files
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{materials.length}</div>
            <p className="hint">in the library</p>
          </div>
          <div className="tile">
            <h3>
              <Ic name="messageSquare" size={14} /> Discussion
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{messageCount}</div>
            <p className="hint">
              {(messages.data ?? []).filter((m) => m.is_issue && !m.is_solved).length} open issues
            </p>
          </div>
        </div>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Classroom sections" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "on" : undefined}
            onClick={() => setTab(t.id)}
          >
            <Ic name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- discussion ---------------- */}
      {tab === "discussion" ? (
        <div className="grid2">
          <section className="reb-card" style={{ gridColumn: "1 / -1" }}>
            <SecHead
              icon="messageSquare"
              title="Classroom discussion"
              right={
                <button type="button" className="reb-btn ghost sm" onClick={() => messages.reload()}>
                  <Ic name="refresh" size={13} /> Refresh
                </button>
              }
            />
            <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>
              The same thread learners see in their Discuss tab.
            </p>

            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              style={{ maxHeight: 420, overflowY: "auto", padding: "4px 2px 12px" }}
            >
              {messages.loading && messageCount === 0 ? (
                <Sk h={70} mb={8} />
              ) : messages.error ? (
                <Err msg={messages.error} onRetry={messages.reload} />
              ) : messageCount === 0 ? (
                <Emp
                  icon="messageSquare"
                  title="No messages yet"
                  note="Post the first message below — learners read it in their classroom."
                />
              ) : (
                (messages.data ?? []).map((m) => (
                  <div key={m.id} className="gm">
                    <span className="avatar">{initials(m.sender_name || m.sender_email || "Ferix")}</span>
                    <div className="gbody">
                      <div className="gname">
                        <b>
                          {m.sender_name || m.sender_email || "Member"}
                          {m.sender_role === "ADMIN" || m.sender_role === "INSTRUCTOR" ? ` · ${m.sender_role.toLowerCase()}` : ""}
                        </b>
                        <span className="hint">{shortDateTime(m.created_at)}</span>
                        {m.is_issue ? (
                          <span className={m.is_solved ? "solved-tag" : "issue-tag"}>
                            {m.is_solved ? "solved" : "issue"}
                          </span>
                        ) : null}
                      </div>

                      {m.parent_body ? (
                        <div className="reply-strip">
                          <Ic name="arrowLeft" size={12} />
                          <span style={{ minWidth: 0 }}>
                            <b>{m.parent_sender ?? "Earlier"}</b>: {m.parent_body.slice(0, 90)}
                          </span>
                        </div>
                      ) : null}

                      <div className="gbub">
                        {m.body}
                        {m.attachment ? (
                          <button
                            type="button"
                            className="filecard"
                            style={{ marginTop: 10, width: "100%" }}
                            onClick={() => void openMessageFile(m)}
                          >
                            <Ic name="fileText" size={16} />
                            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                              <b style={{ fontSize: 13 }}>{m.attachment.name}</b>
                              <span className="hint" style={{ display: "block" }}>
                                {m.attachment.kind.toUpperCase()}
                              </span>
                            </span>
                            <Ic name="external" size={14} />
                          </button>
                        ) : null}
                      </div>

                      <div className="seenrow">
                        {typeof m.seen_count === "number" ? (
                          <span className="hint">
                            <Ic name="eye" size={11} /> {m.seen_count} seen
                          </span>
                        ) : null}
                        {m.is_issue ? (
                          <button
                            type="button"
                            className="reb-btn ghost sm"
                            style={{ padding: "2px 8px" }}
                            disabled={busy === `sol-${m.id}`}
                            onClick={() => toggleSolved(m)}
                          >
                            <Ic name={m.is_solved ? "refresh" : "check"} size={12} />
                            {m.is_solved ? "Reopen" : "Mark solved"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={send} style={{ display: "grid", gap: 10, marginTop: 6 }}>
              <label className="hint" style={{ position: "absolute", left: -9999 }} htmlFor="cm-draft">
                Message the classroom
              </label>
              <textarea
                id="cm-draft"
                className="textarea"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Post into the classroom discussion…"
              />
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label className="hint" style={{ display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyMembers}
                    onChange={(e) => setNotifyMembers(e.target.checked)}
                  />
                  Notify every member
                </label>
                <button
                  type="submit"
                  className="reb-btn pri"
                  style={{ marginLeft: "auto" }}
                  disabled={busy === "send" || !draft.trim()}
                >
                  <Ic name="send" size={14} /> {busy === "send" ? "Posting…" : "Post message"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* ---------------- members ---------------- */}
      {tab === "members" ? (
        <div className="grid2">
          <section className="reb-card">
            <SecHead icon="users" title={`Members · ${members.length}`} />
            {members.length === 0 ? (
              <Emp icon="users" title="No members yet" note="Add a learner by email on the left, or wait for them to enroll." />
            ) : (
              <div>
                {members.map((m) => (
                  <div key={m.id} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                      {initials(m.full_name || m.email)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13 }}>{m.full_name || m.email}</b>
                      <span className="hint" style={{ display: "block" }}>
                        {m.email} · joined {shortDate(m.enrolled_at)}
                      </span>
                    </span>
                    <Badge tone={m.role === "ADMIN" ? "brand" : m.is_active ? "info" : "danger"}>
                      {m.role.toLowerCase()}
                    </Badge>
                    <Link className="reb-btn ghost sm" href={`/users/${m.id}`}>
                      <Ic name="eye" size={13} />
                    </Link>
                    {confirmRemove === m.id ? (
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="reb-btn danger sm"
                          disabled={busy === `rm-${m.id}`}
                          onClick={() => removeMember(m.id)}
                        >
                          Confirm
                        </button>
                        <button type="button" className="reb-btn ghost sm" onClick={() => setConfirmRemove("")}>
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="reb-btn ghost sm"
                        onClick={() => setConfirmRemove(m.id)}
                        aria-label={`Remove ${m.full_name || m.email}`}
                      >
                        <Ic name="x" size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="reb-card">
            <SecHead icon="plus" title="Add a learner" />
            <form onSubmit={addMember} style={{ display: "grid", gap: 10 }}>
              <div className="field">
                <label className="kind" htmlFor="cm-email">
                  Email
                </label>
                <input
                  id="cm-email"
                  className="reb-input"
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="learner@example.com"
                  required
                />
                <span className="hint">Existing accounts are added instantly and notified.</span>
              </div>
              <button type="submit" className="reb-btn pri" disabled={busy === "add" || !memberEmail.trim()}>
                <Ic name="plus" size={14} /> {busy === "add" ? "Adding…" : "Add to classroom"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {/* ---------------- sessions ---------------- */}
      {tab === "sessions" ? (
        <>
          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="calendar" title="Schedule a session" />
            <form onSubmit={createSession} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <label className="kind" htmlFor="cm-sess-title">
                  Title
                </label>
                <input
                  id="cm-sess-title"
                  className="reb-input"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Week 3 — deep dive"
                />
              </div>
              <button type="submit" className="reb-btn pri" disabled={busy === "sess"}>
                <Ic name="plus" size={14} /> {busy === "sess" ? "Creating…" : "Create session"}
              </button>
            </form>
          </section>

          <section className="reb-card">
            <SecHead
              icon="radio"
              title={`Sessions · ${sessions.length}`}
              right={
                <Link href="/live" className="reb-btn ghost sm">
                  <Ic name="radio" size={13} /> Control room
                </Link>
              }
            />
            {sessions.length === 0 ? (
              <Emp icon="calendar" title="No sessions yet" note="Create one above — the control room starts them." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <caption style={{ display: "none" }}>Sessions in this classroom</caption>
                  <thead>
                    <tr>
                      <th scope="col">Session</th>
                      <th scope="col">Starts</th>
                      <th scope="col">Status</th>
                      <th scope="col">Recording</th>
                      <th scope="col">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s: Session) => (
                      <tr key={s.id}>
                        <td>
                          <b>{s.title}</b>
                        </td>
                        <td className="hint">{shortDateTime(s.starts_at)}</td>
                        <td>
                          <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                        </td>
                        <td>
                          <Badge tone={statusTone(s.recording_status)}>{s.recording_status}</Badge>
                        </td>
                        <td>
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {s.status !== "live" ? (
                              <button
                                type="button"
                                className="reb-btn ghost sm"
                                disabled={busy === `st-${s.id}`}
                                onClick={() => setSessionStatus(s.id, "live")}
                              >
                                <Ic name="play" size={13} /> Go live
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="reb-btn ghost sm"
                                disabled={busy === `st-${s.id}`}
                                onClick={() => setSessionStatus(s.id, "ended")}
                              >
                                <Ic name="stop" size={13} /> End
                              </button>
                            )}
                            <Link className="reb-btn ghost sm" href="/live">
                              <Ic name="radio" size={13} /> Open
                            </Link>
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

      {/* ---------------- materials ---------------- */}
      {tab === "materials" ? (
        <>
          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="upload" title="Upload a file for this classroom" />
            <form onSubmit={uploadMaterial} style={{ display: "grid", gap: 10 }}>
              <div className="field">
                <label className="kind" htmlFor="cm-file">
                  File
                </label>
                <input
                  id="cm-file"
                  className="reb-input"
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <span className="hint">Up to 200 MB. Members only — never in the public catalog.</span>
              </div>
              <label className="hint" style={{ display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={notifyFile} onChange={(e) => setNotifyFile(e.target.checked)} />
                Notify every member when the file is ready
              </label>
              <div>
                <button type="submit" className="reb-btn pri" disabled={busy === "up" || !file}>
                  <Ic name="upload" size={14} /> {busy === "up" ? "Uploading…" : "Upload & save"}
                </button>
              </div>
            </form>
          </section>

          <section className="reb-card">
            <SecHead icon="folder" title={`Files · ${materials.length}`} />
            {materials.length === 0 ? (
              <Emp icon="folder" title="No files yet" note="Upload one above — members get notified when you share it." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <caption style={{ display: "none" }}>Files in this classroom</caption>
                  <thead>
                    <tr>
                      <th scope="col">File</th>
                      <th scope="col">Size</th>
                      <th scope="col">Added</th>
                      <th scope="col">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <b>{m.title}</b>
                        </td>
                        <td className="hint">{bytes(m.size_bytes)}</td>
                        <td className="hint">{shortDate(m.created_at)}</td>
                        <td>
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <button type="button" className="reb-btn ghost sm" onClick={() => void openMaterial(m.id)}>
                              <Ic name="download" size={13} /> Open
                            </button>
                            {confirmFile === m.id ? (
                              <span style={{ display: "inline-flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="reb-btn danger sm"
                                  disabled={busy === `dm-${m.id}`}
                                  onClick={() => removeMaterial(m.id)}
                                >
                                  Confirm
                                </button>
                                <button type="button" className="reb-btn ghost sm" onClick={() => setConfirmFile("")}>
                                  Keep
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="reb-btn ghost sm"
                                onClick={() => setConfirmFile(m.id)}
                                aria-label={`Delete ${m.title}`}
                              >
                                <Ic name="trash" size={13} />
                              </button>
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

      {/* ---------------- announcements ---------------- */}
      {tab === "announcements" ? (
        <div className="grid2">
          <section className="reb-card">
            <SecHead icon="megaphone" title="Post an announcement" />
            <form onSubmit={postAnnouncement} style={{ display: "grid", gap: 10 }}>
              <div className="field">
                <label className="kind" htmlFor="cm-ann-title">
                  Title
                </label>
                <input
                  id="cm-ann-title"
                  className="reb-input"
                  value={ann.title}
                  onChange={(e) => setAnn({ ...ann, title: e.target.value })}
                  placeholder="e.g. Class moves to Thursday this week"
                  required
                />
              </div>
              <div className="field">
                <label className="kind" htmlFor="cm-ann-body">
                  Message
                </label>
                <textarea
                  id="cm-ann-body"
                  className="textarea"
                  rows={4}
                  value={ann.body}
                  onChange={(e) => setAnn({ ...ann, body: e.target.value })}
                  placeholder="What should the cohort know?"
                />
              </div>
              <button type="submit" className="reb-btn pri" disabled={busy === "ann" || !ann.title.trim()}>
                <Ic name="megaphone" size={14} /> {busy === "ann" ? "Posting…" : "Post announcement"}
              </button>
            </form>
          </section>

          <section className="reb-card">
            <SecHead icon="bell" title={`Posted · ${announcements.length}`} />
            {announcements.length === 0 ? (
              <Emp icon="megaphone" title="No announcements yet" note="Announcements notify every member of this classroom." />
            ) : (
              <div>
                {announcements.map((a) => (
                  <article key={a.id} className="qa">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <b style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{a.title}</b>
                      <span className="hint">{shortDateTime(a.created_at)}</span>
                    </div>
                    {a.body ? <p className="sub" style={{ marginTop: 4 }}>{a.body}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* ---------------- assignments ---------------- */}
      {tab === "assignments" ? (
        <div className="grid2">
          <section className="reb-card">
            <SecHead icon="clipboard" title="Create an assignment" />
            <form onSubmit={createAssignment} style={{ display: "grid", gap: 10 }}>
              <div className="field">
                <label className="kind" htmlFor="cm-asg-title">
                  Title
                </label>
                <input
                  id="cm-asg-title"
                  className="reb-input"
                  value={asg.title}
                  onChange={(e) => setAsg({ ...asg, title: e.target.value })}
                  placeholder="e.g. Ship the auth flow"
                  required
                />
              </div>
              <div className="field">
                <label className="kind" htmlFor="cm-asg-desc">
                  Instructions
                </label>
                <textarea
                  id="cm-asg-desc"
                  className="textarea"
                  rows={4}
                  value={asg.description}
                  onChange={(e) => setAsg({ ...asg, description: e.target.value })}
                  placeholder="What should learners submit?"
                />
              </div>
              <div className="field">
                <label className="kind" htmlFor="cm-asg-due">
                  Due date
                </label>
                <input
                  id="cm-asg-due"
                  className="reb-input"
                  type="datetime-local"
                  value={asg.due_at}
                  onChange={(e) => setAsg({ ...asg, due_at: e.target.value })}
                />
              </div>
              <button type="submit" className="reb-btn pri" disabled={busy === "asg" || !asg.title.trim()}>
                <Ic name="plus" size={14} /> {busy === "asg" ? "Creating…" : "Create assignment"}
              </button>
            </form>
          </section>

          <section className="reb-card">
            <SecHead icon="list" title={`Assignments · ${assignments.length}`} />
            {assignments.length === 0 ? (
              <Emp icon="clipboard" title="No assignments yet" note="Learners submit against assignments you create here." />
            ) : (
              <div>
                {assignments.map((a) => (
                  <article key={a.id} className="qa">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <b style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{a.title}</b>
                      <Badge tone="info">{a.submissions} submitted</Badge>
                    </div>
                    {a.description ? <p className="sub" style={{ marginTop: 4 }}>{a.description}</p> : null}
                    <p className="hint" style={{ marginTop: 6 }}>
                      {a.due_at ? `Due ${shortDateTime(a.due_at)}` : "No due date"} · created {shortDate(a.created_at)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      <ToastHost />
    </Shell>
  );
}
