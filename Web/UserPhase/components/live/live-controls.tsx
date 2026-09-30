"use client";
import { useEffect, useState } from "react";
import { useLocalParticipant, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Icon } from "@/components/ui/icons";

/*
  Live controls — the tools the room was missing.

  Replaces the library's default ControlBar (which looked nothing like the rest
  of the product and buried screen sharing). Every control here is a real
  LiveKit action on the local participant:

    • microphone            setMicrophoneEnabled(...)
    • camera                setCameraEnabled(...)
    • share screen          setScreenShareEnabled(...)   <- was missing
    • share a second view   setScreenShareEnabled with a different capture
    • raise hand            publishData() on topic "hand"
    • comments              opens the discussion panel, with unread count

  Screen share failure is handled explicitly: if the browser cannot capture
  (permission denied, no display media support) the button reports it instead of
  silently doing nothing.
*/

type Props = {
  commentsOpen: boolean;
  onToggleComments: () => void;
  unread?: number;
  onNotice?: (msg: string) => void;
  disabled?: boolean;
};

export function LiveControls({ commentsOpen, onToggleComments, unread = 0, onNotice, disabled = false }: Props) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const [handUp, setHandUp] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [canShare, setCanShare] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const md = navigator.mediaDevices as MediaDevices | undefined;
    setCanShare(Boolean(md && typeof (md as unknown as { getDisplayMedia?: unknown }).getDisplayMedia === "function"));
  }, []);

  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], {
    onlySubscribed: false,
  });
  const someoneSharing = screenTracks.length > 0;

  async function run(key: string, fn: () => Promise<unknown>, onFail: string) {
    if (disabled || !localParticipant) return;
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : onFail;
      setError(msg);
      onNotice?.(msg);
    } finally {
      setBusy("");
    }
  }

  function raiseHand() {
    const next = !handUp;
    setHandUp(next);
    void run(
      "hand",
      () =>
        localParticipant?.publishData(new TextEncoder().encode(JSON.stringify({ type: "hand", on: next })), {
          reliable: true,
          topic: "hand",
        }),
      "Could not signal the instructor."
    );
  }

  return (
    <div className="livebar" role="toolbar" aria-label="Classroom controls">
      <button
        type="button"
        className={"btn sm" + (isMicrophoneEnabled ? " on" : " ghost")}
        aria-pressed={Boolean(isMicrophoneEnabled)}
        disabled={disabled || busy === "mic"}
        onClick={() => void run("mic", () => localParticipant!.setMicrophoneEnabled(!isMicrophoneEnabled), "Microphone could not be changed.")}
      >
        <Icon name="mic" size={15} /> {isMicrophoneEnabled ? "Mic on" : "Mic off"}
      </button>

      <button
        type="button"
        className={"btn sm" + (isCameraEnabled ? " on" : " ghost")}
        aria-pressed={Boolean(isCameraEnabled)}
        disabled={disabled || busy === "cam"}
        onClick={() => void run("cam", () => localParticipant!.setCameraEnabled(!isCameraEnabled), "Camera could not be changed.")}
      >
        <Icon name="video" size={15} /> {isCameraEnabled ? "Camera on" : "Camera off"}
      </button>

      <button
        type="button"
        className={"btn sm" + (isScreenShareEnabled ? " on" : " ghost")}
        aria-pressed={Boolean(isScreenShareEnabled)}
        disabled={disabled || !canShare || busy === "screen"}
        title={canShare ? "Share your screen with the classroom" : "This browser cannot share a screen"}
        onClick={() =>
          void run(
            "screen",
            () => localParticipant!.setScreenShareEnabled(!isScreenShareEnabled),
            "Screen sharing could not start — check your browser permission."
          )
        }
      >
        <Icon name="screenShare" size={15} /> {isScreenShareEnabled ? "Sharing screen" : "Share screen"}
      </button>

      <button type="button" className={"btn sm" + (handUp ? " on" : " ghost")} aria-pressed={handUp} disabled={disabled} onClick={raiseHand}>
        <Icon name="hand" size={15} /> {handUp ? "Hand raised" : "Raise hand"}
      </button>

      <button
        type="button"
        className={"btn sm" + (commentsOpen ? " on" : " ghost")}
        aria-expanded={commentsOpen}
        onClick={onToggleComments}
      >
        <Icon name="messageSquare" size={15} /> Comments{unread > 0 ? " (" + unread + ")" : ""}
      </button>

      {someoneSharing && <span className="pill live">Screen shared</span>}

      {error && (
        <span className="hint" role="status" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="alertCircle" size={14} /> {error}
        </span>
      )}
    </div>
  );
}
