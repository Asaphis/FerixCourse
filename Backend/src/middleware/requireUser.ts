import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

// Backend-owned sessions: Authorization: Bearer <JWT from /auth/login>.
export async function requireUser(req: any, res: any, next: any) {
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Login required.' });
    let payload: any;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    const { rows } = await pool.query('select id, email, role, is_active from profiles where id = $1', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'Account not found.' });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account disabled. Contact support.' });
    (req as any).user = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
