import { Router } from 'express';
import { pool } from '../config/db.js';

export const coursesRouter = Router();

// GET /courses/featured — real DB data, empty array if none. No mocks.
coursesRouter.get('/featured', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `select c.id, c.title, c.slug, c.level, c.short_description, c.price_kobo, c.currency,
              cat.name as category
       from courses c left join categories cat on cat.id = c.category_id
       where c.is_published = true order by c.created_at desc limit 6`
    );
    res.json(rows);
  } catch {
    res.json([]);
  }
});
