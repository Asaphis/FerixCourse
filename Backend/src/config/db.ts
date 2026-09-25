import { Pool } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export async function checkDb(): Promise<{ ok: boolean; error?: string }> {
  try {
    await pool.query('select 1');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'db unreachable' };
  }
}
