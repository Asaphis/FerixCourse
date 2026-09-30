"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Icon } from "@/components/ui/icons";
import { LiveControls } from "@/components/live/live-controls";
import { LiveComments } from "@/components/live/live-comments";
import { api, type CatalogClassroom, type ClassroomMessage, type ClassroomSession } from "@/lib/dashboard-api";

/*
  Live room — full-screen and outside the dashboard chrome, because a video call
  needs the whole viewport. Same tokens as the dashboard (mounted in a `.reb`
  scope) so the gate screen and the in-room bar read as one product.

  What changed here:
    • the library ControlBar is replaced by <LiveControls/>, which adds screen
      sharing as a first-class button (plus mic, camera, raise hand) in the
      product's own style;
    • <LiveComments/> adds the class discussion that was missing entirely —
      replies, attachments, and the classroom's existing message history;
    • stage and comments sit side by side on a desktop and stack on a phone
      (the wrapper carries .stagewrap / .openchat, handled by fix.css).

  Access is unchanged: POST /live/token is still the only way in, and it still
  checks classroom membership server-side before issuing anything.
*/

function RoomView({ slug, classroomId, initial }: { slug: string; classroomId: string; initial: ClassroomMessage[] }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notice, setNotice] = useState("");
  const [sharingSeen, setSharingSeen] = useState(false);

  const sharing = tracks.some((t) => t.source === Track.Source.ScreenShare);

  useEffect(() => {
    if (sharing && !sharingSeen) setSharingSeen(true);
  }, [sharing, sharingSeen]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--rail)",
          flexWrap: "wrap",
        }}
      >
        <Link href={`/classrooms/${slug}`} className="btn ghost sm">
          <Icon name="arrowLeft" size={14} /> Classroom
        </Link>
        <span className="live-pill">
          <i aria-hidden="true" /> LIVE
        </span>
        {sharing && <span className="pill">Someone is sharing their screen</span>}
        <span className="hint" style={{ marginLeft: "auto" }}>
          Camera, microphone and screen sharing are all yours to control.
        </span>
      </div>

      {notice && (
        <div className="alert danger" role="status" style={{ margin: "10px 16px 0" }}>
          <Icon name="alertCircle" size={16} />
          <span>{notice}</span>
          <button type="button" className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      )}

      <div
        className={"stagewrap" + (commentsOpen ? " openchat" : "")}
        style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16, padding: 12, alignItems: "start" }}
      >
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div style={{ minHeight: 260, borderRadius: "var(--r3, 16px)", overflow: "hidden", border: "1px solid var(--border)", background: "#0d0b0a" }}>
            <GridLayout tracks={tracks} style={{ height: "100%" }}>
              <ParticipantTile />
            </GridLayout>
          </div>

          <LiveControls
            commentsOpen={commentsOpen}
            onToggleComments={() => {
              setCommentsOpen((v) => !v);
              setUnread(0);
            }}
            unread={unread}
            onNotice={setNotice}
          />
        </div>

        <aside className="panel" style={{ minWidth: 0 }}>
          <LiveComments
            classroomId={classroomId}
            initial={initial}
            className="card"
            onMessage={() => {
              if (!commentsOpen) setUnread((n) => n + 1);
            }}
          />
        </aside>
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

export default function LiveRoomPage({ params }: { params: { slug: string } }) {
  const [classroom, setClassroom] = useState<CatalogClassroom | null>(null);
  const [live, setLive] = useState<ClassroomSession | null>(null);
  const [initial, setInitial] = useState<ClassroomMessage[]>([]);
  const [token, setToken] = useState("");
  const [connect, setConnect] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

  useEffect(() => {
    (async () => {
      try {
        const cls = await api.classroom(params.slug);
        setClassroom(cls);
        try {
          const ws = await api.classroomWorkspace(cls.id);
          setLive((ws.sessions ?? []).find((s) => s.status === "live") ?? null);
          setInitial(ws.messages ?? []);
        } catch {
          setLive(null);
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Classroom not found.");
      }
    })();
  }, [params.slug]);

  async function join() {
    if (!classroom) return;
    setErr("");
    setBusy(true);
    try {
      const r = await api.liveToken({ classroom_id: classroom.id });
      setToken(r.token);
      setConnect(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not get a room token.");
    } finally {
      setBusy(false);
    }
  }

  if (connect && token && classroom) {
    return (
      <div className="reb" data-theme="dark" style={{ height: "100vh" }}>
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect
          audio
          video
          style={{ height: "100%", width: "100%" }}
          onDisconnected={() => {
            setConnect(false);
            setToken("");
          }}
        >
          <RoomView slug={params.slug} classroomId={classroom.id} initial={initial} />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <div
      className="reb"
      data-theme="dark"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 440, textAlign: "center", padding: 32 }}>
        <div className="empty" style={{ padding: 0 }}>
          <div
            className="ico"
            style={{
              margin: "0 auto 16px",
              ...(live
                ? { background: "rgba(248, 113, 113, 0.14)", color: "#fca5a5", borderColor: "rgba(248, 113, 113, 0.4)" }
                : undefined),
            }}
            aria-hidden="true"
          >
            <Icon name="radio" size={22} />
          </div>
          <h3>{classroom?.title ?? "Live classroom"}</h3>

          {err && (
            <div className="alert danger" role="alert" style={{ marginTop: 16, textAlign: "left" }}>
              <Icon name="alertCircle" size={17} />
              <span>{err}</span>
            </div>
          )}

          {!classroom && !err && <p className="sub">Loading…</p>}

          {classroom && !live && (
            <>
              <p className="sub">
                No live session right now. You will be notified the second the instructor starts — members only.
              </p>
              <Link href={`/classrooms/${params.slug}`} className="btn ghost" style={{ marginTop: 20 }}>
                Back to classroom
              </Link>
            </>
          )}

          {classroom && live && (
            <>
              <p className="sub">
                <strong style={{ color: "var(--text)" }}>{live.title}</strong> is live now. Join with camera and mic —
                screen sharing and the class discussion are inside.
              </p>
              <button type="button" onClick={join} disabled={busy} className="btn pri" style={{ marginTop: 20, width: "100%" }}>
                <Icon name="video" size={16} /> {busy ? "Checking access…" : "Join live classroom"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
