"use client";
import { useEffect, useRef, useState } from "react";
import { apiBase, authToken } from "./auth";
import type { ClassroomMessage, Message, Notification } from "./dashboard-api";

/*
  SSE client for GET /messages/stream.

  EventSource cannot send an Authorization header, so we read the stream with
  fetch + ReadableStream and parse `event:` / `data:` frames ourselves
  (the backend explicitly supports this — see Backend/src/routes/stream.ts).

  Behaviour:
  - named events: message, classroom-message, notification, typing, session
  - `: connected` / `: ping` heartbeat comments count as liveness; if nothing
    arrives for 45s (server pings every 25s) the socket is torn down
  - auto-reconnect with exponential backoff (1s → 30s, jittered)
  - while disconnected for more than one attempt, a light polling fallback
    runs every 30s so boards still refresh without realtime
*/

export type LiveEventMap = {
  message: { conversation_id: string; message: Message };
  "classroom-message": { classroom_id: string; message: ClassroomMessage };
  notification: { notification: Notification };
  typing: { conversation_id: string; user_id: string };
  session: { session_id: string; classroom_id: string; status: string };
};

export type LiveEventName = keyof LiveEventMap;

export type LiveHandlers = { [K in LiveEventName]?: (data: LiveEventMap[K]) => void };

export type LiveStatus = "idle" | "connecting" | "connected" | "reconnecting" | "polling" | "stopped";

const HEARTBEAT_TIMEOUT = 45_000; // server pings every 25s
const POLL_INTERVAL = 30_000;
const MAX_BACKOFF = 30_000;

export class LiveStream {
  private handlers: LiveHandlers;
  private onStatus?: (s: LiveStatus) => void;
  private onPoll?: () => void;
  private controller: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private attempt = 0;
  private lastActivity = 0;
  private _status: LiveStatus = "idle";

  constructor(opts: { handlers: LiveHandlers; onStatus?: (s: LiveStatus) => void; onPoll?: () => void }) {
    this.handlers = opts.handlers;
    this.onStatus = opts.onStatus;
    this.onPoll = opts.onPoll;
  }

  get status(): LiveStatus {
    return this._status;
  }

  private setStatus(s: LiveStatus) {
    if (this._status === s) return;
    this._status = s;
    try {
      this.onStatus?.(s);
    } catch {
      /* status listeners must never break the stream */
    }
  }

  start() {
    if (this.closed) return;
    void this.connect();
  }

  close() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    this.stopPolling();
    try {
      this.controller?.abort();
    } catch {
      /* ignore */
    }
    this.controller = null;
    this.setStatus("stopped");
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private startPolling() {
    if (this.pollTimer || this.closed || !this.onPoll) return;
    this.setStatus("polling");
    try {
      this.onPoll();
    } catch {
      /* ignore */
    }
    this.pollTimer = setInterval(() => {
      try {
        this.onPoll?.();
      } catch {
        /* ignore */
      }
    }, POLL_INTERVAL);
  }

  private scheduleReconnect() {
    if (this.closed) return;
    this.attempt += 1;
    const base = Math.min(MAX_BACKOFF, 1000 * 2 ** Math.min(this.attempt, 5));
    const delay = base + Math.random() * 800;
    // Two consecutive failures → fall back to light polling while we retry.
    if (this.attempt >= 2) this.startPolling();
    this.setStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => void this.connect(), delay);
  }

  private async connect() {
    if (this.closed) return;
    if (!apiBase || !authToken()) {
      this.setStatus("stopped");
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting");

    const controller = new AbortController();
    this.controller = controller;

    let res: Response;
    try {
      res = await fetch(`${apiBase}/messages/stream`, {
        headers: {
          Authorization: `Bearer ${authToken()}`,
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });
    } catch {
      if (!this.closed) this.scheduleReconnect();
      return;
    }

    if (!res.ok) {
      // 401/403: token is gone — other apiFetch calls trigger the redirect.
      if (res.status === 401 || res.status === 403) {
        this.setStatus("stopped");
        return;
      }
      if (!this.closed) this.scheduleReconnect();
      return;
    }
    if (!res.body) {
      if (!this.closed) this.startPolling();
      return;
    }

    // Connected: reset backoff and stop the polling fallback.
    this.attempt = 0;
    this.stopPolling();
    this.setStatus("connected");
    this.lastActivity = Date.now();
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (Date.now() - this.lastActivity > HEARTBEAT_TIMEOUT) {
        try {
          this.controller?.abort();
        } catch {
          /* ignore */
        }
      }
    }, 10_000);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        this.lastActivity = Date.now();
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          this.handleFrame(frame);
        }
      }
    } catch {
      /* aborted or network drop — handled below */
    } finally {
      if (this.watchdog) {
        clearInterval(this.watchdog);
        this.watchdog = null;
      }
    }

    if (!this.closed) this.scheduleReconnect();
  }

  private handleFrame(frame: string) {
    let event = "message";
    const dataLines: string[] = [];
    for (const raw of frame.split("\n")) {
      const line = raw.replace(/\r$/, "");
      if (!line || line.startsWith(":")) continue; // heartbeat comment
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    if (!dataLines.length) return;
    let data: unknown;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }
    const handler = this.handlers[event as LiveEventName];
    if (!handler) return;
    try {
      (handler as (d: unknown) => void)(data);
    } catch {
      /* a broken handler must not kill the socket */
    }
  }
}

/**
 * React binding: starts one stream for the app shell and exposes its status.
 * `onPoll` runs while the socket is down (light polling fallback).
 */
export function useLiveStream(handlers: LiveHandlers, opts?: { onPoll?: () => void; enabled?: boolean }): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const onPollRef = useRef(opts?.onPoll);
  onPollRef.current = opts?.onPoll;
  const enabled = opts?.enabled !== false;

  useEffect(() => {
    if (!enabled) return;
    const stream = new LiveStream({
      handlers: new Proxy({} as LiveHandlers, {
        get: (_t, prop: string) => handlersRef.current[prop as LiveEventName],
        has: (_t, prop: string) => handlersRef.current[prop as LiveEventName] !== undefined,
      }),
      onStatus: setStatus,
      onPoll: () => onPollRef.current?.(),
    });
    stream.start();
    return () => stream.close();
  }, [enabled]);

  return status;
}
