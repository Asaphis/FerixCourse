import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

async function slaHours(): Promise<number> {
  const rows = await q(`select value from settings where key = 'request_sla'`).catch(() => []);
  return Number(rows[0]?.value?.hours ?? 48);
}

async function enrolledIn(userId: string, type: string, id: string): Promise<boolean> {
  const rows = await q(`select id from enrollments where user_id = $1 and product_type = $2 and product_id = $3`,
    [userId, type, id]);
  if (rows[0]) return true;
  const prof = await q(`select role from profiles where id = $1`, [userId]);
  return prof[0]?.role === 'ADMIN' || prof[0]?.role === 'INSTRUCTOR';
}

export const scopeRouter = Router();

// ---- Public request queue (no identities, only demand signals) ----
scopeRouter.get('/requests/open', async (_req, res) => {
  try {
    res.json(await q(
      `select r.id, r.topic, r.current_level, r.mode, r.audience, r.created_at,
              (select count(*)::int from request_queue w where w.request_id = r.id) as waiting
       from training_requests r
       where r.status in ('pending','reviewing','accepted') and r.converted_classroom_id is null
       order by waiting desc, r.created_at asc limit 50`).catch(() => []));
  } catch {
    res.json([]);
  }
});

// POST /scope/requests/:id/join — join the waiting list.
scopeRouter.post('/requests/:id/join', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const r = await q('select id, status from training_requests where id = $1', [req.params.id]);
    if (!r[0]) return res.status(404).json({ error: 'Request not found.' });
    if (!['pending', 'reviewing', 'accepted'].includes(r[0].status)) {
      return res.status(400).json({ error: 'This request is no longer open.' });
    }
    await pool.query(`insert into request_queue(request_id, user_id) values ($1, $2) on conflict do nothing`,
      [req.params.id, me]);
    const pos = await q(
      `select count(*)::int as n from request_queue where request_id = $1 and created_at <= (select created_at from request_queue where request_id = $1 and user_id = $2)`,
      [req.params.id, me]);
    res.status(201).json({ position: pos[0]?.n ?? 1 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not join queue.', detail: e?.message });
  }
});

// GET /scope/requests/status — mine + joined, with position + estimate.
scopeRouter.get('/requests/status', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const sla = await slaHours();
    const mine = await q(
      `select r.*, (select count(*)::int from request_queue w where w.request_id = r.id) as waiting,
              c.slug as classroom_slug, c.title as classroom_title
       from training_requests r left join classrooms c on c.id = r.converted_classroom_id
       where r.user_id = $1 order by r.created_at desc`, [me]).catch(() => []);
    const joined = await q(
      `select r.id, r.topic, r.status, r.converted_classroom_id,
              (select count(*)::int from request_queue w where w.request_id = r.id and w.created_at <= mine.created_at) as position,
              (select count(*)::int from request_queue w where w.request_id = r.id) as waiting,
              c.slug as classroom_slug
       from request_queue mine join training_requests r on r.id = mine.request_id
       left join classrooms c on c.id = r.converted_classroom_id
       where mine.user_id = $1 order by mine.created_at desc`, [me]).catch(() => []);
    res.json({ sla_hours: sla, mine, joined });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load request status.', detail: e?.message });
  }
});

// ---- Classroom workspace (members only) ----
scopeRouter.get('/classrooms/:id/workspace', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    if (!(await enrolledIn(me, 'classroom', req.params.id))) {
      return res.status(403).json({ error: "You don't have access to this classroom." });
    }
    const [sessions, materials, announcements, assignments, recordings, messages] = await Promise.all([
      q('select id, title, starts_at, ends_at, status, recording_status from classroom_sessions where classroom_id = $1 order by starts_at asc', [req.params.id]).catch(() => []),
      q('select id, title, mime, size_bytes from classroom_materials where classroom_id = $1 order by created_at asc', [req.params.id]).catch(() => []),
      q('select * from announcements where classroom_id = $1 order by created_at desc limit 20', [req.params.id]).catch(() => []),
      q('select a.*, (select count(*)::int from submissions s where s.assignment_id = a.id and s.user_id = $2) as submitted from assignments a where a.classroom_id = $1 order by a.created_at desc', [req.params.id, me]).catch(() => []),
      q(`select r.id, r.duration_sec, r.status, s.title as session_title from classroom_recordings r join classroom_sessions s on s.id = r.session_id where s.classroom_id = $1 and r.status = 'ready' order by r.created_at desc`, [req.params.id]).catch(() => []),
      q(`select m.*, p.full_name as sender_name from classroom_messages m left join profiles p on p.id = m.sender_id where m.classroom_id = $1 order by m.created_at asc limit 100`, [req.params.id]).catch(() => []),
    ]);
    res.json({ sessions, materials, announcements, assignments, recordings, messages });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load workspace.' });
  }
});

scopeRouter.post('/classrooms/:id/messages', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    if (!(await enrolledIn(me, 'classroom', req.params.id))) {
      return res.status(403).json({ error: "You don't have access to this classroom." });
    }
    if (!req.body?.body?.trim()) return res.status(400).json({ error: 'Message is empty.' });
    const rows = await q('insert into classroom_messages(classroom_id, sender_id, body) values ($1, $2, $3) returning *',
      [req.params.id, me, req.body.body.trim()]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send message.' });
  }
});

// ---- Course learn view (purchasers only) ----
scopeRouter.get('/courses/:id/learn', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    if (!(await enrolledIn(me, 'course', req.params.id))) {
      return res.status(403).json({ error: 'Enroll to access lessons.' });
    }
    const sections = await q(
      `select s.id, s.title, s.position,
        (select json_agg(json_build_object('id', l.id, 'title', l.title, 'position', l.position, 'duration_sec', l.duration_sec, 'video_key', l.video_key, 'completed', coalesce((select lp.completed from lesson_progress lp where lp.lesson_id = l.id and lp.user_id = $2), false)) order by l.position)
         from lessons l where l.section_id = s.id) as lessons
       from course_sections s where s.course_id = $1 order by s.position`, [req.params.id, me]);
    const materials = await q(
      `select m.* from course_materials m join lessons l on l.id = m.lesson_id join course_sections s on s.id = l.section_id where s.course_id = $1 order by m.created_at asc`,
      [req.params.id]).catch(() => []);
    const total = sections.reduce((n: number, s: any) => n + (s.lessons?.length ?? 0), 0);
    const doneC = await q(
      `select count(*)::int as n from lesson_progress lp join lessons l on l.id = lp.lesson_id join course_sections s on s.id = l.section_id where s.course_id = $1 and lp.user_id = $2 and lp.completed = true`,
      [req.params.id, me]).catch(() => [{ n: 0 }]);
    res.json({ sections, materials, total, completed: doneC[0]?.n ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load course.' });
  }
});

scopeRouter.post('/lessons/:id/complete', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const l = await q(
      `select s.course_id from lessons l join course_sections s on s.id = l.section_id where l.id = $1`, [req.params.id]);
    if (!l[0]) return res.status(404).json({ error: 'Lesson not found.' });
    if (!(await enrolledIn(me, 'course', l[0].course_id))) {
      return res.status(403).json({ error: 'Enroll to track progress.' });
    }
    await pool.query(
      `insert into lesson_progress(user_id, lesson_id, completed, updated_at) values ($1, $2, true, now())
       on conflict (user_id, lesson_id) do update set completed = true, updated_at = now()`,
      [me, req.params.id]);
    res.json({ completed: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not save progress.' });
  }
});

// ---- Booking workspace (the two parties only) ----
scopeRouter.get('/bookings/:id', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const b = await q('select * from bookings where id = $1', [req.params.id]);
    if (!b[0]) return res.status(404).json({ error: 'Booking not found.' });
    const prof = await q('select role from profiles where id = $1', [me]);
    const staff = prof[0]?.role === 'ADMIN' || prof[0]?.role === 'INSTRUCTOR';
    if (b[0].user_id !== me && !staff) return res.status(403).json({ error: 'Not your booking.' });
    const conv = await q('select * from conversations where booking_id = $1 order by created_at desc limit 1', [req.params.id]);
    let messages: any[] = [];
    if (conv[0]) {
      messages = await q('select * from messages where conversation_id = $1 order by created_at asc limit 100', [conv[0].id]);
    }
    res.json({ booking: b[0], conversation: conv[0] ?? null, messages });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load booking.' });
  }
});

scopeRouter.post('/bookings/:id/messages', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const b = await q('select * from bookings where id = $1', [req.params.id]);
    if (!b[0]) return res.status(404).json({ error: 'Booking not found.' });
    const prof = await q('select role from profiles where id = $1', [me]);
    const staff = prof[0]?.role === 'ADMIN' || prof[0]?.role === 'INSTRUCTOR';
    if (b[0].user_id !== me && !staff) return res.status(403).json({ error: 'Not your booking.' });
    if (!req.body?.body?.trim()) return res.status(400).json({ error: 'Message is empty.' });
    let conv = await q('select * from conversations where booking_id = $1 order by created_at desc limit 1', [req.params.id]);
    if (!conv[0]) {
      conv = await q('insert into conversations(student_id, booking_id, subject) values ($1, $2, $3) returning *',
        [b[0].user_id, req.params.id, `Booking: ${b[0].topic}`]);
    }
    const rows = await q('insert into messages(conversation_id, sender_id, body) values ($1, $2, $3) returning *',
      [conv[0].id, me, req.body.body.trim()]);
    await pool.query('update conversations set updated_at = now() where id = $1', [conv[0].id]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send message.' });
  }
});

// ---- Submissions (members only) ----
scopeRouter.post('/assignments/:id/submit', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const a = await q('select * from assignments where id = $1', [req.params.id]);
    if (!a[0]) return res.status(404).json({ error: 'Assignment not found.' });
    if (!(await enrolledIn(me, 'classroom', a[0].classroom_id))) {
      return res.status(403).json({ error: "You don't have access." });
    }
    await pool.query(
      `insert into submissions(assignment_id, user_id, body) values ($1, $2, $3)
       on conflict (assignment_id, user_id) do update set body = excluded.body, created_at = now()`,
      [req.params.id, me, req.body?.body ?? '']);
    res.json({ submitted: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not submit.' });
  }
});
