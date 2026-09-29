import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { subscribe } from '../lib/bus.js';

/*
  Server-Sent Events endpoints. No websocket dependency: the frontends read
  these with fetch + ReadableStream and the Authorization header, so SSE fits
  the existing token model (EventSource cannot send headers).

  GET /messages/stream       (requireUser)   — this learner's own topics
  GET /admin/events/stream   (requireAdmin)   — the `admin` topic

  Both send heartbeat comments every 25s so idle proxies keep the socket open,
  and clean up their bus subscriptions on close.
*/

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

const HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'X-Accel-Buffering': 'no',
  Connection: 'keep-alive',
} as const;

/** Open the SSE response; returns a disposer for the heartbeat timer. */
function open(res: any): () => void {
  res.writeHead(200, HEADERS);
  try { res.write(': connected\n\n'); } catch {}
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch {}
  }, 25_000);
  return () => {
    clearInterval(heartbeat);
    try { res.end(); } catch {}
  };
}

const send = (res: any, event: string, data: any) => {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
};

// Mounted at /messages → serves GET /messages/stream.
export const userStreamRouter = Router();
userStreamRouter.get('/stream', requireUser, async (req, res) => {
  const me = (req as any).user.id;
  const offs: Array<() => void> = [];
  const end = open(res);
  const onEvent = (event: string, data: any) => send(res, event, data);

  offs.push(subscribe(`user:${me}`, onEvent));

  try {
    // Classrooms this user is actually enrolled in (staff get theirs too via
    // their own enrollments; the admin socket covers the rest).
    const rooms = await q(
      `select distinct product_id as id from enrollments where user_id = $1 and product_type = 'classroom'`,
      [me]);
    for (const r of rooms) offs.push(subscribe(`classroom:${r.id}`, onEvent));
  } catch {
    /* DB hiccup: socket stays open with the topics we already have */
  }

  res.on('close', () => {
    for (const off of offs) off();
    end();
  });
});

// Mounted at /admin → serves GET /admin/events/stream.
export const adminStreamRouter = Router();
adminStreamRouter.get('/events/stream', requireAdmin, (req, res) => {
  const offs: Array<() => void> = [];
  const end = open(res);
  offs.push(subscribe('admin', (event, data) => send(res, event, data)));
  res.on('close', () => {
    for (const off of offs) off();
    end();
  });
});
