import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

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
      await pool.query(`insert into notifications(user_id, type, title, body) values ($1, 'request_update', $2, $3)`,
        [rows[0].user_id, `Training request ${req.body.status}`, rows[0].topic]).catch(() => {});
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
      await pool.query(`insert into notifications(user_id, type, title, body) values ($1, 'booking_update', $2, $3)`,
        [rows[0].user_id, `Booking ${req.body.status}`, rows[0].topic]).catch(() => {});
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
