import { Router } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

function storage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;
  const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    client: new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! } }),
    bucket: R2_BUCKET_NAME!,
  };
}

async function enrolled(userId: string, type: string, id: string): Promise<boolean> {
  const rows = await q(`select id from enrollments where user_id = $1 and product_type = $2 and product_id = $3`,
    [userId, type, id]);
  if (rows[0]) return true;
  const prof = await q(`select role from profiles where id = $1`, [userId]);
  return prof[0]?.role === 'ADMIN' || prof[0]?.role === 'INSTRUCTOR';
}

export const filesRouter = Router();

// GET /files/:scope/:id — membership-checked, 15-minute signed URL. Nothing public.
filesRouter.get('/:scope/:id', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const store = storage();
    if (!store) return res.status(503).json({ error: 'File storage is not configured yet.' });

    let key = '';
    if (req.params.scope === 'classroom-material') {
      const rows = await q('select * from classroom_materials where id = $1', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'File not found.' });
      if (!(await enrolled(me, 'classroom', rows[0].classroom_id))) {
        return res.status(403).json({ error: "You don't have access to this file." });
      }
      key = rows[0].storage_key;
    } else if (req.params.scope === 'course-material') {
      const rows = await q('select * from course_materials where id = $1', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'File not found.' });
      const courseId = rows[0].course_id ?? (
        await q('select course_id from course_sections s join lessons l on l.section_id = s.id where l.id = $1', [rows[0].lesson_id]).catch(() => [])
      )[0]?.course_id;
      if (!courseId || !(await enrolled(me, 'course', courseId))) {
        return res.status(403).json({ error: "You don't have access to this file." });
      }
      key = rows[0].storage_key;
    } else if (req.params.scope === 'recording') {
      const rows = await q(
        `select r.*, s.classroom_id from classroom_recordings r join classroom_sessions s on s.id = r.session_id where r.id = $1 and r.status = 'ready'`,
        [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Recording not ready or not found.' });
      if (!(await enrolled(me, 'classroom', rows[0].classroom_id))) {
        return res.status(403).json({ error: "You don't have access to this recording." });
      }
      key = rows[0].storage_key;
    } else if (req.params.scope === 'message') {
      // Chat attachment: sender, the conversation's student, or staff.
      const rows = await q('select * from messages where id = $1', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'File not found.' });
      const conv = await q('select student_id from conversations where id = $1', [rows[0].conversation_id]);
      const prof = await q('select role from profiles where id = $1', [me]);
      const staff = prof[0]?.role === 'ADMIN' || prof[0]?.role === 'INSTRUCTOR';
      if (rows[0].sender_id !== me && conv[0]?.student_id !== me && !staff) {
        return res.status(403).json({ error: "You don't have access to this file." });
      }
      if (!rows[0].attachment_key) return res.status(404).json({ error: 'This message has no attachment.' });
      key = rows[0].attachment_key;
    } else if (req.params.scope === 'classroom-message') {
      // Classroom discussion attachment: enrolled member or staff.
      const rows = await q('select * from classroom_messages where id = $1', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'File not found.' });
      if (!(await enrolled(me, 'classroom', rows[0].classroom_id))) {
        return res.status(403).json({ error: "You don't have access to this file." });
      }
      if (!rows[0].attachment_key) return res.status(404).json({ error: 'This message has no attachment.' });
      key = rows[0].attachment_key;
    } else {
      return res.status(400).json({ error: 'Unknown file scope.' });
    }

    const url = await getSignedUrl(store.client, new GetObjectCommand({ Bucket: store.bucket, Key: key }), { expiresIn: 900 });
    res.json({ url, expires_in: 900 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not open file.' });
  }
});
