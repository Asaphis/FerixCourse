import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

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

// ---- Student: messages ----
export const messagesRouter = Router();
messagesRouter.get('/conversations', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    res.json(await q(
      `select c.*, (select count(*)::int from messages m where m.conversation_id = c.id and m.is_read = false and m.sender_id != $1) as unread
       from conversations c where c.student_id = $1 order by c.updated_at desc`, [me]));
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
    res.json(await q('select * from messages where conversation_id = $1 order by created_at asc', [req.params.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load messages.', detail: e?.message });
  }
});
messagesRouter.post('/conversations/:id', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const conv = await q('select * from conversations where id = $1 and student_id = $2', [req.params.id, me]);
    if (!conv[0]) return res.status(404).json({ error: 'Conversation not found.' });
    if (!req.body?.body) return res.status(400).json({ error: 'Message is empty.' });
    const rows = await q('insert into messages(conversation_id, sender_id, body) values ($1, $2, $3) returning *',
      [req.params.id, me, req.body.body]);
    await pool.query('update conversations set updated_at = now() where id = $1', [req.params.id]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send message.', detail: e?.message });
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
