/*
  Admin realtime client — `GET /admin/events/stream` (SSE, requireAdmin).

  Why fetch + ReadableStream instead of EventSource: the endpoint requires an
  Authorization header, and the native EventSource cannot send one.

  Behaviour:
    - one shared connection for the whole app (refcounted), so opening two
      subscribed components never opens two streams;
    - frames are parsed per the SSE grammar — `event:`/`data:` lines, `: …`
      heartbeat comments ignored;
    - the stream reconnects itself with exponential backoff (1s → 30s), and if
      the API stays unreachable it degrades to a polling fallback that ticks so
      badges still refresh, then keeps retrying the stream in the background;
    - a 401 means the token is dead: log out and land on /login, exactly like
      adminFetch does.

  Events emitted by the backend (see Backend/src/routes/stream.ts): `message`,
  `classroom-message`, `notification`, `typing`, `session`. The `poll` event is
  local to this client — it is only produced by the polling fallback.
*/

import { adminToken, adminLogout, apiUrl } from "./admin";

export type LiveStatus = "idle" | "connecting" | "connected" | "reconnecting" | "polling";

export type AdminEvent = {
  event: "message" | "classroom-message" | "notification" | "typing" | "session" | "poll" | string;
  data: any;
};

type Listener = {
  onEvent: (e: AdminEvent) => void;
  onStatus?: (s: LiveStatus) => void;
};

const MAX_BACKOFF_MS = 30_000;
const POLL_INTERVAL_MS = 30_000;
const FAILURES_BEFORE_POLLING = 5;

let listeners: Listener[] = [];
let controller: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let failures = 0;
let status: LiveStatus = "idle";
let started = false;

function setStatus(next: LiveStatus) {
  if (status === next) return;
  status = next;
  for (const l of listeners) l.onStatus?.(next);
}

export function liveStatus(): LiveStatus {
  return status;
}

function emit(e: AdminEvent) {
  for (const l of listeners) {
    try {
      l.onEvent(e);
    } catch {
      /* one bad listener must never kill the stream */
    }
  }
}

function clearTimers() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (pollTimer) clearInterval(pollTimer);
  reconnectTimer = null;
  pollTimer = null;
}

function scheduleReconnect() {
  if (!started || reconnectTimer) return;
  failures += 1;
  if (failures >= FAILURES_BEFORE_POLLING) {
    /* The stream is unreachable — degrade honestly instead of pretending to
       be live: tick on an interval so badges/list refresh on real data. */
    setStatus("polling");
    if (!pollTimer) {
      pollTimer = setInterval(() => {
        emit({ event: "poll", data: { at: Date.now() } });
        /* keep probing the stream; a success tears this timer down */
        void openStream();
      }, POLL_INTERVAL_MS);
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void openStream();
    }, POLL_INTERVAL_MS);
    return;
  }
  setStatus("reconnecting");
  const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (failures - 1));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void openStream();
  }, delay);
}

/** Parse one SSE frame (`event:` + `data:` lines; `:` lines are comments). */
function parseFrame(raw: string): AdminEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith(":")) continue; // heartbeat comment
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (!dataLines.length && event === "message") return null;
  const text = dataLines.join("\n");
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { event, data };
}

async function openStream() {
  if (!started || controller || typeof window === "undefined") return;
  const token = adminToken();
  if (!token) {
    stopAdminEvents();
    return;
  }
  if (!apiUrl) {
    scheduleReconnect();
    return;
  }

  setStatus(failures > 0 ? "reconnecting" : "connecting");
  const ac = new AbortController();
  controller = ac;

  try {
    const r = await fetch(`${apiUrl}/admin/events/stream`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      cache: "no-store",
      signal: ac.signal,
    });

    if (r.status === 401) {
      ac.abort();
      controller = null;
      adminLogout();
      if (window.location.pathname !== "/login") window.location.href = "/login";
      return;
    }
    if (!r.ok || !r.body) throw new Error(`stream failed (${r.status})`);

    /* Connected: reset backoff and cancel the polling fallback. */
    failures = 0;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    setStatus("connected");
    emit({ event: "poll", data: { reason: "connected" } });

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseFrame(frame);
        if (parsed) emit(parsed);
        sep = buffer.indexOf("\n\n");
      }
    }
    throw new Error("stream closed");
  } catch {
    /* falls through to reconnect */
  } finally {
    if (controller === ac) controller = null;
    if (started) scheduleReconnect();
  }
}

/** Subscribe to the admin stream. Returns an unsubscribe function. */
export function subscribeAdminEvents(
  onEvent: (e: AdminEvent) => void,
  onStatus?: (s: LiveStatus) => void
): () => void {
  const l: Listener = { onEvent, onStatus };
  listeners.push(l);
  onStatus?.(status);

  if (typeof window !== "undefined" && !started) {
    started = true;
    failures = 0;
    void openStream();
  }

  return () => {
    listeners = listeners.filter((x) => x !== l);
    if (!listeners.length) stopAdminEvents();
  };
}

function stopAdminEvents() {
  started = false;
  clearTimers();
  controller?.abort();
  controller = null;
  failures = 0;
  setStatus("idle");
}
