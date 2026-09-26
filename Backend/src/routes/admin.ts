import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { notify } from '../lib/notify.js';

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
              (select count(*)::int from training_requests where status='pending') as requests`
    ).catch(() => [{ bookings: 0, requests: 0 }]);
    res.json({
      students: s.n, publishedCourses: c.n, activeClassrooms: r.n,
      enrollments: u.n, successfulPayments: pay.n, revenueKobo: pay.revenue,
      pendingBookings: pending.bookings ?? 0, pendingRequests: pending.requests ?? 0,
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
      `select id, email, full_name, role, is_active, created_at from profiles
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

// ---- Sessions / recordings / materials (read views; recording pipeline lands in Phase 3) ----
adminRouter.get('/sessions', async (_req, res) => {
  try {
    res.json(await q(`select s.*, c.title as classroom_title from classroom_sessions s left join classrooms c on c.id = s.classroom_id order by s.created_at desc limit 100`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load sessions.', detail: e?.message });
  }
});

adminRouter.get('/recordings', async (_req, res) => {
  try {
    res.json(await q(`select r.*, s.title as session_title from classroom_recordings r left join classroom_sessions s on s.id = r.session_id order by r.created_at desc limit 100`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load recordings.', detail: e?.message });
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
adminRouter.get('/conversations', async (_req, res) => {
  try {
    res.json(await q(`select c.*, p.email as student_email from conversations c left join profiles p on p.id = c.student_id order by c.updated_at desc limit 100`));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load conversations.', detail: e?.message });
  }
});

adminRouter.get('/conversations/:id', async (req, res) => {
  try {
    res.json(await q('select * from messages where conversation_id = $1 order by created_at asc', [req.params.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load messages.', detail: e?.message });
  }
});

adminRouter.post('/conversations/:id', async (req, res) => {
  try {
    if (!req.body?.body) return res.status(400).json({ error: 'Message is empty.' });
    const rows = await q('insert into messages(conversation_id, sender_id, body) values ($1, $2, $3) returning *',
      [req.params.id, (req as any).admin.id, req.body.body]);
    await pool.query('update conversations set updated_at = now() where id = $1', [req.params.id]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: 'Could not send message.', detail: e?.message });
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
    if (status === 'live') {
      const members = await q(`select user_id from enrollments where product_type = 'classroom' and product_id = $1`, [s[0].classroom_id]);
      const c = await q('select title from classrooms where id = $1', [s[0].classroom_id]);
      for (const m of members) {
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
