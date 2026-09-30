"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Icon } from "@/components/ui/icons";
import { api, type CatalogClassroom, type ClassroomSession } from "@/lib/dashboard-api";

/*
  Live room — deliberately full-screen and outside the dashboard chrome, because
  a video call needs the whole viewport. It re-uses the rebuild tokens by
  mounting inside a `.reb` scope, so the gate screen and the in-room bar read as
  the same product as the dashboard.
*/

function RoomView({ slug }: { slug: string }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--rail)",
        }}
      >
        <Link href={`/classrooms/${slug}`} className="btn ghost sm">
          <Icon name="arrowLeft" size={14} /> Classroom
        </Link>
        <span className="live-pill">
          <i aria-hidden="true" /> LIVE
        </span>
        <span className="hint" style={{ marginLeft: "auto" }}>
          Camera and screen share are on — the instructor&apos;s screen takes over the grid when shared.
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
        <GridLayout tracks={tracks} style={{ height: "100%" }}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <div style={{ borderTop: "1px solid var(--border)", padding: 12, background: "var(--rail)" }}>
        <ControlBar variation="minimal" saveUserChoices />
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

export default function LiveRoomPage({ params }: { params: { slug: string } }) {
  const [classroom, setClassroom] = useState<CatalogClassroom | null>(null);
  const [live, setLive] = useState<ClassroomSession | null>(null);
  const [token, setToken] = useState("");
  const [connect, setConnect] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

  useEffect(() => {
    (async () => {
      try {
        const c = await api.classroom(params.slug);
        setClassroom(c);
        try {
          const ws = await api.classroomWorkspace(c.id);
          setLive((ws.sessions ?? []).find((s) => s.status === "live") ?? null);
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

  if (connect && token) {
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
          <RoomView slug={params.slug} />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <div
      className="reb"
      data-theme="dark"
      style={{
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
      }}
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
                screen sharing included.
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
