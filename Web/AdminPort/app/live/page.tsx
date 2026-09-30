"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Sk } from "@/components/reb-ui";
import { AdminLiveComments } from "@/components/admin-live-comments";
import { adminFetch, initials, shortDateTime } from "@/lib/admin";
import { useAdmin, useAdminPoll } from "@/lib/use-admin";
import type { LiveOverview, LiveToken, Session } from "@/lib/admin-types";

/*
  Live control room — ported from demo/rebuild-admin.html (#/live): top bar,
  stage with camera tiles / screen share, side panel (sessions, people,
  controls) and the bottom control bar.

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

type PanelTab = "sessions" | "people" | "controls" | "discussion";

function statusTone(status: string): "" | "ok" | "warn" | "danger" | "info" {
  if (status === "live" || status === "recording") return "danger";
  if (status === "scheduled" || status === "processing") return "info";
  if (status === "ready") return "ok";
  if (status === "failed") return "warn";
  return "";
}

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
  const [participants, setParticipants] = useState<
    { identity: string; name: string; isLocal: boolean; camOn: boolean; screenOn: boolean }[]
  >([]);
  const [tab, setTab] = useState<PanelTab>("sessions");
  const [panelOn, setPanelOn] = useState(false);

  const roomRef = useRef<any>(null);
  const tilesRef = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);

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

  const syncParticipants = useCallback(async (room: any) => {
    const locals = room.localParticipant;
    const remotes = Array.from(room.remoteParticipants?.values?.() ?? []) as any[];
    const all = [locals, ...remotes].filter(Boolean);
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
    /* The shared screen takes over the stage while it is on. */
    const screenTrack = locals?.getTrackPublication?.("screen_share")?.track;
    if (screenTrack?.attach && stageVideoRef.current) {
      screenTrack.attach(stageVideoRef.current);
    } else if (stageVideoRef.current && stageVideoRef.current.srcObject) {
      stageVideoRef.current.srcObject = null;
    }
    setParticipants(list);
  }, []);

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

      const { Room, RoomEvent } = await import("livekit-client");
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
      setTab("people");
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
      setTab("controls");
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

  const endPress = async () => {
    if (selected?.status === "live") await setStatus("ended");
    else await leave();
  };

  const dataState =
    stage.phase === "live" ? (screenOn ? "screen" : "cameras") : stage.phase === "connecting" ? "connecting" : "setup";

  const totalSessions = sessions.live.length + sessions.upcoming.length + sessions.past.length;
  const recording = selected?.recording_status === "recording";

  return (
    <Shell>
      <div className="livepage lv" data-state={dataState}>
        {error ? (
          <div style={{ padding: "10px 14px 0", flex: "none" }}>
            <Err msg={error} onRetry={() => setError("")} />
          </div>
        ) : null}
        {notice ? (
          <div className="alert" role="status" style={{ margin: "10px 14px 0", flex: "none" }}>
            <Ic name="check" size={16} />
            <span style={{ flex: 1 }}>{notice}</span>
            <button type="button" className="reb-btn ghost sm" onClick={() => setNotice("")}>
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="lv-shell">
          {/* ---------- top bar ---------- */}
          <header className="lv-top">
            {selected?.status === "live" ? (
              <span className="live-pill">
                <i aria-hidden="true" /> LIVE
              </span>
            ) : null}
            <span className="ttl">
              <b>{selected?.title ?? "Live control"}</b>
              <span>
                {selected
                  ? `${selected.classroom_title ?? "Classroom"} · recording ${selected.recording_status}`
                  : "Pick a session, or create one from a classroom"}
              </span>
            </span>
            <span className="sp" />
            {stage.phase === "live" ? (
              <span className="viewers">
                <Ic name="users" size={14} /> {participants.length} in room
              </span>
            ) : null}
            {selected ? (
              <span className="viewers">
                <Ic name="users" size={14} /> {selected.members ?? 0} members
              </span>
            ) : null}
            <button type="button" className="icon-btn" onClick={() => overview.reload()} aria-label="Refresh overview">
              <Ic name="refresh" size={16} />
            </button>
            <button
              type="button"
              className="icon-btn lv-panel-toggle"
              onClick={() => setPanelOn((v) => !v)}
              aria-label="Toggle the side panel"
            >
              <Ic name="inbox" size={18} />
            </button>
          </header>

          {/* ---------- stage + panel ---------- */}
          <div className="lv-main">
            <div className="lv-stagecol">
              <div className="lv-stage">
                {stage.phase === "live" || stage.phase === "connecting" ? (
                  <>
                    {screenOn ? (
                      <>
                        <video
                          ref={stageVideoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ width: "100%", height: "100%", objectFit: "contain", background: "#0d1117" }}
                        />
                        <span className="share-tag">
                          <i aria-hidden="true" /> You are sharing your screen · {participants.length} watching
                        </span>
                      </>
                    ) : participants.length > 0 ? (
                      <div className={`camgrid${participants.length > 2 ? " n3" : ""}`}>
                        {participants.map((p) => (
                          <div className="camtile" key={p.identity}>
                            <video
                              ref={(el) => {
                                tilesRef.current.set(p.identity, el);
                              }}
                              autoPlay
                              playsInline
                              muted={p.isLocal}
                              style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000" }}
                            />
                            {!p.camOn ? (
                              <span className="camoff" aria-label="Camera off">
                                <Ic name="cameraOff" size={14} />
                              </span>
                            ) : null}
                            <span className="cname">
                              <Ic name="user" size={12} />
                              {p.name}
                              {p.isLocal ? " (you)" : ""}
                              {p.screenOn ? " · presenting" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty" style={{ padding: 0, textAlign: "center", maxWidth: 360 }}>
                        <div className="ico">
                          <Ic name={stage.phase === "connecting" ? "refresh" : "radio"} size={26} />
                        </div>
                        <h3>{stage.phase === "connecting" ? "Connecting…" : "Connected"}</h3>
                        <p>Turn on your camera, or share your screen to present to the class.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty" style={{ padding: 0, textAlign: "center", maxWidth: 380 }}>
                    <div className="ico">
                      <Ic name="radio" size={26} />
                    </div>
                    <h3>{selected ? selected.title : "No session selected"}</h3>
                    <p>
                      {stage.phase === "error"
                        ? "The room could not be joined — check the message above and retry."
                        : selected
                          ? "Join the room to present. Going live notifies every member of the classroom."
                          : "Pick a session in the panel, or create one from a classroom."}
                    </p>
                    {selected ? (
                      <button type="button" className="reb-btn pri" onClick={join}>
                        <Ic name="video" size={15} />
                        {stage.phase === "error" ? "Retry joining" : "Join live room"}
                      </button>
                    ) : (
                      <button type="button" className="reb-btn ghost" onClick={() => setTab("sessions")}>
                        <Ic name="calendar" size={15} /> Open sessions
                      </button>
                    )}
                  </div>
                )}
              </div>

              {screenOn && participants.length > 0 ? (
                <div className="lv-film">
                  {participants.map((p) => (
                    <div className="camtile" key={`film-${p.identity}`}>
                      <video
                        ref={(el) => {
                          tilesRef.current.set(`film-${p.identity}`, el);
                        }}
                        autoPlay
                        playsInline
                        muted={p.isLocal}
                        style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000" }}
                      />
                      <span className="cname">{p.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className={`lv-panel${panelOn ? " on" : ""}`} aria-label="Session panel">
              <div className="lv-tabs" role="tablist" aria-label="Panel sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "sessions"}
                  className={tab === "sessions" ? "on" : undefined}
                  onClick={() => setTab("sessions")}
                >
                  Sessions <span className="cnt">{totalSessions}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "people"}
                  className={tab === "people" ? "on" : undefined}
                  onClick={() => setTab("people")}
                >
                  People <span className="cnt">{participants.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "controls"}
                  className={tab === "controls" ? "on" : undefined}
                  onClick={() => setTab("controls")}
                >
                  Controls
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "discussion"}
                  className={tab === "discussion" ? "on" : undefined}
                  onClick={() => setTab("discussion")}
                >
                  Discussion
                </button>
              </div>

              {/* ---- discussion: the learner Q&A that used to have nowhere to go ---- */}
              {tab === "discussion" ? (
                <div className="lv-pane" style={{ overflowY: "auto", padding: 12 }}>
                  {selected ? (
                    <AdminLiveComments classroomId={selected.classroom_id} className="reb-card" disabled={selected.status === "ended"} />
                  ) : (
                    <Emp
                      icon="messageSquare"
                      title="No session selected"
                      note="Pick a session first — its classroom discussion opens here, and your answers go straight back to the learners."
                    />
                  )}
                </div>
              ) : null}

              {/* ---- sessions ---- */}
              {tab === "sessions" ? (
                <div className="lv-pane" style={{ overflowY: "auto", padding: 12 }}>
                  <div className="field">
                    <label className="kind" htmlFor="lv-session-title">
                      New session title (optional)
                    </label>
                    <input
                      id="lv-session-title"
                      className="reb-input"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      placeholder="e.g. Week 3 — deep dive"
                    />
                  </div>

                  <span className="kind">Start a session in a classroom</span>
                  <p className="hint" style={{ margin: "4px 0 8px" }}>
                    Every classroom has its own LiveKit room — creating a session uses it.
                  </p>
                  {overview.loading ? (
                    <Sk h={40} mb={8} />
                  ) : (overview.data?.classrooms ?? []).length === 0 ? (
                    <Emp icon="monitorPlay" title="No classrooms yet" note="Create a classroom first, then start its session here." />
                  ) : (
                    <div style={{ marginBottom: 14 }}>
                      {(overview.data?.classrooms ?? []).map((c) => (
                        <div key={c.id} className="qa" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <b style={{ fontSize: 12.5 }}>{c.title}</b>
                            <span className="hint" style={{ display: "block" }}>
                              {c.members} members
                            </span>
                          </span>
                          <button
                            type="button"
                            className="reb-btn ghost sm"
                            disabled={busy === "create"}
                            onClick={() => createSession(c.id, c.title)}
                          >
                            <Ic name="plus" size={13} /> New
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="kind">Sessions</span>
                  <div style={{ marginTop: 8 }}>
                    {overview.loading ? (
                      <Sk h={46} mb={8} />
                    ) : overview.error ? (
                      <Err msg={overview.error} onRetry={overview.reload} />
                    ) : totalSessions === 0 ? (
                      <Emp icon="calendar" title="No sessions yet" note="Create one from a classroom above to start training." />
                    ) : (
                      [...sessions.live, ...sessions.upcoming, ...sessions.past].map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          className="qa"
                          aria-pressed={s.id === selectedId}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            borderColor: s.id === selectedId ? "var(--brand-line)" : undefined,
                          }}
                          onClick={() => {
                            setSelectedId(s.id);
                            setNotice("");
                            setTab("controls");
                            if (stage.phase === "live") void leave();
                          }}
                        >
                          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <b style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{s.title}</b>
                            <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                          </span>
                          <span className="hint" style={{ display: "block", marginTop: 4 }}>
                            {s.classroom_title ?? "—"} · {shortDateTime(s.starts_at)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {/* ---- people ---- */}
              {tab === "people" ? (
                <div className="lv-pane" style={{ overflowY: "auto", padding: 12 }}>
                  <span className="kind">In the room · {participants.length}</span>
                  <div style={{ margin: "8px 0 16px" }}>
                    {participants.length === 0 ? (
                      <Emp icon="users" title="Room is empty" note="Join the room to bring your camera into the grid." />
                    ) : (
                      participants.map((p) => (
                        <div key={p.identity} className="person">
                          <span className="avatar sm">{initials(p.name)}</span>
                          <span className="pn">
                            <b>{p.name}</b>
                            <span>
                              {p.isLocal ? "host" : "member"}
                              {p.camOn ? "" : " · camera off"}
                              {p.screenOn ? " · presenting" : ""}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {selected && selected.status !== "scheduled" ? (
                    <>
                      <span className="kind">Attendance</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
                        <span className="hint">{(attendance.data ?? []).length} joined</span>
                        <button
                          type="button"
                          className="reb-btn ghost sm"
                          style={{ marginLeft: "auto" }}
                          onClick={() => attendance.reload()}
                        >
                          <Ic name="refresh" size={13} /> Refresh
                        </button>
                      </div>
                      {attendance.loading ? (
                        <Sk h={40} mb={6} />
                      ) : (attendance.data ?? []).length === 0 ? (
                        <Emp
                          icon="users"
                          title="No one has joined yet"
                          note="Attendance is recorded when a learner opens the live room."
                        />
                      ) : (
                        <table className="tbl">
                          <caption style={{ display: "none" }}>Learners who joined this session</caption>
                          <thead>
                            <tr>
                              <th scope="col">Learner</th>
                              <th scope="col">Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(attendance.data ?? []).map((a: any) => (
                              <tr key={`${a.user_id}-${a.joined_at}`}>
                                <td>{a.full_name || a.email || "—"}</td>
                                <td className="hint">{shortDateTime(a.joined_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* ---- controls ---- */}
              {tab === "controls" ? (
                <div className="lv-pane" style={{ overflowY: "auto", padding: 12 }}>
                  {!selected ? (
                    <Emp icon="calendar" title="No session selected" note="Pick a session in the Sessions tab first." />
                  ) : (
                    <>
                      {selected.status !== "live" ? (
                        <button
                          type="button"
                          className="reb-btn pri block"
                          disabled={busy === "live" || stage.phase === "live"}
                          onClick={() => setStatus("live")}
                        >
                          <Ic name="play" size={15} />
                          {busy === "live" ? "Going live…" : "Start session"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="reb-btn danger block"
                          disabled={busy === "ended"}
                          onClick={() => setStatus("ended")}
                        >
                          <Ic name="stop" size={15} />
                          {busy === "ended" ? "Ending…" : "End session"}
                        </button>
                      )}

                      {stage.phase !== "live" ? (
                        <button type="button" className="reb-btn ghost block" style={{ marginTop: 8 }} onClick={join}>
                          <Ic name="video" size={15} /> Join room without going live
                        </button>
                      ) : null}

                      <div className="field" style={{ marginTop: 16 }}>
                        <label className="kind" htmlFor="lv-rec">
                          Recording
                        </label>
                        <select
                          id="lv-rec"
                          className="select"
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
                        <span className="hint">
                          Ending a session moves a “Recording” session to “Processing” automatically.
                        </span>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <div className="kv">
                          <b>Status</b>
                          <span>
                            <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                          </span>
                        </div>
                        <div className="kv">
                          <b>Classroom</b>
                          <span>{selected.classroom_title ?? "—"}</span>
                        </div>
                        <div className="kv">
                          <b>Starts</b>
                          <span>{shortDateTime(selected.starts_at)}</span>
                        </div>
                        <div className="kv">
                          <b>Members</b>
                          <span>{selected.members ?? 0}</span>
                        </div>
                      </div>

                      <Link
                        className="reb-btn ghost block"
                        style={{ marginTop: 14 }}
                        href={`/classrooms/${selected.classroom_slug ?? selected.classroom_id}`}
                        target="_blank"
                      >
                        <Ic name="external" size={14} /> Learner view
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
            </aside>
          </div>

          {/* ---------- control bar ---------- */}
          <footer className="lv-bar" role="toolbar" aria-label="Live session controls">
            <button
              type="button"
              className={`cbtn ${micOn ? "on" : "off"}`}
              onClick={toggleMic}
              disabled={stage.phase !== "live"}
              aria-pressed={micOn}
            >
              <span className="cc">
                <Ic name={micOn ? "mic" : "micOff"} size={20} />
              </span>
              <span className="lb">{micOn ? "Mute" : "Unmute"}</span>
            </button>

            <button
              type="button"
              className={`cbtn ${camOn ? "on" : "off"}`}
              onClick={toggleCam}
              disabled={stage.phase !== "live"}
              aria-pressed={camOn}
            >
              <span className="cc">
                <Ic name={camOn ? "video" : "cameraOff"} size={20} />
              </span>
              <span className="lb">{camOn ? "Camera off" : "Camera on"}</span>
            </button>

            <button
              type="button"
              className={`cbtn${screenOn ? " on" : ""}`}
              onClick={toggleScreen}
              disabled={stage.phase !== "live"}
              aria-pressed={screenOn}
            >
              <span className="cc">
                <Ic name="screenShare" size={20} />
              </span>
              <span className="lb">{screenOn ? "Sharing" : "Share"}</span>
            </button>

            <button
              type="button"
              className={`cbtn${recording ? " on" : ""}`}
              disabled={!selected || busy === "recording"}
              onClick={() => setRecording(recording ? "none" : "recording")}
              aria-pressed={recording}
            >
              <span className="cc">
                <Ic name="layers" size={20} />
              </span>
              <span className="lb">{recording ? "Recording" : "Record"}</span>
            </button>

            <button
              type="button"
              className="cbtn lv-panel-toggle"
              onClick={() => setPanelOn((v) => !v)}
              aria-label="Toggle the side panel"
            >
              <span className="cc">
                <Ic name="inbox" size={20} />
              </span>
              <span className="lb">Panel</span>
            </button>

            <button
              type="button"
              className="cbtn leave"
              onClick={() => void endPress()}
              disabled={!selected && stage.phase !== "live"}
            >
              <span className="cc">
                <Ic name="x" size={20} />
              </span>
              <span className="lb">{selected?.status === "live" ? "End" : "Leave"}</span>
            </button>
          </footer>
        </div>
      </div>
    </Shell>
  );
}
