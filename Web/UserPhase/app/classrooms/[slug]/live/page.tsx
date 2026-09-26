"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import {
  LiveKitRoom, GridLayout, ParticipantTile, RoomAudioRenderer,
  ControlBar, useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { apiFetch } from "@/lib/client";

function RoomView({ slug }: { slug: string }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Link href={`/classrooms/${slug}`} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-[12.5px] font-bold text-slate-300 hover:text-white">
          <ArrowLeft size={14} /> Classroom
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-[11.5px] font-bold text-rose-200">
          <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" /><span className="h-2 w-2 rounded-full bg-rose-400" /></span>
          LIVE
        </span>
      </div>
      <div className="min-h-0 flex-1 p-3">
        <GridLayout tracks={tracks} className="h-full">
          <ParticipantTile />
        </GridLayout>
      </div>
      <div className="border-t border-white/10 p-3">
        <ControlBar variation="minimal" saveUserChoices />
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

export default function LiveRoomPage({ params }: { params: { slug: string } }) {
  const [classroom, setClassroom] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [token, setToken] = useState("");
  const [connect, setConnect] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/classrooms/${params.slug}`);
        if (!res.ok) throw new Error("Classroom not found.");
        const c = await res.json();
        setClassroom(c);
        try {
          const ws = await apiFetch(`/scope/classrooms/${c.id}/workspace`);
          setLive((ws.sessions ?? []).find((s: any) => s.status === "live") ?? null);
        } catch {
          setLive(null);
        }
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [params.slug]);

  async function join() {
    setErr(""); setBusy(true);
    try {
      const r = await apiFetch("/live/token", { method: "POST", body: JSON.stringify({ classroom_id: classroom.id }) });
      setToken(r.token);
      setConnect(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (connect && token) {
    return (
      <main className="h-screen bg-stone-950">
        <LiveKitRoom serverUrl={wsUrl} token={token} connect audio video
          className="h-full"
          onDisconnected={() => { setConnect(false); setToken(""); }}>
          <RoomView slug={params.slug} />
        </LiveKitRoom>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-stone-900/80 p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Radio size={20} className={live ? "text-rose-300" : "text-slate-500"} />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold">{classroom?.title ?? "Live classroom"}</h1>
        {err && <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-200">{err}</p>}
        {!classroom && !err && <p className="mt-3 text-sm text-slate-400">Loading…</p>}
        {classroom && !live && (
          <>
            <p className="mt-2 text-sm text-slate-400">No live session right now. You will be notified the second the instructor starts — members only.</p>
            <Link href={`/classrooms/${params.slug}`} className="mt-6 inline-block rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5">Back to classroom</Link>
          </>
        )}
        {classroom && live && (
          <>
            <p className="mt-2 text-sm text-slate-400"><b className="text-white">{live.title}</b> is live now. Join with camera and mic — screen sharing included.</p>
            <button onClick={join} disabled={busy} className="btn-aurora mt-6 w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Checking access…" : "Join live classroom"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
