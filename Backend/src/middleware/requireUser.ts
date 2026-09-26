import { createClient } from '@supabase/supabase-js';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

// Any logged-in user (student or admin). Attaches req.user = { id, email }.
export async function requireUser(req: any, res: any, next: any) {
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Login required.' });
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Auth not configured on server.' });
    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    // Ensure a profile row exists for FK integrity.
    await pool.query(
      `insert into profiles(id, email, full_name) values ($1, $2, $3)
       on conflict (id) do nothing`,
      [data.user.id, data.user.email ?? '', String(data.user.user_metadata?.full_name ?? data.user.email ?? 'Student')]
    ).catch(() => {});
    (req as any).user = { id: data.user.id, email: data.user.email };
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
