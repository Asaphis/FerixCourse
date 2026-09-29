import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

export const publicRouter = Router();

// GET /api/categories — real rows only
publicRouter.get('/categories', async (_req, res) => {
  try {
    res.json(await q('select id, name, slug from categories order by name'));
  } catch {
    res.json([]);
  }
});

// GET /api/courses?search=&category=&level=
publicRouter.get('/courses', async (req, res) => {
  try {
    const search = `%${String(req.query.search ?? '')}%`;
    const category = String(req.query.category ?? '');
    const level = String(req.query.level ?? '');
    res.json(await q(
      `select c.id, c.title, c.slug, c.level, c.short_description, c.price_kobo, c.currency, c.cover_url,
              cat.name as category, cat.slug as category_slug,
              (select count(*)::int from enrollments e where e.product_type = 'course' and e.product_id = c.id) as students
       from courses c left join categories cat on cat.id = c.category_id
       where c.is_published = true
         and (c.title ilike $1 or c.short_description ilike $1)
         and ($2 = '' or cat.slug = $2)
         and ($3 = '' or c.level = $3)
       order by c.created_at desc limit 60`,
      [search, category, level]));
  } catch {
    res.json([]);
  }
});

// GET /api/classrooms?search=&level=
publicRouter.get('/classrooms', async (req, res) => {
  try {
    const search = `%${String(req.query.search ?? '')}%`;
    const level = String(req.query.level ?? '');
    res.json(await q(
      `select c.id, c.title, c.slug, c.level, c.description, c.price_kobo, c.currency, c.capacity,
              c.starts_at, c.ends_at, c.schedule_text,
              (select count(*)::int from enrollments e where e.product_type = 'classroom' and e.product_id = c.id) as enrolled
       from classrooms c
       where c.is_published = true
         and (c.title ilike $1 or c.description ilike $1)
         and ($2 = '' or c.level = $2)
       order by c.starts_at asc nulls last limit 60`,
      [search, level]));
  } catch {
    res.json([]);
  }
});

// GET /api/classrooms/:slug — full detail + sessions
publicRouter.get('/classrooms/:slug', async (req, res) => {
  try {
    const rows = await q(
      `select c.*, (select count(*)::int from enrollments e where e.product_type = 'classroom' and e.product_id = c.id) as enrolled,
              (select count(*)::int from classroom_materials m where m.classroom_id = c.id) as material_count
       from classrooms c where c.slug = $1 and c.is_published = true`, [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Classroom not found.' });
    const sessions = await q('select id, title, starts_at, ends_at, recording_status from classroom_sessions where classroom_id = $1 order by starts_at asc', [rows[0].id]).catch(() => []);
    // Materials stay private: members load them via the workspace endpoint.
    res.json({ ...rows[0], sessions });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load classroom.' });
  }
});

// GET /api/courses/:slug — course detail + sections/lessons (titles only; video gated by enrollment)
publicRouter.get('/courses/:slug', async (req, res) => {
  try {
    const rows = await q(
      `select c.*, cat.name as category,
              (select count(*)::int from enrollments e where e.product_type = 'course' and e.product_id = c.id) as students
       from courses c left join categories cat on cat.id = c.category_id
       where c.slug = $1 and c.is_published = true`, [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Course not found.' });
    const sections = await q(
      `select s.id, s.title, s.position,
              (select json_agg(json_build_object('id', l.id, 'title', l.title, 'position', l.position, 'duration_sec', l.duration_sec, 'is_free_preview', l.is_free_preview) order by l.position)
               from lessons l where l.section_id = s.id) as lessons
       from course_sections s where s.course_id = $1 order by s.position`, [rows[0].id]).catch(() => []);
    res.json({ ...rows[0], sections });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load course.' });
  }
});

// ---- Logged-in student views ----
publicRouter.get('/enrollments/mine', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const courses = await q(
      `select c.id, c.title, c.slug, c.cover_url, e.created_at as enrolled_at from enrollments e
       join courses c on c.id = e.product_id where e.user_id = $1 and e.product_type = 'course' order by e.created_at desc`, [me]);
    const rooms = await q(
      `select c.id, c.title, c.slug, c.schedule_text, c.starts_at, e.created_at as enrolled_at from enrollments e
       join classrooms c on c.id = e.product_id where e.user_id = $1 and e.product_type = 'classroom' order by e.created_at desc`, [me]);
    res.json({ courses, classrooms: rooms });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load enrollments.', detail: e?.message });
  }
});

publicRouter.get('/transactions/mine', requireUser, async (req, res) => {
  try {
    res.json(await q('select * from transactions where user_id = $1 order by created_at desc limit 50', [(req as any).user.id]));
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load transactions.', detail: e?.message });
  }
});

/*
  GET /api/dashboard/summary — the learner board in one honest request.

  Every number comes from real tables (enrollments, lesson_progress,
  classroom_sessions, messages, notifications). Empty account → zeros and
  nulls, never fixtures.
*/
publicRouter.get('/dashboard/summary', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;

    const [meRows, stats, courses, upNext, recent] = await Promise.all([
      q('select full_name from profiles where id = $1', [me]),
      q(
        `select
           (select count(*)::int from classroom_sessions s
              join enrollments e on e.product_type='classroom' and e.product_id = s.classroom_id and e.user_id = $1
              where s.status = 'live') as live_now,
           (select count(*)::int from messages m join conversations c on c.id = m.conversation_id
              where c.student_id = $1 and m.sender_id != $1 and m.is_read = false) as unread,
           (select count(*)::int from (
              select distinct on (m.conversation_id) m.conversation_id, m.sender_id
              from messages m join conversations c on c.id = m.conversation_id
              where c.student_id = $1
              order by m.conversation_id, m.created_at desc
            ) last where last.sender_id = $1) as awaiting_reply,
           (select count(*)::int from enrollments where user_id = $1 and product_type = 'classroom') as classes_total,
           (select count(*)::int from enrollments where user_id = $1 and product_type = 'course') as courses_total`,
        [me]
      ),
      // Course with the most recent progress (else latest enrollment).
      q(
        `select c.id as course_id, c.title as course_title, c.slug as course_slug,
                (select count(*)::int from lesson_progress lp
                   join lessons l on l.id = lp.lesson_id
                   join course_sections s on s.id = l.section_id
                  where s.course_id = c.id and lp.user_id = $1 and lp.completed) as done,
                (select count(*)::int from lessons l join course_sections s on s.id = l.section_id
                  where s.course_id = c.id) as total,
                (select max(lp.updated_at) from lesson_progress lp
                   join lessons l on l.id = lp.lesson_id
                   join course_sections s on s.id = l.section_id
                  where s.course_id = c.id and lp.user_id = $1) as last_at
           from enrollments e join courses c on c.id = e.product_id
          where e.user_id = $1 and e.product_type = 'course'
          order by last_at desc nulls last, e.created_at desc`,
        [me]
      ).catch(() => []),
      q(
        `select s.id as session_id, s.classroom_id, c.title as classroom_title, c.slug as classroom_slug,
                s.title, s.starts_at, (s.status = 'live') as live
           from classroom_sessions s
           join classrooms c on c.id = s.classroom_id
           join enrollments e on e.product_type = 'classroom' and e.product_id = c.id and e.user_id = $1
          where s.status = 'live'
             or (s.status = 'scheduled' and s.starts_at is not null and s.starts_at >= now() - interval '30 minutes')
          order by (s.status = 'live') desc, coalesce(s.starts_at, now()) asc
          limit 5`,
        [me]
      ).catch(() => []),
      q('select id, type, title, body, is_read, created_at from notifications where user_id = $1 order by created_at desc limit 8', [me])
        .catch(() => []),
    ]);

    // continue_learning: prefer a course that is started but unfinished.
    let cont: any = null;
    const pick = courses.find((c: any) => c.total > 0 && c.done > 0 && c.done < c.total)
      ?? courses.find((c: any) => c.total > 0);
    if (pick) {
      const lessons = await q(
        `select l.title, coalesce(lp.completed, false) as completed
           from lessons l
           join course_sections s on s.id = l.section_id
           left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = $2
          where s.course_id = $1
          order by s.position, l.position`,
        [pick.course_id, me]).catch(() => []);
      if (lessons.length) {
        const done = lessons.filter((l: any) => l.completed).length;
        const next = lessons.find((l: any) => !l.completed);
        cont = {
          course_id: pick.course_id,
          course_title: pick.course_title,
          course_slug: pick.course_slug,
          lesson_title: next?.title ?? lessons[lessons.length - 1].title,
          progress_pct: Math.round((done / lessons.length) * 100),
          lessons_done: done,
          lessons_total: lessons.length,
        };
      }
    }

    const LINKS: Record<string, string> = {
      live: '/classes',
      request_update: '/request',
      request_converted: '/request',
      booking_update: '/book',
      booking_price: '/book',
      enrollment: '/my-courses',
      material: '/my-courses',
      feedback: '/my-courses',
    };

    const s = stats[0] ?? {};
    const now = new Date();
    res.json({
      first_name: (meRows[0]?.full_name ?? '').split(' ')[0] || 'there',
      date_label: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      stats: {
        live_now: s.live_now ?? 0,
        awaiting_reply: s.awaiting_reply ?? 0,
        unread: s.unread ?? 0,
        classes_total: s.classes_total ?? 0,
        courses_total: s.courses_total ?? 0,
      },
      continue_learning: cont,
      up_next: upNext,
      recent: recent.map((n: any) => ({ ...n, link: LINKS[n.type] ?? '/notifications' })),
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load your board.', detail: e?.message });
  }
});
