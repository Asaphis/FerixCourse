import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { notify } from '../lib/notify.js';
import { emit } from '../lib/bus.js';
import { randomUUID } from 'node:crypto';
import { EgressClient, EncodedFileOutput, S3Upload, EgressStatus } from 'livekit-server-sdk';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

// GET /admin/stats — real counts, zeros when empty. No mocks.
adminRouter.get('/stats', async (_req, res) => {
  try {
    const [[s], [c], [r], [u], [pay]] = await Promise.all([
      q(`select count(*)::int as n from profiles where role='STUDENT'`),
      q(`select count(*)::int as n from courses where is_published=true`),
      q(`select count(*)::int as n from classrooms where is_published=true`),
      q(`select count(*)::int as n from enrollments`),
      q(`select count(*)::int as n, coalesce(sum(amount_kobo),0)::int as revenue from transactions where status='successful'`),
    ]);
    const [pending] = await q(
      `select (select count(*)::int from bookings where status='pending') as bookings,
              (select count(*)::int from training_requests where status='pending') as requests,
              (select count(*)::int from classroom_sessions where status='live') as live`
    ).catch(() => [{ bookings: 0, requests: 0, live: 0 }]);
    res.json({
      students: s.n, publishedCourses: c.n, activeClassrooms: r.n,
      enrollments: u.n, successfulPayments: pay.n, revenueKobo: pay.revenue,
      pendingBookings: pending.bookings ?? 0, pendingRequests: pending.requests ?? 0,
      liveSessions: pending.live ?? 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load stats. Run database migrations first.', detail: e?.message });
  }
});

// GET /admin/users?search=
adminRouter.get('/users', async (req, res) => {
  try {
    const s = `%${String(req.query.search ?? '')}%`;
    res.json(await q(
      `select id, email, full_name, role, is_active, email_verified, created_at from profiles
       where email ilike $1 or full_name ilike $1 order by created_at desc limit 100`, [s]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load users.', detail: e?.message });
  }
});

// GET /admin/transactions
adminRouter.get('/transactions', async (_req, res) => {
  try {
    res.json(await q(
      `select t.*, p.email as user_email from transactions t
       left join profiles p on p.id = t.user_id
       order by t.created_at desc limit 100`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load transactions.', detail: e?.message });
  }
});

// GET /admin/settings  +  PUT /admin/settings/:key
adminRouter.get('/settings', async (_req, res) => {
  try {
    res.json(await q('select key, value, updated_at from settings order by key'));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load settings.', detail: e?.message });
  }
});

adminRouter.put('/settings/:key', async (req, res) => {
  try {
    const rows = await q(
      `insert into settings(key, value, updated_at) values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()
       returning key, value`,
      [req.params.key, req.body?.value ?? {}]);
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not save setting.', detail: e?.message });
  }
});

// ---- Custom training requests ----
adminRouter.get('/requests', async (req, res) => {
  try {
    const status = String(req.query.status ?? '');
    const rows = status
      ? await q(`select r.*, p.email as user_email from training_requests r left join profiles p on p.id = r.user_id where r.status = $1 order by r.created_at desc`, [status])
      : await q(`select r.*, p.email as user_email from training_requests r left join profiles p on p.id = r.user_id order by r.created_at desc`);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load requests.', detail: e?.message });
  }
});

adminRouter.patch('/requests/:id', async (req, res) => {
  try {
    const allowed = ['status', 'admin_note', 'converted_classroom_id'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) { vals.push(req.body[k]); sets.push(`${k} = $${vals.length}`); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(req.params.id);
    const rows = await q(`update training_requests set ${sets.join(', ')} where id = $${vals.length} returning *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Request not found.' });
    // Notify student of status change
    if (req.body?.status) {
      await notify(rows[0].user_id, 'request_update', `Training request ${req.body.status}`, rows[0].topic);
    }
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not update request.', detail: e?.message });
  }
});

// ---- Bookings ----
adminRouter.get('/bookings', async (req, res) => {
  try {
    const status = String(req.query.status ?? '');
    const rows = status
      ? await q(`select b.*, p.email as user_email from bookings b left join profiles p on p.id = b.user_id where b.status = $1 order by b.created_at desc`, [status])
      : await q(`select b.*, p.email as user_email from bookings b left join profiles p on p.id = b.user_id order by b.created_at desc`);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load bookings.', detail: e?.message });
  }
});

adminRouter.patch('/bookings/:id', async (req, res) => {
  try {
    const allowed = ['status', 'location', 'livekit_room'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) { vals.push(req.body[k]); sets.push(`${k} = $${vals.length}`); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(req.params.id);
    const rows = await q(`update bookings set ${sets.join(', ')} where id = $${vals.length} returning *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found.' });
    if (req.body?.status) {
      await notify(rows[0].user_id, 'booking_update', `Booking ${req.body.status}`, rows[0].topic);
    }
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not update booking.', detail: e?.message });
  }
});

// ---- Recordings / materials (read views; recording pipeline lands in Phase 3) ----
// NOTE: the sessions list lives further down (it supports ?classroom_id).
// A second GET /sessions used to be declared here, which Express matched first
// and which ignored the filter — every per-classroom request came back with
// every session in the system. There is exactly one handler now.
//
// GET /admin/recordings also best-effort syncs LiveKit egresses into
// classroom_recordings (idempotent on storage_key) when egress is configured.

/** LiveKit egress client, or null when LIVEKIT_* is not configured. */
function egressClient(): EgressClient | null {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return null;
  return new EgressClient(LIVEKIT_URL.replace(/\/+$/, ''), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/** R2 credentials for the egress S3Upload target, or null when unconfigured. */
function r2Upload(): { accessKey: string; secret: string; bucket: string; region: string; endpoint: string; forcePathStyle: boolean } | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;
  const endpoint = R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  if (!endpoint) return null;
  return { accessKey: R2_ACCESS_KEY_ID, secret: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET_NAME, region: 'auto', endpoint, forcePathStyle: true };
}

/** Storage key of an egress's file output (request echo, else final result). */
function egressKey(info: any): string {
  return info?.fileOutputs?.[0]?.filepath || info?.fileResults?.[0]?.filename || '';
}

/**
 * Insert a completed/running egress as a classroom_recordings row.
 * Idempotent on storage_key: the same egress never produces two rows.
 * Session id is parsed from our own key layout: recordings/<sessionId>/<file>.
 */
async function syncEgress(info: any): Promise<boolean> {
  const key = egressKey(info);
  const parts = key.split('/');
  if (parts[0] !== 'recordings' || !parts[1]) return false;
  if (info.status === EgressStatus.EGRESS_FAILED) return false;
  const [existing] = await q('select id, status from classroom_recordings where storage_key = $1', [key]);
  const complete = info.status === EgressStatus.EGRESS_COMPLETE;
  if (existing) {
    if (complete && existing.status !== 'ready') {
      await pool.query(`update classroom_recordings set status = 'ready' where id = $1`, [existing.id]);
    }
    return false;
  }
  const [sess] = await q('select id from classroom_sessions where id = $1', [parts[1]]);
  if (!sess[0]) return false;
  const fi = info.fileResults?.[0];
  await q(
    `insert into classroom_recordings(session_id, storage_key, duration_sec, size_bytes, status)
     values ($1, $2, $3, $4, $5)`,
    [sess[0].id, key, Number(fi?.duration ?? 0) || 0, Number(fi?.size ?? 0) || 0, complete ? 'ready' : 'processing']);
  return true;
}

adminRouter.get('/recordings', async (_req, res) => {
  try {
    const client = egressClient();
    if (client) {
      try {
        const infos = await client.listEgress();
        for (const info of infos) await syncEgress(info);
      } catch {
        /* egress unreachable: fall through and serve whatever the DB has */
      }
    }
    res.json(await q(`select r.*, s.title as session_title from classroom_recordings r left join classroom_sessions s on s.id = r.session_id order by r.created_at desc limit 100`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load recordings.', detail: e?.message });
  }
});

// POST /admin/sessions/:id/recording/start — RoomCompositeEgress → R2.
// 503 when LiveKit/R2 credentials are missing (the honest unconfigured path).
adminRouter.post('/sessions/:id/recording/start', async (req, res) => {
  try {
    const s = await q('select * from classroom_sessions where id = $1', [req.params.id]);
    if (!s[0]) return res.status(404).json({ error: 'Session not found.' });
    const client = egressClient();
    const r2 = r2Upload();
    if (!client || !r2) {
      return res.status(503).json({ error: 'Recording is not configured yet (set LIVEKIT_* and R2_* environment variables).' });
    }
    if (s[0].recording_status === 'recording' && s[0].egress_id) {
      return res.status(409).json({ error: 'This session is already recording.', egress_id: s[0].egress_id });
    }
    // Key layout recordings/<sessionId>/<file> lets the sync path map an
    // egress back to its session without extra bookkeeping.
    const storageKey = `recordings/${s[0].id}/${randomUUID()}.mp4`;
    const output = new EncodedFileOutput({
      filepath: storageKey,
      output: { case: 's3', value: new S3Upload(r2) },
    });
    const info = await client.startRoomCompositeEgress(s[0].livekit_room, output, { layout: 'grid' });
    await pool.query(`update classroom_sessions set recording_status = 'recording', egress_id = $1 where id = $2`,
      [info.egressId, s[0].id]);
    res.json({ egress_id: info.egressId, storage_key: storageKey });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not start recording.', detail: e?.message });
  }
});

// POST /admin/sessions/:id/recording/stop — stopEgress, then the row lands
// (status 'processing') until the sync flips it to 'ready'.
adminRouter.post('/sessions/:id/recording/stop', async (req, res) => {
  try {
    const s = await q('select * from classroom_sessions where id = $1', [req.params.id]);
    if (!s[0]) return res.status(404).json({ error: 'Session not found.' });
    const client = egressClient();
    if (!client) {
      return res.status(503).json({ error: 'Recording is not configured yet (set LIVEKIT_* environment variables).' });
    }
    if (!s[0].egress_id) return res.status(400).json({ error: 'This session is not recording.' });

    let info: any = null;
    try {
      info = await client.stopEgress(s[0].egress_id);
    } catch (e: any) {
      // Already stopped on the LiveKit side is not an error for us.
      if (!/not found|no egress/i.test(String(e?.message ?? ''))) throw e;
    }
    await pool.query(`update classroom_sessions set recording_status = 'processing', egress_id = null where id = $1`,
      [s[0].id]);
    if (info) await syncEgress(info);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not stop recording.', detail: e?.message });
  }
});

adminRouter.get('/materials', async (_req, res) => {
  try {
    const rooms = await q(`select m.*, c.title as classroom_title from classroom_materials m left join classrooms c on c.id = m.classroom_id order by m.created_at desc limit 100`);
    const courses = await q(`select m.*, c.title as course_title from course_materials m left join courses c on c.id = m.course_id order by m.created_at desc limit 100`);
    res.json({ classroom: rooms, courses });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load materials.', detail: e?.message });
  }
});

// ---- Admin: all conversations + reply ----
// Shared with the learner shape: attachment object + reply context.
const MSG_ENRICH = `
  select m.id, m.conversation_id, m.sender_id, m.body, m.is_read, m.created_at, m.parent_id,
         pm.body as parent_body, pp.full_name as parent_sender,
         sp.full_name as sender_name,
         m.attachment_key, m.attachment_name, m.attachment_kind
  from messages m
  left join messages pm on pm.id = m.parent_id
  left join profiles pp on pp.id = pm.sender_id
  left join profiles sp on sp.id = m.sender_id`;

function msgToApi(row: any) {
  const { attachment_key, attachment_name, attachment_kind, ...rest } = row;
  return {
    ...rest,
    attachment: attachment_key
      ? { key: attachment_key, name: attachment_name ?? 'file', kind: attachment_kind ?? 'file', url: `/files/message/${row.id}` }
      : null,
  };
}

adminRouter.get('/conversations', async (_req, res) => {
  try {
    res.json(await q(
      `select c.*, p.email as student_email, pr.full_name as student_name,
              (select m.body from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_body,
              (select m.created_at from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_at,
              (select count(*)::int from messages m where m.conversation_id = c.id and m.sender_id = c.student_id and m.is_read = false) as unread
         from conversations c
         left join profiles p on p.id = c.student_id
         left join profiles pr on pr.id = c.student_id
        order by coalesce((select max(m.created_at) from messages m where m.conversation_id = c.id), c.updated_at) desc
        limit 100`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load conversations.', detail: e?.message });
  }
});

adminRouter.get('/conversations/:id', async (req, res) => {
  try {
    const rows = await q(`${MSG_ENRICH} where m.conversation_id = $1 order by m.created_at asc`, [req.params.id]);
    res.json(rows.map(msgToApi));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load messages.', detail: e?.message });
  }
});

adminRouter.post('/conversations/:id', async (req, res) => {
  try {
    const body = String(req.body?.body ?? '').trim();
    const att = req.body?.attachment;
    if (!body && !att?.key) return res.status(400).json({ error: 'Message is empty.' });
    const conv = await q('select id, student_id from conversations where id = $1', [req.params.id]);
    if (!conv[0]) return res.status(404).json({ error: 'Conversation not found.' });
    if (req.body?.parent_id) {
      const parent = await q('select id from messages where id = $1 and conversation_id = $2',
        [req.body.parent_id, req.params.id]);
      if (!parent[0]) return res.status(400).json({ error: 'Reply target not found in this conversation.' });
    }
    const rows = await q(
      `insert into messages(conversation_id, sender_id, body, parent_id, attachment_key, attachment_name, attachment_kind)
       values ($1, $2, $3, $4, $5, $6, $7) returning *`,
      [req.params.id, (req as any).admin.id, body, req.body?.parent_id ?? null,
       att?.key ?? null, att?.name ?? null, att?.kind ?? null]);
    await pool.query('update conversations set updated_at = now() where id = $1', [req.params.id]);

    const enriched = msgToApi((await q(`${MSG_ENRICH} where m.id = $1`, [rows[0].id]))[0]);
    emit(`user:${conv[0].student_id}`, 'message', { conversation_id: conv[0].id, message: enriched });
    emit('admin', 'message', { conversation_id: conv[0].id, message: enriched });
    res.status(201).json(enriched);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send message.', detail: e?.message });
  }
});

// POST /admin/conversations/:id/read — admin opened the thread; clears the badge.
adminRouter.post('/conversations/:id/read', async (req, res) => {
  try {
    const r = await pool.query('update messages set is_read = true where conversation_id = $1 and sender_id != $2',
      [req.params.id, (req as any).admin.id]);
    res.json({ ok: true, read: r.rowCount ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not mark as read.', detail: e?.message });
  }
});

// ---- Admin: notifications log ----
adminRouter.get('/notifications', async (_req, res) => {
  try {
    res.json(await q(`select n.*, p.email as user_email from notifications n left join profiles p on p.id = n.user_id order by n.created_at desc limit 100`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load notifications.', detail: e?.message });
  }
});

// ---- Admin: sessions (pick which classroom trains, start live) ----
adminRouter.get('/sessions', async (req, res) => {
  try {
    const cid = String(req.query.classroom_id ?? '');
    const rows = cid
      ? await q('select * from classroom_sessions where classroom_id = $1 order by starts_at asc', [cid])
      : await q(`select s.*, c.title as classroom_title from classroom_sessions s left join classrooms c on c.id = s.classroom_id order by s.starts_at asc limit 100`);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load sessions.', detail: e?.message });
  }
});

adminRouter.post('/sessions', async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.classroom_id || !b.title) return res.status(400).json({ error: 'Classroom and title are required.' });
    const c = await q('select livekit_room from classrooms where id = $1', [b.classroom_id]);
    if (!c[0]) return res.status(404).json({ error: 'Classroom not found.' });
    const rows = await q(
      `insert into classroom_sessions(classroom_id, title, starts_at, ends_at, livekit_room)
       values ($1,$2,$3,$4,$5) returning *`,
      [b.classroom_id, b.title, b.starts_at ?? null, b.ends_at ?? null, c[0].livekit_room]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create session.', detail: e?.message });
  }
});

// PATCH /admin/sessions/:id { status: scheduled|live|ended } — going live notifies members only.
adminRouter.patch('/sessions/:id', async (req, res) => {
  try {
    const s = await q('select * from classroom_sessions where id = $1', [req.params.id]);
    if (!s[0]) return res.status(404).json({ error: 'Session not found.' });
    const status = req.body?.status;
    if (!['scheduled', 'live', 'ended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    await pool.query('update classroom_sessions set status = $1 where id = $2', [status, req.params.id]);
    // Realtime: admin console control room + each member's own socket.
    emit('admin', 'session', { session_id: req.params.id, classroom_id: s[0].classroom_id, status });
    emit(`classroom:${s[0].classroom_id}`, 'session', { session_id: req.params.id, classroom_id: s[0].classroom_id, status });
    if (status === 'live') {
      const members = await q(`select user_id from enrollments where product_type = 'classroom' and product_id = $1`, [s[0].classroom_id]);
      const c = await q('select title from classrooms where id = $1', [s[0].classroom_id]);
      for (const m of members) {
        emit(`user:${m.user_id}`, 'session', { session_id: req.params.id, classroom_id: s[0].classroom_id, status });
        await notify(m.user_id, 'live', `Live now: ${c[0]?.title ?? 'classroom'}`, `${s[0].title} started. Join from your classroom.`);
      }
    }
    if (status === 'ended') {
      await pool.query(`update classroom_sessions set ends_at = coalesce(ends_at, now()), recording_status = case when recording_status = 'recording' then 'processing' else recording_status end where id = $1`, [req.params.id]);
    }
    res.json({ id: req.params.id, status });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not update session.', detail: e?.message });
  }
});

// ---- Admin: materials with explicit destination (course XOR classroom) ----
adminRouter.post('/materials', async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.title || !b.storage_key) return res.status(400).json({ error: 'Title and storage key are required.' });
    if (b.classroom_id && b.course_id) {
      return res.status(400).json({ error: 'Pick ONE destination: a classroom or a course, never both.' });
    }
    if (b.classroom_id) {
      const rows = await q(
        `insert into classroom_materials(classroom_id, title, storage_key, mime, size_bytes) values ($1,$2,$3,$4,$5) returning *`,
        [b.classroom_id, b.title, b.storage_key, b.mime ?? 'application/octet-stream', b.size_bytes ?? 0]);
      return res.status(201).json({ scope: 'classroom', ...rows[0] });
    }
    if (b.course_id) {
      const rows = await q(
        `insert into course_materials(course_id, lesson_id, title, storage_key, mime, size_bytes) values ($1,$2,$3,$4,$5,$6) returning *`,
        [b.course_id, b.lesson_id ?? null, b.title, b.storage_key, b.mime ?? 'application/octet-stream', b.size_bytes ?? 0]);
      return res.status(201).json({ scope: 'course', ...rows[0] });
    }
    return res.status(400).json({ error: 'Pick a destination classroom or course.' });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not save material.', detail: e?.message });
  }
});

adminRouter.post('/materials/classroom/:id/notify', async (req, res) => {
  try {
    const m = await q(`select m.*, c.title as classroom_title from classroom_materials m join classrooms c on c.id = m.classroom_id where m.id = $1`, [req.params.id]);
    if (!m[0]) return res.status(404).json({ error: 'Material not found.' });
    const members = await q(`select user_id from enrollments where product_type = 'classroom' and product_id = $1`, [m[0].classroom_id]);
    for (const u of members) {
      await notify(u.user_id, 'material', `New material: ${m[0].classroom_title}`, m[0].title);
    }
    res.json({ notified: members.length });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not notify.' });
  }
});

// ---- Admin: announcements ----
adminRouter.post('/announcements', async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.classroom_id || !b.title) return res.status(400).json({ error: 'Classroom and title are required.' });
    const rows = await q('insert into announcements(classroom_id, author_id, title, body) values ($1,$2,$3,$4) returning *',
      [b.classroom_id, (req as any).admin.id, b.title, b.body ?? '']);
    const members = await q(`select user_id from enrollments where product_type = 'classroom' and product_id = $1`, [b.classroom_id]);
    for (const m of members) {
      await notify(m.user_id, 'announcement', rows[0].title, rows[0].body.slice(0, 140));
    }
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not post announcement.', detail: e?.message });
  }
});

// ---- Admin: assignments + feedback ----
adminRouter.get('/assignments', async (req, res) => {
  try {
    const cid = String(req.query.classroom_id ?? '');
    const rows = cid
      ? await q(`select a.*, (select count(*)::int from submissions s where s.assignment_id = a.id) as submissions from assignments a where a.classroom_id = $1 order by a.created_at desc`, [cid])
      : await q(`select a.*, c.title as classroom_title, (select count(*)::int from submissions s where s.assignment_id = a.id) as submissions from assignments a left join classrooms c on c.id = a.classroom_id order by a.created_at desc limit 100`);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load assignments.', detail: e?.message });
  }
});
adminRouter.post('/assignments', async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.classroom_id || !b.title) return res.status(400).json({ error: 'Classroom and title are required.' });
    const rows = await q('insert into assignments(classroom_id, title, description, due_at) values ($1,$2,$3,$4) returning *',
      [b.classroom_id, b.title, b.description ?? '', b.due_at ?? null]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create assignment.', detail: e?.message });
  }
});

adminRouter.get('/assignments/:id/submissions', async (req, res) => {
  try {
    res.json(await q(
      `select s.*, p.full_name, p.email from submissions s left join profiles p on p.id = s.user_id where s.assignment_id = $1 order by s.created_at desc`,
      [req.params.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load submissions.', detail: e?.message });
  }
});

adminRouter.patch('/submissions/:uid/:aid', async (req, res) => {
  try {
    await pool.query('update submissions set feedback = $1 where user_id = $2 and assignment_id = $3',
      [req.body?.feedback ?? '', req.params.uid, req.params.aid]);
    await notify(req.params.uid, 'feedback', 'Feedback on your submission', String(req.body?.feedback ?? '').slice(0, 140));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not save feedback.' });
  }
});

// ---- Admin: convert request → classroom, pull the queue in ----
adminRouter.post('/requests/:id/convert', async (req, res) => {
  try {
    const r = await q('select * from training_requests where id = $1', [req.params.id]);
    if (!r[0]) return res.status(404).json({ error: 'Request not found.' });
    const { classroom_id } = req.body ?? {};
    if (!classroom_id) return res.status(400).json({ error: 'classroom_id is required.' });
    await pool.query(`update training_requests set status = 'converted', converted_classroom_id = $1 where id = $2`,
      [classroom_id, req.params.id]);
    const c = await q('select title, slug, price_kobo, currency from classrooms where id = $1', [classroom_id]);
    const queue = await q('select user_id from request_queue where request_id = $1', [req.params.id]);
    const targets = new Set<string>([r[0].user_id, ...queue.map((w: any) => w.user_id)]);
    for (const uid of targets) {
      await notify(uid, 'request_converted', `Your requested training is ready: ${c[0]?.title ?? ''}`,
        `Enroll now${c[0] ? ` — ${(c[0].price_kobo / 100).toLocaleString()} ${c[0].currency}` : ''}.`);
    }
    res.json({ converted: true, notified: targets.size, classroom: c[0] ?? null });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not convert request.', detail: e?.message });
  }
});

adminRouter.get('/requests/:id/queue', async (req, res) => {
  try {
    res.json(await q(
      `select w.user_id, w.created_at, p.email from request_queue w left join profiles p on p.id = w.user_id where w.request_id = $1 order by w.created_at asc`,
      [req.params.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load queue.', detail: e?.message });
  }
});

// ---- Admin: session reminders (run before training day; cron-ready) ----
adminRouter.post('/reminders/sessions', async (_req, res) => {
  try {
    const soon = await q(
      `select s.*, c.title as classroom_title from classroom_sessions s
       join classrooms c on c.id = s.classroom_id
       where s.status = 'scheduled' and s.starts_at is not null
         and s.starts_at > now() and s.starts_at < now() + interval '24 hours'`);
    let notified = 0;
    for (const s of soon) {
      const members = await q(`select user_id from enrollments where product_type = 'classroom' and product_id = $1`, [s.classroom_id]);
      const when = new Date(s.starts_at).toLocaleString();
      for (const m of members) {
        await notify(m.user_id, 'reminder', `Reminder: ${s.classroom_title}`, `${s.title} starts ${when}. See you in class.`);
        notified++;
      }
    }
    res.json({ sessions: soon.length, notified });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send reminders.', detail: e?.message });
  }
});

// ---- Admin: set booking price (agreed after discussion) ----
adminRouter.patch('/bookings/:id/price', async (req, res) => {
  try {
    const price = Number(req.body?.price_kobo ?? NaN);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Valid price_kobo required.' });
    await pool.query('update bookings set price_kobo = $1 where id = $2', [price, req.params.id]);
    const b = await q('select * from bookings where id = $1', [req.params.id]);
    if (!b[0]) return res.status(404).json({ error: 'Booking not found.' });
    await notify(b[0].user_id, 'booking_price', `Price set: ${(price / 100).toLocaleString()}`, `Your booking "${b[0].topic}" is priced. Confirm to proceed to payment.`);
    res.json({ ok: true, price_kobo: price });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not set price.' });
  }
});
adminRouter.get('/courses', async (_req, res) => {
  try {
    res.json(await q('select * from courses order by created_at desc'));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load courses.', detail: e?.message });
  }
});

adminRouter.post('/courses', async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.title || !b.slug) return res.status(400).json({ error: 'Title and slug are required.' });
    const rows = await q(
      `insert into courses(title, slug, category_id, level, short_description, description, price_kobo, currency, is_published, cover_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [b.title, b.slug, b.category_id ?? null, b.level ?? 'Beginner', b.short_description ?? '',
       b.description ?? '', b.price_kobo ?? 0, b.currency ?? 'NGN', b.is_published ?? false, b.cover_url ?? null]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create course.', detail: e?.message });
  }
});

adminRouter.patch('/courses/:id', async (req, res) => {
  try {
    const allowed = ['title', 'level', 'short_description', 'description', 'price_kobo', 'currency', 'is_published', 'cover_url', 'category_id'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) { vals.push(req.body[k]); sets.push(`${k} = $${vals.length}`); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(req.params.id);
    const rows = await q(`update courses set ${sets.join(', ')} where id = $${vals.length} returning *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Course not found.' });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not update course.', detail: e?.message });
  }
});

// Classrooms: GET /admin/classrooms, POST /admin/classrooms, PATCH /admin/classrooms/:id
adminRouter.get('/classrooms', async (_req, res) => {
  try {
    res.json(await q(
      `select c.*, (select count(*)::int from enrollments e where e.product_type='classroom' and e.product_id=c.id) as enrolled
       from classrooms c order by c.created_at desc`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load classrooms.', detail: e?.message });
  }
});

adminRouter.post('/classrooms', async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.title || !b.slug) return res.status(400).json({ error: 'Title and slug are required.' });
    const room = b.livekit_room ?? `room-${Date.now().toString(36)}`;
    const rows = await q(
      `insert into classrooms(title, slug, description, level, price_kobo, currency, capacity, starts_at, ends_at, schedule_text, is_published, livekit_room)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [b.title, b.slug, b.description ?? '', b.level ?? 'Beginner', b.price_kobo ?? 0, b.currency ?? 'NGN',
       b.capacity ?? 30, b.starts_at ?? null, b.ends_at ?? null, b.schedule_text ?? '', b.is_published ?? false, room]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create classroom.', detail: e?.message });
  }
});

adminRouter.patch('/classrooms/:id', async (req, res) => {
  try {
    const allowed = ['title', 'description', 'level', 'price_kobo', 'currency', 'capacity', 'starts_at', 'ends_at', 'schedule_text', 'is_published'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) { vals.push(req.body[k]); sets.push(`${k} = $${vals.length}`); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(req.params.id);
    const rows = await q(`update classrooms set ${sets.join(', ')} where id = $${vals.length} returning *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Classroom not found.' });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not update classroom.', detail: e?.message });
  }
});

// ============================================================
// Products — one unified list across courses + classrooms
// ============================================================

const PRODUCT_COLS = `
  select c.id, 'Course' as kind, c.title, c.slug, c.level, c.category_id,
         cat.name as category_name, c.price_kobo, c.currency, c.is_published, c.cover_url,
         (select count(*)::int from enrollments e where e.product_type = 'course' and e.product_id = c.id) as enrolled,
         null::int as capacity, null::timestamptz as starts_at, null::text as schedule_text, c.created_at
    from courses c left join categories cat on cat.id = c.category_id
  union all
  select r.id, 'Classroom' as kind, r.title, r.slug, r.level, null::uuid as category_id,
         null::text as category_name, r.price_kobo, r.currency, r.is_published, r.cover_url,
         (select count(*)::int from enrollments e where e.product_type = 'classroom' and e.product_id = r.id) as enrolled,
         r.capacity, r.starts_at, r.schedule_text, r.created_at
    from classrooms r`;

// GET /admin/products — unified catalog for the Products page.
adminRouter.get('/products', async (_req, res) => {
  try {
    res.json(await q(`select * from (${PRODUCT_COLS}) p order by p.created_at desc`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load products.', detail: e?.message });
  }
});

const slugify = (s: string) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';

async function uniqueSlug(base: string, table: 'courses' | 'classrooms'): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const rows = await q(`select id from ${table} where slug = $1`, [candidate]);
    if (!rows[0]) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// POST /admin/products {kind, ...} — 201 same row shape as GET.
adminRouter.post('/products', async (req, res) => {
  try {
    const b = req.body ?? {};
    const kind = String(b.kind ?? '');
    if (!['Course', 'Classroom', 'course', 'classroom'].includes(kind)) {
      return res.status(400).json({ error: "kind must be 'Course' or 'Classroom'." });
    }
    const title = String(b.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const isCourse = kind.toLowerCase() === 'course';
    const slug = await uniqueSlug(b.slug || title, isCourse ? 'courses' : 'classrooms');

    let id: string;
    if (isCourse) {
      const rows = await q(
        `insert into courses(title, slug, category_id, level, short_description, description, price_kobo, currency, is_published, cover_url)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
        [title, slug, b.category_id ?? null, b.level ?? 'Beginner', b.short_description ?? '',
         b.description ?? '', Number(b.price_kobo ?? 0) || 0, b.currency ?? 'NGN',
         Boolean(b.is_published), b.cover_url ?? null]);
      id = rows[0].id;
    } else {
      const room = `room-${slug}-${Math.random().toString(36).slice(2, 8)}`;
      const rows = await q(
        `insert into classrooms(title, slug, description, level, price_kobo, currency, capacity, starts_at, ends_at, schedule_text, is_published, livekit_room)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
        [title, slug, b.description ?? b.short_description ?? '', b.level ?? 'Beginner',
         Number(b.price_kobo ?? 0) || 0, b.currency ?? 'NGN', Number(b.capacity ?? 30) || 30,
         b.starts_at ?? null, b.ends_at ?? null, b.schedule_text ?? '', Boolean(b.is_published), room]);
      id = rows[0].id;
    }
    const rows = await q(`select * from (${PRODUCT_COLS}) p where p.id = $1`, [id]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create product.', detail: e?.message });
  }
});

// ============================================================
// Categories CRUD (table existed; admin had no way to manage it)
// ============================================================

adminRouter.get('/categories', async (_req, res) => {
  try {
    res.json(await q(
      `select cat.id, cat.name, cat.slug, cat.created_at,
              (select count(*)::int from courses c where c.category_id = cat.id) as course_count
         from categories cat order by cat.name`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load categories.', detail: e?.message });
  }
});

adminRouter.post('/categories', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const slug = slugify(req.body?.slug || name);
    const dup = await q('select id from categories where name = $1 or slug = $2', [name, slug]);
    if (dup[0]) return res.status(409).json({ error: 'A category with that name or slug already exists.' });
    const rows = await q('insert into categories(name, slug) values ($1, $2) returning *', [name, slug]);
    res.status(201).json({ ...rows[0], course_count: 0 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create category.', detail: e?.message });
  }
});

adminRouter.patch('/categories/:id', async (req, res) => {
  try {
    const sets: string[] = [];
    const vals: any[] = [];
    if (req.body?.name !== undefined) {
      vals.push(String(req.body.name).trim());
      sets.push(`name = $${vals.length}`);
    }
    if (req.body?.slug !== undefined) {
      vals.push(slugify(req.body.slug));
      sets.push(`slug = $${vals.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(req.params.id);
    const rows = await q(`update categories set ${sets.join(', ')} where id = $${vals.length} returning *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Category not found.' });
    res.json(rows[0]);
  } catch (e: any) {
    if (String(e?.message ?? '').includes('unique')) {
      return res.status(409).json({ error: 'A category with that name or slug already exists.' });
    }
    res.status(500).json({ error: 'Could not update category.', detail: e?.message });
  }
});

adminRouter.delete('/categories/:id', async (req, res) => {
  try {
    const used = await q('select count(*)::int as n from courses where category_id = $1', [req.params.id]);
    if ((used[0]?.n ?? 0) > 0) {
      return res.status(409).json({
        error: `${used[0].n} course${used[0].n === 1 ? '' : 's'} still use this category. Reassign them first.`,
        used_by: used[0].n,
      });
    }
    const rows = await q('delete from categories where id = $1 returning id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Category not found.' });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not delete category.', detail: e?.message });
  }
});

// ============================================================
// Broadcast — one message, every targeted notification row
// ============================================================

adminRouter.post('/broadcast', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    const body = String(req.body?.body ?? '').trim();
    const audience = String(req.body?.audience ?? 'all');
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    if (!['all', 'students', 'instructors', 'active'].includes(audience)) {
      return res.status(400).json({ error: 'Audience must be all, students, instructors or active.' });
    }

    let where = 'is_active = true';
    if (audience === 'students') where = `role = 'STUDENT' and is_active = true`;
    else if (audience === 'instructors') where = `role in ('INSTRUCTOR','ADMIN') and is_active = true`;
    const targets = await q(`select id from profiles where ${where}`);
    if (!targets.length) {
      return res.status(409).json({ error: 'No recipients match that audience yet.' });
    }

    // One shared insert loop: in-app rows for everyone, email best-effort.
    for (const t of targets) {
      await notify(t.id, 'broadcast', title, body.slice(0, 400));
    }
    const rows = await q(
      `insert into broadcasts(title, body, audience, sent_by, recipient_count)
       values ($1, $2, $3, $4, $5) returning *`,
      [title, body, audience, (req as any).admin.id, targets.length]);
    res.status(201).json({ id: rows[0].id, sent: targets.length, broadcast: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send broadcast.', detail: e?.message });
  }
});

adminRouter.get('/broadcasts', async (_req, res) => {
  try {
    res.json(await q('select * from broadcasts order by created_at desc limit 100'));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load broadcasts.', detail: e?.message });
  }
});

// ============================================================
// Reports — 12-month aggregates, all from real tables
// ============================================================

adminRouter.get('/reports', async (_req, res) => {
  try {
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const from = `${months[0]}-01`;

    const [rev, enr, sig, kinds, totals, funnel] = await Promise.all([
      q(`select to_char(date_trunc('month', completed_at), 'YYYY-MM') as month,
                coalesce(sum(amount_kobo), 0)::bigint as kobo
           from transactions
          where status = 'successful' and completed_at >= $1
          group by 1 order by 1`, [from]).catch(() => []),
      q(`select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*)::int as count
           from enrollments where created_at >= $1 group by 1 order by 1`, [from]).catch(() => []),
      q(`select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*)::int as count
           from profiles where created_at >= $1 group by 1 order by 1`, [from]).catch(() => []),
      q(`select 'Course' as kind, c.title, count(e.id)::int as enrolled, coalesce(sum(t.amount_kobo), 0)::bigint as revenue_kobo
           from courses c
           left join enrollments e on e.product_type = 'course' and e.product_id = c.id
           left join transactions t on t.product_type = 'course' and t.product_id = c.id and t.status = 'successful'
          group by c.id, c.title order by enrolled desc, revenue_kobo desc limit 8`).catch(() => []),
      q(`select
           (select count(*)::int from profiles where role = 'STUDENT') as students,
           (select count(*)::int from courses) as courses,
           (select count(*)::int from classrooms) as classrooms,
           (select count(*)::int from enrollments) as enrollments,
           (select coalesce(sum(amount_kobo), 0)::bigint from transactions where status = 'successful') as revenue_kobo,
           (select count(*)::int from transactions where status = 'successful') as successful_payments,
           (select count(*)::int from training_requests where status in ('pending','reviewing','accepted')) as open_requests,
           (select count(*)::int from bookings where status = 'pending') as pending_bookings`).catch(() => [{}]),
      q(`select (select count(*)::int from training_requests) as requests,
                (select count(*)::int from bookings) as bookings,
                (select count(*)::int from enrollments) as enrollments`).catch(() => [{}]),
    ]);

    const series = (rows: any[], valKey: string) => {
      const map = new Map(rows.map((r: any) => [r.month, r]));
      return months.map((m) => ({ month: m, ...(map.get(m) ?? { [valKey]: 0 }) }));
    };

    res.json({
      range: { from: `${from}T00:00:00.000Z`, to: now.toISOString() },
      revenue: series(rev, 'kobo').map((r) => ({ month: r.month, kobo: Number(r.kobo ?? 0) })),
      enrollments: series(enr, 'count').map((r) => ({ month: r.month, count: Number(r.count ?? 0) })),
      signups: series(sig, 'count').map((r) => ({ month: r.month, count: Number(r.count ?? 0) })),
      top: kinds.map((k: any) => ({
        kind: k.kind, title: k.title,
        enrolled: Number(k.enrolled ?? 0), revenue_kobo: Number(k.revenue_kobo ?? 0),
      })),
      totals: {
        students: Number(totals[0]?.students ?? 0),
        courses: Number(totals[0]?.courses ?? 0),
        classrooms: Number(totals[0]?.classrooms ?? 0),
        enrollments: Number(totals[0]?.enrollments ?? 0),
        revenue_kobo: Number(totals[0]?.revenue_kobo ?? 0),
        successful_payments: Number(totals[0]?.successful_payments ?? 0),
        open_requests: Number(totals[0]?.open_requests ?? 0),
        pending_bookings: Number(totals[0]?.pending_bookings ?? 0),
      },
      funnel: {
        requests: Number(funnel[0]?.requests ?? 0),
        bookings: Number(funnel[0]?.bookings ?? 0),
        enrollments: Number(funnel[0]?.enrollments ?? 0),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load reports.', detail: e?.message });
  }
});
