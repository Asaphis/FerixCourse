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
  a video call needs the whole viewport. Restyled onto the dashboard tokens so
  it reads as the same product, with the same focus ring and live indicator.
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
          borderBottom: "1px solid var(--fc-border)",
        }}
      >
        <Link href={`/classrooms/${slug}`} className="fc-btn fc-btn-ghost fc-btn-sm">
          <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Classroom
        </Link>
        <span className="fc-live-pill">
          <span className="fc-dot" /> LIVE
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
        <GridLayout tracks={tracks} style={{ height: "100%" }}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <div style={{ borderTop: "1px solid var(--fc-border)", padding: 12 }}>
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
      <div className="fc-dash" data-theme="dark" style={{ height: "100vh" }}>
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
      className="fc-dash"
      data-theme="dark"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div className="fc-card" style={{ width: "100%", maxWidth: 440, textAlign: "center", padding: 32 }}>
        <span
          className="fc-empty-ico"
          style={{ margin: "0 auto 16px", ...(live ? { background: "var(--fc-danger-bg)", color: "var(--fc-danger-fg)", borderColor: "transparent" } : undefined) }}
          aria-hidden="true"
        >
          <Icon name="radio" size={22} />
        </span>
        <h1 style={{ fontSize: 20 }}>{classroom?.title ?? "Live classroom"}</h1>

        {err && (
          <div className="fc-alert fc-alert-danger" role="alert" style={{ marginTop: 16, textAlign: "left" }}>
            <Icon name="alertCircle" size={17} />
            <span>{err}</span>
          </div>
        )}

        {!classroom && !err && <p style={{ marginTop: 10, fontSize: 13.5, color: "var(--fc-muted)" }}>Loading…</p>}

        {classroom && !live && (
          <>
            <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--fc-muted)" }}>
              No live session right now. You will be notified the second the instructor starts — members only.
            </p>
            <Link href={`/classrooms/${params.slug}`} className="fc-btn fc-btn-ghost" style={{ marginTop: 20 }}>
              Back to classroom
            </Link>
          </>
        )}

        {classroom && live && (
          <>
            <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--fc-muted)" }}>
              <strong style={{ color: "var(--fc-text)" }}>{live.title}</strong> is live now. Join with camera and mic —
              screen sharing included.
            </p>
            <button type="button" onClick={join} disabled={busy} className="fc-btn fc-btn-primary fc-btn-block" style={{ marginTop: 20 }}>
              <Icon name="video" size={16} /> {busy ? "Checking access…" : "Join live classroom"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
