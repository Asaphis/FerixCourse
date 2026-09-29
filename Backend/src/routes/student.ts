import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { emit } from '../lib/bus.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

// ---- Student: create training request ----
export const requestsRouter = Router();
requestsRouter.post('/', requireUser, async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.topic) return res.status(400).json({ error: 'What do you want to learn? (topic is required)' });
    const rows = await q(
      `insert into training_requests(user_id, topic, current_level, background, goals, preferred_schedule,
        preferred_days, preferred_time, mode, audience, budget_kobo, message)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [(req as any).user.id, b.topic, b.current_level ?? 'Beginner', b.background ?? '', b.goals ?? '',
       b.preferred_schedule ?? '', b.preferred_days ?? '', b.preferred_time ?? '',
       b.mode ?? 'online', b.audience ?? 'individual', b.budget_kobo ?? 0, b.message ?? '']);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not submit request. Run migrations, then try again.', detail: e?.message });
  }
});
requestsRouter.get('/mine', requireUser, async (req, res) => {
  try {
    res.json(await q('select * from training_requests where user_id = $1 order by created_at desc', [(req as any).user.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load your requests.', detail: e?.message });
  }
});

// ---- Student: create booking ----
export const bookingsRouter = Router();
bookingsRouter.post('/', requireUser, async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.topic) return res.status(400).json({ error: 'Topic is required.' });
    const rows = await q(
      `insert into bookings(user_id, topic, duration_min, mode, preferred_date, preferred_time, location, message)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [(req as any).user.id, b.topic, b.duration_min ?? 60, b.mode ?? 'online',
       b.preferred_date ?? null, b.preferred_time ?? '', b.location ?? '', b.message ?? '']);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create booking. Run migrations, then try again.', detail: e?.message });
  }
});
bookingsRouter.get('/mine', requireUser, async (req, res) => {
  try {
    res.json(await q('select * from bookings where user_id = $1 order by created_at desc', [(req as any).user.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load your bookings.', detail: e?.message });
  }
});

// ---- Student: messages (threaded, attachments, read receipts) ----
export const messagesRouter = Router();

/** Row → API shape: attachment object (or null) instead of three raw columns. */
function toApi(row: any, urlBase: string) {
  const { attachment_key, attachment_name, attachment_kind, ...rest } = row;
  return {
    ...rest,
    attachment: attachment_key
      ? { key: attachment_key, name: attachment_name ?? 'file', kind: attachment_kind ?? 'file', url: `${urlBase}/${row.id}` }
      : null,
  };
}

const ENRICH = `
  select m.id, m.conversation_id, m.sender_id, m.body, m.is_read, m.created_at, m.parent_id,
         pm.body as parent_body, pp.full_name as parent_sender,
         sp.full_name as sender_name,
         m.attachment_key, m.attachment_name, m.attachment_kind
  from messages m
  left join messages pm on pm.id = m.parent_id
  left join profiles pp on pp.id = pm.sender_id
  left join profiles sp on sp.id = m.sender_id`;

async function loadThread(convId: string, me: string, since?: string) {
  const params: any[] = [convId];
  let where = 'm.conversation_id = $1';
  if (since) {
    params.push(since);
    where += ` and m.created_at > $${params.length}`;
  }
  const rows = await q(`${ENRICH} where ${where} order by m.created_at asc`, params);
  return rows.map((r: any) => toApi(r, '/files/message'));
}

messagesRouter.get('/conversations', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    res.json(await q(
      `select c.*,
              (select count(*)::int from messages m where m.conversation_id = c.id and m.sender_id != $1 and m.is_read = false) as unread,
              (select m.body from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_body,
              (select m.created_at from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_at,
              (select p.full_name from messages m join profiles p on p.id = m.sender_id
                where m.conversation_id = c.id and p.role != 'STUDENT'
                order by m.created_at desc limit 1) as admin_name
         from conversations c
        where c.student_id = $1
        order by coalesce((select max(m.created_at) from messages m where m.conversation_id = c.id), c.updated_at) desc`,
      [me]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load conversations.', detail: e?.message });
  }
});
messagesRouter.post('/conversations', requireUser, async (req, res) => {
  try {
    const rows = await q('insert into conversations(student_id, subject) values ($1, $2) returning *',
      [(req as any).user.id, req.body?.subject ?? '']);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not start conversation.', detail: e?.message });
  }
});
messagesRouter.get('/conversations/:id', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const conv = await q('select * from conversations where id = $1 and student_id = $2', [req.params.id, me]);
    if (!conv[0]) return res.status(404).json({ error: 'Conversation not found.' });
    res.json(await loadThread(req.params.id, me, req.query.since ? String(req.query.since) : undefined));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load messages.', detail: e?.message });
  }
});
messagesRouter.post('/conversations/:id', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const conv = await q('select * from conversations where id = $1 and student_id = $2', [req.params.id, me]);
    if (!conv[0]) return res.status(404).json({ error: 'Conversation not found.' });
    const body = String(req.body?.body ?? '').trim();
    const att = req.body?.attachment;
    if (!body && !att?.key) return res.status(400).json({ error: 'Message is empty.' });
    if (req.body?.parent_id) {
      const parent = await q('select id from messages where id = $1 and conversation_id = $2',
        [req.body.parent_id, req.params.id]);
      if (!parent[0]) return res.status(400).json({ error: 'Reply target not found in this conversation.' });
    }
    const rows = await q(
      `insert into messages(conversation_id, sender_id, body, parent_id, attachment_key, attachment_name, attachment_kind)
       values ($1, $2, $3, $4, $5, $6, $7) returning *`,
      [req.params.id, me, body, req.body?.parent_id ?? null,
       att?.key ?? null, att?.name ?? null, att?.kind ?? null]);
    await pool.query('update conversations set updated_at = now() where id = $1', [req.params.id]);

    const enriched = toApi(
      (await q(`${ENRICH} where m.id = $1`, [rows[0].id]))[0],
      '/files/message');
    // Realtime: the learner's own socket (other devices) + the admin console.
    emit(`user:${conv[0].student_id}`, 'message', { conversation_id: conv[0].id, message: enriched });
    emit('admin', 'message', { conversation_id: conv[0].id, message: enriched });
    res.status(201).json(enriched);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send message.', detail: e?.message });
  }
});

// POST /messages/conversations/:id/read — mark the other side's messages read.
messagesRouter.post('/conversations/:id/read', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const conv = await q('select id from conversations where id = $1 and student_id = $2', [req.params.id, me]);
    if (!conv[0]) return res.status(404).json({ error: 'Conversation not found.' });
    const r = await pool.query('update messages set is_read = true where conversation_id = $1 and sender_id != $2',
      [req.params.id, me]);
    res.json({ ok: true, read: r.rowCount ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not mark as read.', detail: e?.message });
  }
});

/* POST /messages/uploads (multipart, field "file") — attachment bytes for a
   chat message. Same R2 pattern as admin uploads; 503 when unconfigured. */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

function storage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;
  const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
    }),
    bucket: R2_BUCKET_NAME!,
  };
}

const kindOf = (mime: string) =>
  mime === 'application/pdf' ? 'pdf' : mime.startsWith('image/') ? 'image' : 'file';

messagesRouter.post('/uploads', requireUser, upload.single('file'), async (req, res) => {
  try {
    const store = storage();
    if (!store) return res.status(503).json({ error: 'File storage is not configured yet (R2 credentials missing).' });
    if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
    const original = req.file.originalname || 'file';
    const safe = original.replace(/[^\w.\-]+/g, '_').slice(-120);
    const key = `messages/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safe}`;
    await store.client.send(new PutObjectCommand({
      Bucket: store.bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'application/octet-stream',
    }));
    res.status(201).json({
      key,
      name: original,
      kind: kindOf(req.file.mimetype || ''),
      size: req.file.size,
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not store the file.', detail: e?.message });
  }
});

// POST /messages/typing {conversation_id} — ephemeral SSE event, no DB write.
messagesRouter.post('/typing', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const conv = await q('select id, student_id from conversations where id = $1 and student_id = $2',
      [req.body?.conversation_id, me]);
    if (!conv[0]) return res.status(404).json({ error: 'Conversation not found.' });
    emit(`user:${conv[0].student_id}`, 'typing', { conversation_id: conv[0].id, user_id: me });
    emit('admin', 'typing', { conversation_id: conv[0].id, user_id: me });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send typing event.', detail: e?.message });
  }
});

// ---- Student: my notifications ----
export const notificationsRouter = Router();
notificationsRouter.get('/mine', requireUser, async (req, res) => {
  try {
    res.json(await q('select * from notifications where user_id = $1 order by created_at desc limit 50', [(req as any).user.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load notifications.', detail: e?.message });
  }
});

// PATCH /notifications/:id {is_read} — one notification read.
notificationsRouter.patch('/:id', requireUser, async (req, res) => {
  try {
    if (req.body?.is_read === undefined) return res.status(400).json({ error: 'is_read is required.' });
    const rows = await q(
      'update notifications set is_read = $1 where id = $2 and user_id = $3 returning *',
      [Boolean(req.body.is_read), req.params.id, (req as any).user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Notification not found.' });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not update notification.', detail: e?.message });
  }
});

// POST /notifications/read-all — the bell menu "mark all read".
notificationsRouter.post('/read-all', requireUser, async (req, res) => {
  try {
    const r = await pool.query('update notifications set is_read = true where user_id = $1 and is_read = false',
      [(req as any).user.id]);
    res.json({ ok: true, updated: r.rowCount ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not mark all as read.', detail: e?.message });
  }
});
