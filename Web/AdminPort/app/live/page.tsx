"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Alert, Badge, EmptyState, ErrorNote, PageHead, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { adminFetch, shortDateTime } from "@/lib/admin";
import { useAdmin, useAdminPoll } from "@/lib/use-admin";
import type { LiveOverview, LiveToken, Session } from "@/lib/admin-types";

/*
  Live control room — the admin starts the training from here, shares their
  screen, and runs the session.

  Real infrastructure only, no simulation:
    POST /live/token { classroom_id }   -> LiveKit url/token/room. The backend's
                                           isMember() grants staff access by role,
                                           so an admin token is accepted as host.
    POST /admin/sessions                -> create the session if none exists yet
    PATCH /admin/sessions/:id           -> scheduled | live | ended
                                           (going live notifies every member)
    PATCH /admin/sessions/:id/recording -> recording_status
    GET   /admin/sessions/:id/attendance, refreshed on a poll while live

  livekit-client is imported lazily inside the effect so it never runs during
  server rendering.
*/

type StageState =
  | { phase: "idle" }
  | { phase: "connecting" }
  | { phase: "live" }
  | { phase: "error"; message: string };

export default function LivePage() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState<StageState>({ phase: "idle" });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [participants, setParticipants] = useState<{ identity: string; name: string; isLocal: boolean; camOn: boolean; screenOn: boolean }[]>([]);

  const roomRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const tilesRef = useRef<Map<string, HTMLVideoElement | null>>(new Map());

  const overview = useAdmin<LiveOverview>("/admin/live/overview");

  const sessions = useMemo(() => {
    const all = overview.data?.sessions ?? [];
    return {
      live: all.filter((s) => s.status === "live"),
      upcoming: all.filter((s) => s.status === "scheduled"),
      past: all.filter((s) => s.status === "ended"),
    };
  }, [overview.data]);

  const selected: Session | undefined = useMemo(
    () => (overview.data?.sessions ?? []).find((s) => s.id === selectedId),
    [overview.data, selectedId]
  );

  const attendance = useAdminPoll<any[]>(
    selected && selected.status === "live" ? `/admin/sessions/${selected.id}/attendance` : null,
    selected?.status === "live" ? 15000 : 0
  );

  /* ---------- LiveKit ---------- */

  const publishParticipant = useCallback((p: any) => {
    const identity = p.identity;
    const track = p.getTrackPublication?.("camera")?.track;
    const screen = p.getTrackPublication?.("screen_share")?.track ?? p.getTrackPublication?.("screen_share_audio")?.track;
    const el = tilesRef.current.get(identity);
    if (el && track?.attach) track.attach(el);
    setParticipants((prev) => {
      const next = prev.filter((x) => x.identity !== identity);
      next.push({
        identity,
        name: p.name || identity.slice(0, 8),
        isLocal: Boolean(p.isLocal),
        camOn: Boolean(p.isCameraEnabled),
        screenOn: Boolean(p.isScreenShareEnabled),
      });
      return next;
    });
    return screen;
  }, []);

  const syncParticipants = useCallback(
    async (room: any) => {
      const locals = room.localParticipant;
      const remotes = Array.from(room.remoteParticipants?.values?.() ?? []) as any[];
      const all = [locals, ...remotes];
      const list: typeof participants = [];
      for (const p of all) {
        list.push({
          identity: p.identity,
          name: p.name || p.identity?.slice(0, 8) || "Participant",
          isLocal: Boolean(p.isLocal),
          camOn: Boolean(p.isCameraEnabled),
          screenOn: Boolean(p.isScreenShareEnabled),
        });
        const camTrack = p.getTrackPublication?.("camera")?.track;
        const el = tilesRef.current.get(p.identity);
        if (el && camTrack?.attach) camTrack.attach(el);
      }
      // Keep the local preview wired to the camera track as well.
      const camTrack = locals?.getTrackPublication?.("camera")?.track;
      if (camTrack?.attach && localVideoRef.current) camTrack.attach(localVideoRef.current);
      setParticipants(list);
    },
    [participants]
  );

  const leave = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        await room.disconnect();
      } catch {
        /* disconnecting an already-closed room is not an error worth surfacing */
      }
    }
    setParticipants([]);
    setScreenOn(false);
    setMicOn(true);
    setCamOn(false);
    setStage({ phase: "idle" });
  }, []);

  useEffect(() => {
    /* Leaving the page must tear the room down, or the mic/camera stay hot. */
    return () => {
      void leave();
    };
  }, [leave]);

  const join = async () => {
    if (!selected) return;
    setError("");
    setStage({ phase: "connecting" });
    try {
      const creds = await adminFetch<LiveToken>("/live/token", {
        method: "POST",
        body: JSON.stringify({ classroom_id: selected.classroom_id }),
      });

      const { Room, RoomEvent, Track } = await import("livekit-client");
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (_t: any, _p: any, participant: any) => {
          const el = tilesRef.current.get(participant.identity);
          if (el) {
            const cam = participant.getTrackPublication?.("camera")?.track;
            if (cam?.attach) cam.attach(el);
          }
          void syncParticipants(room);
        })
        .on(RoomEvent.TrackUnsubscribed, () => void syncParticipants(room))
        .on(RoomEvent.ParticipantConnected, () => void syncParticipants(room))
        .on(RoomEvent.ParticipantDisconnected, () => void syncParticipants(room))
        .on(RoomEvent.LocalTrackPublished, () => void syncParticipants(room))
        .on(RoomEvent.LocalTrackUnpublished, () => void syncParticipants(room))
        .on(RoomEvent.Disconnected, () => {
          setStage({ phase: "idle" });
          setParticipants([]);
        });

      await room.connect(creds.url, creds.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicOn(true);
      setStage({ phase: "live" });
      await syncParticipants(room);
      setNotice(`Connected to ${selected.title} as host.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not join the live room.";
      setStage({ phase: "error", message });
      setError(message);
      roomRef.current = null;
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
    await syncParticipants(room);
  };

  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
    await syncParticipants(room);
  };

  /** Screen share — the admin's presentation goes out as a separate track. */
  const toggleScreen = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !screenOn;
    try {
      await room.localParticipant.setScreenShareEnabled(next, { audio: true });
      setScreenOn(next);
      await syncParticipants(room);
    } catch (e: unknown) {
      /* A cancelled picker throws; that is a decision, not a failure. */
      const message = e instanceof Error ? e.message : "";
      if (/denied|cancel/i.test(message)) {
        setScreenOn(false);
        return;
      }
      setError(message || "Could not start screen sharing.");
    }
  };

  /* ---------- session lifecycle ---------- */

  const createSession = async (classroomId: string, classroomTitle: string) => {
    setError("");
    setNotice("");
    setBusy("create");
    try {
      const s = await adminFetch<Session>("/admin/sessions", {
        method: "POST",
        body: JSON.stringify({
          classroom_id: classroomId,
          title: newSessionTitle.trim() || `${classroomTitle} — live session`,
        }),
      });
      overview.reload();
      setSelectedId(s.id);
      setNewSessionTitle("");
      setNotice("Session created. Start it when you are ready to go live.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not create the session.");
    } finally {
      setBusy("");
    }
  };

  const setStatus = async (status: "scheduled" | "live" | "ended") => {
    if (!selected) return;
    setError("");
    setNotice("");
    setBusy(status);
    try {
      await adminFetch(`/admin/sessions/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (status === "ended") await leave();
      overview.reload();
      setNotice(
        status === "live"
          ? "You are live — every member in this classroom has been notified."
          : status === "ended"
            ? "Session ended and the end time recorded."
            : "Session returned to scheduled."
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update the session.");
    } finally {
      setBusy("");
    }
  };

  const setRecording = async (recording_status: string) => {
    if (!selected) return;
    setError("");
    setBusy("recording");
    try {
      await adminFetch(`/admin/sessions/${selected.id}/recording`, {
        method: "PATCH",
        body: JSON.stringify({ recording_status }),
      });
      overview.reload();
      setNotice(`Recording marked ${recording_status}.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update the recording state.");
    } finally {
      setBusy("");
    }
  };

  const learnerLink = selected
    ? `/classrooms/${selected.classroom_slug ?? selected.classroom_id}`
    : "";

  return (
    <Shell>
      <PageHead
        title="Live control"
        sub="Start a training session, present your screen and manage the room. Members are notified the moment you go live."
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-ghost" onClick={() => overview.reload()}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
            {learnerLink ? (
              <Link className="ad-btn ad-btn-ghost" href={learnerLink} target="_blank">
                <Icon name="external" size={14} /> Learner view
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => setError("")} /> : null}
      {notice ? (
        <Alert tone="ok" icon="check">
          {notice}
        </Alert>
      ) : null}

      <div className="ad-split">
        {/* ---------- stage ---------- */}
        <div className="ad-stack">
          <div className="ad-card ad-card-pad-0">
            <div className="ad-card-head">
              <span className="ad-card-title">
                {selected ? selected.title : "No session selected"}
              </span>
              {selected ? <StatusBadge status={selected.status} /> : null}
              {selected ? <StatusBadge status={selected.recording_status} /> : null}
              <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                {stage.phase === "live" ? (
                  <span className="ad-live-pill">
                    <span className="ad-live-dot" /> On air
                  </span>
                ) : null}
                {selected && selected.status === "live" && stage.phase !== "live" ? (
                  <span className="ad-live-pill">
                    <span className="ad-live-dot" /> Live
                  </span>
                ) : null}
              </span>
            </div>

            <div style={{ padding: 16 }}>
              <div className="ad-live-stage">
                {stage.phase === "live" ? (
                  <>
                    <video ref={localVideoRef} autoPlay muted playsInline />
                    {!camOn && !screenOn ? (
                      <p className="ad-live-placeholder" style={{ position: "absolute" }}>
                        <Icon name="screenShare" size={28} />
                        <span className="ad-sm">
                          Connected. Turn on your camera, or share your screen to present.
                        </span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="ad-live-placeholder">
                    <Icon name="radio" size={30} />
                    <p className="ad-sm">
                      {stage.phase === "connecting"
                        ? "Connecting to the live room…"
                        : selected
                          ? "Not connected. Join the room to present."
                          : "Pick a session on the right to begin."}
                    </p>
                    {selected ? (
                      <button
                        type="button"
                        className="ad-btn ad-btn-primary"
                        onClick={join}
                        disabled={stage.phase === "connecting"}
                      >
                        <Icon name="video" size={15} />
                        {stage.phase === "connecting" ? "Connecting…" : "Join live room"}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="ad-control-bar" role="toolbar" aria-label="Live session controls">
                <button
                  type="button"
                  className={`ad-ctrl${micOn ? "" : " is-off"}`}
                  onClick={toggleMic}
                  disabled={stage.phase !== "live"}
                  aria-pressed={micOn}
                >
                  <Icon name={micOn ? "mic" : "micOff"} size={15} />
                  {micOn ? "Mic on" : "Mic off"}
                </button>

                <button
                  type="button"
                  className={`ad-ctrl${camOn ? "" : " is-off"}`}
                  onClick={toggleCam}
                  disabled={stage.phase !== "live"}
                  aria-pressed={camOn}
                >
                  <Icon name={camOn ? "video" : "cameraOff"} size={15} />
                  {camOn ? "Camera on" : "Camera off"}
                </button>

                <button
                  type="button"
                  className={`ad-ctrl${screenOn ? "" : ""}`}
                  onClick={toggleScreen}
                  disabled={stage.phase !== "live"}
                  aria-pressed={screenOn}
                >
                  <Icon name="screenShare" size={15} />
                  {screenOn ? "Stop sharing" : "Share screen"}
                </button>

                <span style={{ flex: 1 }} />

                {stage.phase === "live" ? (
                  <button type="button" className="ad-ctrl is-off" onClick={() => void leave()}>
                    <Icon name="logOut" size={15} /> Leave room
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {participants.length > 0 ? (
            <>
              <SectionHead title="In the room" count={participants.length} />
              <div className="ad-tiles">
                {participants.map((p) => (
                  <div className="ad-tile" key={p.identity}>
                    <video
                      ref={(el) => {
                        tilesRef.current.set(p.identity, el);
                      }}
                      autoPlay
                      playsInline
                      muted={p.isLocal}
                    />
                    <span className="ad-tile-tag">
                      {p.name}
                      {p.isLocal ? " (you)" : ""}
                      {p.screenOn ? " · presenting" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {selected && selected.status !== "scheduled" ? (
            <>
              <SectionHead
                title="Attendance"
                count={(attendance.data ?? []).length}
                actions={
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => attendance.reload()}>
                    <Icon name="refresh" size={13} /> Refresh
                  </button>
                }
              />
              {attendance.loading ? (
                <Skeleton height={54} count={2} />
              ) : (attendance.data ?? []).length === 0 ? (
                <EmptyState
                  icon="users"
                  title="No one has joined yet"
                  body="Attendance is recorded when a learner opens the live room. It updates automatically while the session is live."
                />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <caption className="ad-sr-only">Learners who joined this session</caption>
                      <thead>
                        <tr>
                          <th scope="col">Learner</th>
                          <th scope="col">Email</th>
                          <th scope="col">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(attendance.data ?? []).map((a: any) => (
                          <tr key={`${a.user_id}-${a.joined_at}`}>
                            <td>{a.full_name || "—"}</td>
                            <td className="ad-muted">{a.email || "—"}</td>
                            <td className="ad-muted">{shortDateTime(a.joined_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* ---------- controls ---------- */}
        <div className="ad-stack">
          {selected ? (
            <div className="ad-card">
              <p className="ad-sec-title">Session controls</p>
              <div className="ad-stack" style={{ marginTop: 12, gap: 10 }}>
                {selected.status !== "live" ? (
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary ad-btn-block"
                    disabled={busy === "live" || stage.phase === "live"}
                    onClick={() => setStatus("live")}
                  >
                    <Icon name="play" size={15} />
                    {busy === "live" ? "Going live…" : "Start session"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ad-btn ad-btn-danger ad-btn-block"
                    disabled={busy === "ended"}
                    onClick={() => setStatus("ended")}
                  >
                    <Icon name="stop" size={15} />
                    {busy === "ended" ? "Ending…" : "End session"}
                  </button>
                )}

                {stage.phase !== "live" ? (
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-block" onClick={join}>
                    <Icon name="video" size={15} /> Join room without going live
                  </button>
                ) : null}

                <div className="ad-field">
                  <label className="ad-label" htmlFor="ad-rec">
                    Recording state
                  </label>
                  <select
                    id="ad-rec"
                    className="ad-select"
                    value={selected.recording_status}
                    disabled={busy === "recording"}
                    onChange={(e) => setRecording(e.target.value)}
                  >
                    <option value="none">Not recorded</option>
                    <option value="recording">Recording</option>
                    <option value="processing">Processing</option>
                    <option value="ready">Ready to watch</option>
                    <option value="failed">Failed</option>
                  </select>
                  <span className="ad-hint">
                    Ending a session moves a “Recording” session to “Processing” automatically.
                  </span>
                </div>

                <dl className="ad-sm ad-muted" style={{ display: "grid", gap: 6 }}>
                  <div>
                    <dt className="ad-faint">Classroom</dt>
                    <dd>{selected.classroom_title ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="ad-faint">Starts</dt>
                    <dd>{shortDateTime(selected.starts_at)}</dd>
                  </div>
                  <div>
                    <dt className="ad-faint">Members</dt>
                    <dd>{selected.members ?? 0}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}

          <div className="ad-card ad-card-pad-0">
            <div className="ad-card-head">
              <span className="ad-card-title">Sessions</span>
              <span style={{ marginLeft: "auto" }}>
                <Badge>{sessions.live.length + sessions.upcoming.length + sessions.past.length}</Badge>
              </span>
            </div>

            {overview.loading ? (
              <div style={{ padding: 16 }}>
                <Skeleton height={48} count={3} />
              </div>
            ) : overview.error ? (
              <div style={{ padding: 16 }}>
                <ErrorNote message={overview.error} onRetry={overview.reload} />
              </div>
            ) : sessions.live.length + sessions.upcoming.length + sessions.past.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState
                  icon="radio"
                  title="No sessions yet"
                  body="Create one from a classroom below to start training."
                />
              </div>
            ) : (
              <div>
                {[...sessions.live, ...sessions.upcoming, ...sessions.past].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className="ad-conv"
                    style={{ borderRadius: 0, width: "100%" }}
                    aria-selected={s.id === selectedId}
                    onClick={() => {
                      setSelectedId(s.id);
                      setNotice("");
                      if (stage.phase === "live") void leave();
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="ad-conv-title">{s.title}</span>
                      <span className="ad-conv-preview">
                        {s.classroom_title ?? "—"} · {shortDateTime(s.starts_at)}
                      </span>
                    </span>
                    <StatusBadge status={s.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ad-card">
            <p className="ad-sec-title">Start a session in a classroom</p>
            <p className="ad-sm ad-muted" style={{ marginTop: 4 }}>
              Every classroom has its own LiveKit room. Creating a session here uses it.
            </p>
            <div className="ad-stack" style={{ marginTop: 12, gap: 10 }}>
              <div className="ad-field">
                <label className="ad-label" htmlFor="ad-session-title">
                  Session title (optional)
                </label>
                <input
                  id="ad-session-title"
                  className="ad-input"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="e.g. Week 3 — deep dive"
                />
              </div>
              {overview.loading ? (
                <Skeleton height={40} count={2} />
              ) : (overview.data?.classrooms ?? []).length === 0 ? (
                <p className="ad-sm ad-muted">No classrooms exist yet. Create one first.</p>
              ) : (
                <ul style={{ display: "grid", gap: 8 }}>
                  {(overview.data?.classrooms ?? []).map((c) => (
                    <li key={c.id} className="ad-row" style={{ padding: "10px 12px", border: "1px solid var(--ad-border)", borderRadius: 12 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="ad-row-title">{c.title}</span>
                        <span className="ad-row-meta">{c.members} members</span>
                      </span>
                      <button
                        type="button"
                        className="ad-btn ad-btn-ghost ad-btn-sm"
                        disabled={busy === "create"}
                        onClick={() => createSession(c.id, c.title)}
                      >
                        <Icon name="plus" size={13} /> New session
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
