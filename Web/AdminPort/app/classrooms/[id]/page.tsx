"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import {
  Alert, Avatar, Badge, DangerButton, EmptyState, ErrorNote, Field, PageHead,
  SectionHead, Skeleton, StatusBadge,
} from "@/components/ui";
import { adminFetch, bytes, shortDateTime } from "@/lib/admin";
import { uploadFile } from "@/lib/upload";
import { useAdmin, useAdminPoll } from "@/lib/use-admin";
import type { ClassroomDetail, ClassroomMessage, Session } from "@/lib/admin-types";

/*
  One classroom: everything an admin needs to run it.

  Endpoints (all real, all staff-guarded):
    GET    /admin/classrooms/:id                    room + members + sessions + materials + announcements + assignments
    POST   /admin/classrooms/:id/members            add a registered learner by email
    DELETE /admin/classrooms/:id/members/:userId    remove a member
    GET    /admin/classrooms/:id/messages           the discussion learners read
    POST   /admin/classrooms/:id/messages           post into it (optional member notification)
    POST   /admin/uploads                           put bytes in storage
    POST   /admin/materials                         register the uploaded file
    POST   /admin/materials/classroom/:id/notify    tell members a file arrived
    DELETE /admin/materials/classroom/:id           remove a file record
    GET    /files/classroom-material/:id            15-minute signed download URL
    POST   /admin/announcements                     broadcast (notifies members)
    POST   /admin/sessions, PATCH /admin/sessions/:id
    POST   /admin/assignments
*/

type TabId = "discussion" | "members" | "sessions" | "materials" | "announcements" | "assignments";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "discussion", label: "Discussion", icon: "messageSquare" },
  { id: "members", label: "Members", icon: "users" },
  { id: "sessions", label: "Sessions", icon: "calendar" },
  { id: "materials", label: "Materials", icon: "folder" },
  { id: "announcements", label: "Announcements", icon: "megaphone" },
  { id: "assignments", label: "Assignments", icon: "clipboard" },
];

export default function ManageClassroomPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const detail = useAdmin<ClassroomDetail>(`/admin/classrooms/${id}`);
  const room = detail.data?.classroom;

  const [tab, setTab] = useState<TabId>("discussion");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  /* ---------- discussion ---------- */
  const [draft, setDraft] = useState("");
  const [notifyMembers, setNotifyMembers] = useState(false);
  const messages = useAdminPoll<ClassroomMessage[]>(`/admin/classrooms/${id}/messages`, 8000);
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
      setNotice("Message posted to the classroom discussion.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- members ---------- */
  const [memberEmail, setMemberEmail] = useState("");
  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setBusy("member");
    setError("");
    setNotice("");
    try {
      const r = await adminFetch<{ already_enrolled?: boolean }>(`/admin/classrooms/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: memberEmail.trim() }),
      });
      setMemberEmail("");
      detail.reload();
      setNotice(r?.already_enrolled ? "That learner is already in this classroom." : "Member added and notified.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add the member.");
    } finally {
      setBusy("");
    }
  };

  const removeMember = async (userId: string) => {
    setBusy(`rm-${userId}`);
    setError("");
    try {
      await adminFetch(`/admin/classrooms/${id}/members/${userId}`, { method: "DELETE" });
      detail.reload();
      setNotice("Member removed.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove the member.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- sessions ---------- */
  const [sessTitle, setSessTitle] = useState("");
  const [sessStart, setSessStart] = useState("");
  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("session");
    setError("");
    try {
      await adminFetch<Session>("/admin/sessions", {
        method: "POST",
        body: JSON.stringify({
          classroom_id: id,
          title: sessTitle.trim() || `${room?.title ?? "Classroom"} — live session`,
          starts_at: sessStart ? new Date(sessStart).toISOString() : null,
        }),
      });
      setSessTitle("");
      setSessStart("");
      detail.reload();
      setNotice("Session created. Start it from Live control.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create the session.");
    } finally {
      setBusy("");
    }
  };

  const setSessionStatus = async (sessionId: string, status: "live" | "ended") => {
    setBusy(`s-${sessionId}`);
    setError("");
    try {
      await adminFetch(`/admin/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      detail.reload();
      setNotice(status === "live" ? "Session is live — members notified." : "Session ended.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update the session.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- materials: upload -> register -> optionally notify ---------- */
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [notifyMaterial, setNotifyMaterial] = useState(true);

  const uploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedFile) return;
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const stored = await uploadFile(pickedFile);
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
      if (notifyMaterial) {
        await adminFetch(`/admin/materials/classroom/${created.id}/notify`, { method: "POST" }).catch(() => null);
      }
      setPickedFile(null);
      const input = document.getElementById("ad-material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      detail.reload();
      setNotice(notifyMaterial ? "File uploaded and members notified." : "File uploaded.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not upload the file.");
    } finally {
      setBusy("");
    }
  };

  const openMaterial = async (materialId: string) => {
    setError("");
    try {
      const r = await adminFetch<{ url: string }>(`/files/classroom-material/${materialId}`);
      window.open(r.url, "_blank", "noopener");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open the file.");
    }
  };

  const deleteMaterial = async (materialId: string) => {
    setBusy(`m-${materialId}`);
    setError("");
    try {
      await adminFetch(`/admin/materials/classroom/${materialId}`, { method: "DELETE" });
      detail.reload();
      setNotice("File removed from this classroom.");
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
    if (!ann.title.trim() || !ann.body.trim()) return;
    setBusy("ann");
    setError("");
    try {
      await adminFetch("/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ classroom_id: id, ...ann }),
      });
      setAnn({ title: "", body: "" });
      detail.reload();
      setNotice("Announcement posted and members notified.");
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
      setNotice("Assignment created.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create the assignment.");
    } finally {
      setBusy("");
    }
  };

  /* ---------- tabs: real ARIA + arrow keys ---------- */
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const members = useMemo(() => detail.data?.members ?? [], [detail.data]);
  const materials = useMemo(() => detail.data?.materials ?? [], [detail.data]);
  const sessions = useMemo(() => detail.data?.sessions ?? [], [detail.data]);
  const announcements = useMemo(() => detail.data?.announcements ?? [], [detail.data]);
  const assignments = useMemo(() => detail.data?.assignments ?? [], [detail.data]);

  return (
    <Shell>
      <PageHead
        title={room?.title ?? "Classroom"}
        sub={
          room
            ? `${room.enrolled} enrolled · ${room.schedule_text || "No schedule set"} · ${room.is_published ? "Published" : "Draft"}`
            : "Manage members, sessions, files and discussion."
        }
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-ghost" onClick={() => detail.reload()}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
            <Link className="ad-btn ad-btn-primary" href="/live">
              <Icon name="radio" size={14} /> Live control
            </Link>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => setError("")} /> : null}
      {notice ? (
        <Alert tone="ok" icon="check">
          {notice}
        </Alert>
      ) : null}
      {detail.error ? <ErrorNote message={detail.error} onRetry={detail.reload} /> : null}
      {detail.loading && !detail.data ? <Skeleton height={200} count={2} /> : null}

      {detail.data ? (
        <>
          <div className="ad-tabs" role="tablist" aria-label="Classroom sections">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`ad-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`ad-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className="ad-tab"
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <Icon name={t.icon} size={15} />
                {t.label}
                {t.id === "members" && members.length ? <span className="ad-nav-count">{members.length}</span> : null}
                {t.id === "materials" && materials.length ? <span className="ad-nav-count">{materials.length}</span> : null}
              </button>
            ))}
          </div>

          {/* ---------------- discussion ---------------- */}
          {tab === "discussion" ? (
            <div role="tabpanel" id="ad-panel-discussion" aria-labelledby="ad-tab-discussion" tabIndex={-1}>
              <div className="ad-card ad-card-pad-0">
                <div className="ad-card-head">
                  <span className="ad-card-title">Classroom discussion</span>
                  <Badge>{messageCount}</Badge>
                  <span className="ad-hint" style={{ marginLeft: "auto" }}>
                    The same thread learners see in their Discuss tab.
                  </span>
                </div>

                {messages.error ? (
                  <div style={{ padding: 16 }}>
                    <ErrorNote message={messages.error} onRetry={messages.reload} />
                  </div>
                ) : null}

                <div className="ad-chat">
                  <div className="ad-chat-scroll" ref={logRef}>
                    {messages.loading && messageCount === 0 ? (
                      <Skeleton height={44} count={4} />
                    ) : messageCount === 0 ? (
                      <EmptyState
                        icon="messageSquare"
                        title="No messages yet"
                        body="Start the conversation — anything you send here appears for every member of this classroom."
                      />
                    ) : (
                      (messages.data ?? []).map((m) => {
                        const mine = m.sender_role === "ADMIN";
                        return (
                          <div key={m.id} className={`ad-chat-msg${mine ? " is-mine" : ""}`}>
                            <p className="ad-chat-meta">
                              {m.sender_name || "Member"}
                              {mine ? " · Admin" : ""} · {shortDateTime(m.created_at)}
                            </p>
                            <p className="ad-bubble">{m.body}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form className="ad-chat-compose" onSubmit={send}>
                    <label className="ad-sr-only" htmlFor="ad-msg">
                      Message the classroom
                    </label>
                    <input
                      id="ad-msg"
                      className="ad-input"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write a message to the classroom…"
                      style={{ flex: 1 }}
                    />
                    <label className="ad-sm ad-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={notifyMembers}
                        onChange={(e) => setNotifyMembers(e.target.checked)}
                      />
                      Notify
                    </label>
                    <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "send" || !draft.trim()}>
                      <Icon name="send" size={15} /> {busy === "send" ? "Sending…" : "Send"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}

          {/* ---------------- members ---------------- */}
          {tab === "members" ? (
            <div role="tabpanel" id="ad-panel-members" aria-labelledby="ad-tab-members" tabIndex={-1}>
              <div className="ad-card">
                <SectionHead title="Add a learner" />
                <form onSubmit={addMember} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 260px" }}>
                    <Field
                      label="Email of a registered account"
                      id="ad-member-email"
                      hint="They must already have a FerixCourse account."
                    >
                      <input
                        id="ad-member-email"
                        className="ad-input"
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="learner@example.com"
                      />
                    </Field>
                  </div>
                  <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "member" || !memberEmail.trim()}>
                    <Icon name="usersPlus" size={14} /> {busy === "member" ? "Adding…" : "Add member"}
                  </button>
                </form>
              </div>

              <SectionHead title="Members" count={members.length} />
              {members.length === 0 ? (
                <EmptyState
                  icon="users"
                  title="No members yet"
                  body="Add learners by email, or let them enroll from the catalog."
                />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <caption className="ad-sr-only">Learners enrolled in this classroom</caption>
                      <thead>
                        <tr>
                          <th scope="col">Learner</th>
                          <th scope="col">Email</th>
                          <th scope="col">Joined</th>
                          <th scope="col">Status</th>
                          <th scope="col">
                            <span className="ad-sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.enrollment_id}>
                            <td>
                              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Avatar name={m.full_name || m.email} />
                                <span>
                                  <Link className="ad-row-title" href={`/users/${m.id}`}>
                                    {m.full_name || "—"}
                                  </Link>
                                  <span className="ad-row-meta">{m.role}</span>
                                </span>
                              </span>
                            </td>
                            <td className="ad-muted">{m.email}</td>
                            <td className="ad-muted">{shortDateTime(m.enrolled_at)}</td>
                            <td>{m.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Disabled</Badge>}</td>
                            <td>
                              <span className="ad-row-actions">
                                <Link className="ad-btn ad-btn-ghost ad-btn-sm" href={`/users/${m.id}`}>
                                  <Icon name="eye" size={13} /> View
                                </Link>
                                <DangerButton
                                  label="Remove"
                                  confirmLabel="Confirm remove"
                                  pending={busy === `rm-${m.id}`}
                                  onConfirm={() => removeMember(m.id)}
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
            </div>
          ) : null}

          {/* ---------------- sessions ---------------- */}
          {tab === "sessions" ? (
            <div role="tabpanel" id="ad-panel-sessions" aria-labelledby="ad-tab-sessions" tabIndex={-1}>
              <div className="ad-card">
                <SectionHead title="Schedule a session" />
                <form onSubmit={createSession} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 260px" }}>
                    <Field label="Title" id="ad-sess-title">
                      <input
                        id="ad-sess-title"
                        className="ad-input"
                        value={sessTitle}
                        onChange={(e) => setSessTitle(e.target.value)}
                        placeholder="Week 1 — orientation"
                      />
                    </Field>
                  </div>
                  <div style={{ flex: "0 1 220px" }}>
                    <Field label="Starts" id="ad-sess-start">
                      <input
                        id="ad-sess-start"
                        className="ad-input"
                        type="datetime-local"
                        value={sessStart}
                        onChange={(e) => setSessStart(e.target.value)}
                      />
                    </Field>
                  </div>
                  <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "session"}>
                    <Icon name="plus" size={14} /> {busy === "session" ? "Creating…" : "Create session"}
                  </button>
                </form>
              </div>

              <SectionHead title="Sessions" count={sessions.length} />
              {sessions.length === 0 ? (
                <EmptyState icon="calendar" title="No sessions scheduled" body="Create one above, then start it from Live control." />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <caption className="ad-sr-only">Sessions for this classroom</caption>
                      <thead>
                        <tr>
                          <th scope="col">Title</th>
                          <th scope="col">Starts</th>
                          <th scope="col">Status</th>
                          <th scope="col">Recording</th>
                          <th scope="col">
                            <span className="ad-sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s) => (
                          <tr key={s.id}>
                            <td className="ad-row-title">{s.title}</td>
                            <td className="ad-muted">{shortDateTime(s.starts_at)}</td>
                            <td>
                              <StatusBadge status={s.status} />
                            </td>
                            <td>
                              <StatusBadge status={s.recording_status} />
                            </td>
                            <td>
                              <span className="ad-row-actions">
                                {s.status !== "live" ? (
                                  <button
                                    type="button"
                                    className="ad-btn ad-btn-ghost ad-btn-sm"
                                    disabled={busy === `s-${s.id}`}
                                    onClick={() => setSessionStatus(s.id, "live")}
                                  >
                                    <Icon name="play" size={13} /> Go live
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="ad-btn ad-btn-ghost ad-btn-sm"
                                    disabled={busy === `s-${s.id}`}
                                    onClick={() => setSessionStatus(s.id, "ended")}
                                  >
                                    <Icon name="stop" size={13} /> End
                                  </button>
                                )}
                                <Link className="ad-btn ad-btn-ghost ad-btn-sm" href="/live">
                                  <Icon name="radio" size={13} /> Control room
                                </Link>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* ---------------- materials ---------------- */}
          {tab === "materials" ? (
            <div role="tabpanel" id="ad-panel-materials" aria-labelledby="ad-tab-materials" tabIndex={-1}>
              <div className="ad-card">
                <SectionHead title="Upload a file for this classroom" />
                <form onSubmit={uploadMaterial} style={{ display: "grid", gap: 12 }}>
                  <Field
                    label="File"
                    id="ad-material-file"
                    hint="Up to 200 MB. The file goes into storage, then is attached to this classroom."
                  >
                    <input
                      id="ad-material-file"
                      className="ad-input"
                      type="file"
                      onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
                    />
                  </Field>
                  <label className="ad-sm ad-muted" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <input
                      type="checkbox"
                      checked={notifyMaterial}
                      onChange={(e) => setNotifyMaterial(e.target.checked)}
                    />
                    Notify every member when the file is ready
                  </label>
                  <div>
                    <button type="submit" className="ad-btn ad-btn-primary" disabled={!pickedFile || busy === "upload"}>
                      <Icon name="upload" size={14} />
                      {busy === "upload" ? "Uploading…" : "Upload file"}
                    </button>
                  </div>
                </form>
              </div>

              <SectionHead title="Files" count={materials.length} />
              {materials.length === 0 ? (
                <EmptyState
                  icon="folder"
                  title="No files yet"
                  body="Upload a PDF, slide deck or recording to share with this classroom."
                />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <caption className="ad-sr-only">Files attached to this classroom</caption>
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
                        {materials.map((m) => (
                          <tr key={m.id}>
                            <td className="ad-row-title">{m.title}</td>
                            <td className="ad-muted ad-mono">{m.mime}</td>
                            <td className="ad-muted">{bytes(m.size_bytes)}</td>
                            <td className="ad-muted">{shortDateTime(m.created_at)}</td>
                            <td>
                              <span className="ad-row-actions">
                                <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => openMaterial(m.id)}>
                                  <Icon name="download" size={13} /> Open
                                </button>
                                <DangerButton
                                  label="Delete"
                                  confirmLabel="Confirm delete"
                                  pending={busy === `m-${m.id}`}
                                  onConfirm={() => deleteMaterial(m.id)}
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
            </div>
          ) : null}

          {/* ---------------- announcements ---------------- */}
          {tab === "announcements" ? (
            <div role="tabpanel" id="ad-panel-announcements" aria-labelledby="ad-tab-announcements" tabIndex={-1}>
              <div className="ad-card">
                <SectionHead title="Post an announcement" />
                <form onSubmit={postAnnouncement} style={{ display: "grid", gap: 12 }}>
                  <Field label="Title" id="ad-ann-title">
                    <input
                      id="ad-ann-title"
                      className="ad-input"
                      value={ann.title}
                      onChange={(e) => setAnn({ ...ann, title: e.target.value })}
                      placeholder="Schedule change for week 4"
                    />
                  </Field>
                  <Field label="Message" id="ad-ann-body">
                    <textarea
                      id="ad-ann-body"
                      className="ad-textarea"
                      value={ann.body}
                      onChange={(e) => setAnn({ ...ann, body: e.target.value })}
                      placeholder="What do members need to know?"
                    />
                  </Field>
                  <div>
                    <button
                      type="submit"
                      className="ad-btn ad-btn-primary"
                      disabled={busy === "ann" || !ann.title.trim() || !ann.body.trim()}
                    >
                      <Icon name="megaphone" size={14} /> {busy === "ann" ? "Posting…" : "Post & notify members"}
                    </button>
                  </div>
                </form>
              </div>

              <SectionHead title="Posted" count={announcements.length} />
              {announcements.length === 0 ? (
                <EmptyState
                  icon="megaphone"
                  title="No announcements yet"
                  body="Announcements notify every member of this classroom."
                />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  {announcements.map((a) => (
                    <div className="ad-row" key={a.id} style={{ alignItems: "flex-start" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="ad-row-title">{a.title}</span>
                        <span className="ad-row-meta">{shortDateTime(a.created_at)}</span>
                        <p className="ad-sm" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                          {a.body}
                        </p>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* ---------------- assignments ---------------- */}
          {tab === "assignments" ? (
            <div role="tabpanel" id="ad-panel-assignments" aria-labelledby="ad-tab-assignments" tabIndex={-1}>
              <div className="ad-card">
                <SectionHead title="Create an assignment" />
                <form onSubmit={createAssignment} style={{ display: "grid", gap: 12 }}>
                  <Field label="Title" id="ad-asg-title">
                    <input
                      id="ad-asg-title"
                      className="ad-input"
                      value={asg.title}
                      onChange={(e) => setAsg({ ...asg, title: e.target.value })}
                      placeholder="Build a landing page"
                    />
                  </Field>
                  <Field label="Brief" id="ad-asg-desc">
                    <textarea
                      id="ad-asg-desc"
                      className="ad-textarea"
                      value={asg.description}
                      onChange={(e) => setAsg({ ...asg, description: e.target.value })}
                    />
                  </Field>
                  <Field label="Due" id="ad-asg-due">
                    <input
                      id="ad-asg-due"
                      className="ad-input"
                      type="datetime-local"
                      value={asg.due_at}
                      onChange={(e) => setAsg({ ...asg, due_at: e.target.value })}
                    />
                  </Field>
                  <div>
                    <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "asg" || !asg.title.trim()}>
                      <Icon name="plus" size={14} /> {busy === "asg" ? "Creating…" : "Create assignment"}
                    </button>
                  </div>
                </form>
              </div>

              <SectionHead title="Assignments" count={assignments.length} />
              {assignments.length === 0 ? (
                <EmptyState
                  icon="clipboard"
                  title="No assignments yet"
                  body="Create one above to collect learner submissions."
                />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <caption className="ad-sr-only">Assignments in this classroom</caption>
                      <thead>
                        <tr>
                          <th scope="col">Title</th>
                          <th scope="col">Due</th>
                          <th scope="col" className="num">
                            Submissions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={a.id}>
                            <td className="ad-row-title">{a.title}</td>
                            <td className="ad-muted">{shortDateTime(a.due_at)}</td>
                            <td className="num">{a.submissions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}
