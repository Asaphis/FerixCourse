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
      `select c.*, (select count(*)::int from enrollments e where e.product_type = 'classroom' and e.product_id = c.id) as enrolled
       from classrooms c where c.slug = $1 and c.is_published = true`, [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Classroom not found.' });
    const sessions = await q('select id, title, starts_at, ends_at, recording_status from classroom_sessions where classroom_id = $1 order by starts_at asc', [rows[0].id]).catch(() => []);
    const materials = await q('select id, title, mime, size_bytes from classroom_materials where classroom_id = $1 order by created_at asc', [rows[0].id]).catch(() => []);
    res.json({ ...rows[0], sessions, materials });
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
