import { pool } from '../config/db.js';
import { sendEmail } from './email.js';

// One call = in-app notification row + email (when configured).
// Never throws: notification delivery must not break the main flow.
export async function notify(userId: string, type: string, title: string, body: string): Promise<void> {
  try {
    await pool.query(`insert into notifications(user_id, type, title, body) values ($1, $2, $3, $4)`,
      [userId, type, title, body]);
  } catch {}
  try {
    const rows = await pool.query('select email from profiles where id = $1', [userId]);
    if (rows.rows[0]?.email) await sendEmail(rows.rows[0].email, title, body);
  } catch {}
}
