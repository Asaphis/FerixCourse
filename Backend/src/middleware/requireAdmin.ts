import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

export async function requireAdmin(req: any, res: any, next: any) {
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Login required.' });
    let payload: any;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    const { rows } = await pool.query('select id, email, role from profiles where id = $1', [payload.sub]);
    if (!rows[0] || rows[0].role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    (req as any).admin = { id: rows[0].id, email: rows[0].email };
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
