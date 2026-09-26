import { createClient } from '@supabase/supabase-js';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

export async function requireAdmin(req: any, res: any, next: any) {
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Login required.' });
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Auth not configured on server.' });
    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    const { rows } = await pool.query('select role from profiles where id = $1', [data.user.id]);
    if (!rows[0] || rows[0].role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    (req as any).admin = { id: data.user.id, email: data.user.email };
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
