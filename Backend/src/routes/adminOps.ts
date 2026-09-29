import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { notify } from '../lib/notify.js';
import { emit } from '../lib/bus.js';

/*
  Admin operations that the console needs in order to actually *manage* what a
  learner can see and do.

  Why a second admin router instead of growing admin.ts: this codebase mounts
  one router per business function (see the note in app.ts). admin.ts keeps the
  original read views + create/patch flows; everything here is the management
  layer (content authoring, membership, live control, deletions) that the
  learner-facing features implied but the API never exposed.

  Every route requires role = 'ADMIN' via requireAdmin. Every response is real
  DB data; empty collections are returned as empty arrays, never mocked.
*/

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;
const adminId = (req: any): string => req.admin.id;
const fail = (res: any, message: string, e?: any) =>
  res.status(500).json({ error: message, detail: e?.message });

export const adminOpsRouter = Router();
adminOpsRouter.use(requireAdmin);

/* ============================================================
   File upload
   ============================================================ */

/*
  POST /admin/materials/upload  (multipart, field name "file")

  Why this route exists: POST /admin/materials writes a material ROW but takes a
  storage_key it cannot create, and GET /files/* only hands out signed URLs for
  rows that already exist. Nothing in the API could actually put bytes into
  storage, so "admin uploads a file" was impossible end to end. This closes that
  gap: upload first, then register the returned storage_key with
  POST /admin/materials.

  Reading the file back needs no new route — /files/:scope/:id already grants
  staff access through its role check.
*/

function storage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;
  const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
    }),
    bucket: R2_BUCKET_NAME!,
  };
}

/* 200 MB is the ceiling: enough for a recorded session or a slide deck, small
   enough that a runaway upload cannot exhaust memory (files are buffered). */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
});

adminOpsRouter.post('/uploads', upload.single('file'), async (req, res) => {
  try {
    const store = storage();
    if (!store) {
      return res.status(503).json({ error: 'File storage is not configured yet (R2 credentials missing).' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });

    /* The original name is kept for display and sanitised for the object key,
       so a crafted filename cannot escape the prefix. */
    const original = req.file.originalname || 'file';
    const safe = original.replace(/[^\w.\-]+/g, '_').slice(-120);
    const key = `materials/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safe}`;

    await store.client.send(
      new PutObjectCommand({
        Bucket: store.bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || 'application/octet-stream',
      })
    );

    res.status(201).json({
      storage_key: key,
      title: original,
      mime: req.file.mimetype || 'application/octet-stream',
      size_bytes: req.file.size,
    });
  } catch (e: any) {
    fail(res, 'Could not store the file.', e);
  }
});

/* ============================================================
   Users — detail, moderation, manual enrollment
   ============================================================ */

/**
 * GET /admin/me — the signed-in admin.
 *
 * The console's identity block previously read `user.email` from a payload that
 * never carried it, so the header always showed a blank email. This returns the
 * real profile row for the authenticated admin.
 */
adminOpsRouter.get('/me', async (req, res) => {
  try {
    const rows = await q(
      `select id, email, full_name, role, avatar_url, is_active, email_verified, created_at
       from profiles where id = $1`,
      [adminId(req)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Admin profile not found.' });
    res.json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not load your profile.', e);
  }
});

/** GET /admin/users/:id — everything the learner side knows about this person. */
adminOpsRouter.get('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [profile] = await q(
      `select id, email, full_name, role, avatar_url, is_active, email_verified, created_at
       from profiles where id = $1`,
      [id]
    );
    if (!profile) return res.status(404).json({ error: 'User not found.' });

    const [courses, classrooms, transactions, bookings, requests, submissions] = await Promise.all([
      q(
        `select e.id as enrollment_id, e.created_at as enrolled_at, c.id, c.title, c.slug, c.cover_url
         from enrollments e join courses c on c.id = e.product_id
         where e.user_id = $1 and e.product_type = 'course' order by e.created_at desc`,
        [id]
      ),
      q(
        `select e.id as enrollment_id, e.created_at as enrolled_at, c.id, c.title, c.slug, c.schedule_text, c.starts_at
         from enrollments e join classrooms c on c.id = e.product_id
         where e.user_id = $1 and e.product_type = 'classroom' order by e.created_at desc`,
        [id]
      ),
      q(`select * from transactions where user_id = $1 order by created_at desc limit 50`, [id]).catch(() => []),
      q(`select * from bookings where user_id = $1 order by created_at desc limit 50`, [id]).catch(() => []),
      q(`select * from training_requests where user_id = $1 order by created_at desc limit 50`, [id]).catch(() => []),
      q(
        `select s.*, a.title as assignment_title from submissions s
         left join assignments a on a.id = s.assignment_id
         where s.user_id = $1 order by s.created_at desc limit 50`,
        [id]
      ).catch(() => []),
    ]);

    res.json({ profile, courses, classrooms, transactions, bookings, requests, submissions });
  } catch (e: any) {
    fail(res, 'Could not load this user.', e);
  }
});

/**
 * PATCH /admin/users/:id — activate/deactivate, change role, correct a name.
 * Guards against an admin locking themselves out of the console.
 */
adminOpsRouter.patch('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const self = adminId(req);
    const allowed = ['is_active', 'role', 'full_name'];
    const sets: string[] = [];
    const vals: any[] = [];

    for (const k of allowed) {
      if (req.body?.[k] === undefined) continue;
      if (k === 'role' && !['STUDENT', 'ADMIN', 'INSTRUCTOR'].includes(req.body[k])) {
        return res.status(400).json({ error: 'Role must be STUDENT, INSTRUCTOR or ADMIN.' });
      }
      if (id === self && k === 'is_active' && req.body[k] === false) {
        return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
      }
      if (id === self && k === 'role' && req.body[k] !== 'ADMIN') {
        return res.status(400).json({ error: 'You cannot remove your own admin role.' });
      }
      vals.push(req.body[k]);
      sets.push(`${k} = $${vals.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

    vals.push(id);
    const rows = await q(
      `update profiles set ${sets.join(', ')} where id = $${vals.length}
       returning id, email, full_name, role, is_active`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });

    if (req.body?.is_active === false) {
      /* A disabled account must not keep finding work through notifications. */
      await notify(rows[0].id, 'announcement', 'Your account was disabled', 'Contact support if you believe this is a mistake.');
    }
    res.json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not update this user.', e);
  }
});

/** POST /admin/users/:id/enrollments — grant manual access (comped seat, support fix). */
adminOpsRouter.post('/users/:id/enrollments', async (req, res) => {
  try {
    const { product_type, product_id } = req.body ?? {};
    if (!['course', 'classroom'].includes(product_type) || !product_id) {
      return res.status(400).json({ error: 'product_type (course|classroom) and product_id are required.' });
    }
    const table = product_type === 'course' ? 'courses' : 'classrooms';
    const found = await q(`select id, title from ${table} where id = $1`, [product_id]);
    if (!found[0]) return res.status(404).json({ error: 'That product does not exist.' });

    const rows = await q(
      `insert into enrollments(user_id, product_type, product_id) values ($1, $2, $3)
       on conflict (user_id, product_type, product_id) do nothing returning *`,
      [req.params.id, product_type, product_id]
    );
    if (!rows[0]) return res.json({ already_enrolled: true });
    await notify(
      req.params.id,
      'enrollment',
      `You now have access: ${found[0].title}`,
      `An instructor granted you access to ${product_type === 'course' ? 'this course' : 'this classroom'}.`
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not grant access.', e);
  }
});

/** DELETE /admin/users/:id/enrollments/:enrollmentId — revoke access. */
adminOpsRouter.delete('/users/:id/enrollments/:enrollmentId', async (req, res) => {
  try {
    const rows = await q(
      `delete from enrollments where id = $1 and user_id = $2 returning id`,
      [req.params.enrollmentId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Enrollment not found.' });
    res.json({ removed: true });
  } catch (e: any) {
    fail(res, 'Could not revoke access.', e);
  }
});

/* ============================================================
   Course content — sections, lessons, video, materials
   ============================================================ */

/** GET /admin/courses/:id — the course with its full section/lesson tree. */
adminOpsRouter.get('/courses/:id', async (req, res) => {
  try {
    const [course] = await q(`select * from courses where id = $1`, [req.params.id]);
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const sections = await q(
      `select s.id, s.title, s.position,
              (select coalesce(json_agg(json_build_object(
                  'id', l.id, 'title', l.title, 'position', l.position,
                  'duration_sec', l.duration_sec, 'video_key', l.video_key,
                  'is_free_preview', l.is_free_preview) order by l.position), '[]'::json)
               from lessons l where l.section_id = s.id) as lessons
       from course_sections s where s.course_id = $1 order by s.position, s.created_at`,
      [req.params.id]
    );
    const materials = await q(
      `select m.* from course_materials m
       join lessons l on l.id = m.lesson_id
       join course_sections s on s.id = l.section_id
       where s.course_id = $1 order by m.created_at`,
      [req.params.id]
    ).catch(() => []);
    const enrolled = await q(
      `select count(*)::int as n from enrollments where product_type = 'course' and product_id = $1`,
      [req.params.id]
    );
    res.json({ ...course, sections, materials, enrolled: enrolled[0]?.n ?? 0 });
  } catch (e: any) {
    fail(res, 'Could not load this course.', e);
  }
});

adminOpsRouter.post('/courses/:id/sections', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Section title is required.' });
    const next = await q(
      `select coalesce(max(position), -1) + 1 as p from course_sections where course_id = $1`,
      [req.params.id]
    );
    const rows = await q(
      `insert into course_sections(course_id, title, position) values ($1, $2, $3) returning *`,
      [req.params.id, title, req.body?.position ?? next[0].p]
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not add the section.', e);
  }
});

adminOpsRouter.post('/sections/:id/lessons', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Lesson title is required.' });
    const next = await q(
      `select coalesce(max(position), -1) + 1 as p from lessons where section_id = $1`,
      [req.params.id]
    );
    const rows = await q(
      `insert into lessons(section_id, title, position, video_key, duration_sec, is_free_preview)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [
        req.params.id,
        title,
        req.body?.position ?? next[0].p,
        req.body?.video_key ?? null,
        Number(req.body?.duration_sec ?? 0) || 0,
        Boolean(req.body?.is_free_preview),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not add the lesson.', e);
  }
});

/** PATCH /admin/lessons/:id — attach or replace the lesson video, retitle, reorder. */
adminOpsRouter.patch('/lessons/:id', async (req, res) => {
  try {
    const allowed = ['title', 'video_key', 'duration_sec', 'is_free_preview', 'position'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) {
      if (req.body?.[k] === undefined) continue;
      vals.push(k === 'duration_sec' ? Number(req.body[k]) || 0 : req.body[k]);
      sets.push(`${k} = $${vals.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(req.params.id);
    const rows = await q(`update lessons set ${sets.join(', ')} where id = $${vals.length} returning *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Lesson not found.' });
    res.json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not update the lesson.', e);
  }
});

/** DELETE /admin/materials/:scope/:id — remove a file record (classroom|course). */
adminOpsRouter.delete('/materials/:scope/:id', async (req, res) => {
  try {
    const table =
      req.params.scope === 'classroom'
        ? 'classroom_materials'
        : req.params.scope === 'course'
          ? 'course_materials'
          : '';
    if (!table) return res.status(400).json({ error: 'Scope must be classroom or course.' });
    const rows = await q(`delete from ${table} where id = $1 returning id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Material not found.' });
    res.json({ removed: true });
  } catch (e: any) {
    fail(res, 'Could not remove the file.', e);
  }
});

/* ============================================================
   Classroom management — detail, membership, chat
   ============================================================ */

/** GET /admin/classrooms/:id — one room, with everything it owns. */
adminOpsRouter.get('/classrooms/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [classroom] = await q(
      `select c.*, (select count(*)::int from enrollments e
                    where e.product_type = 'classroom' and e.product_id = c.id) as enrolled
       from classrooms c where c.id = $1`,
      [id]
    );
    if (!classroom) return res.status(404).json({ error: 'Classroom not found.' });

    const [members, sessions, materials, announcements, assignments] = await Promise.all([
      q(
        `select e.id as enrollment_id, e.created_at as enrolled_at,
                p.id, p.full_name, p.email, p.role, p.is_active, p.avatar_url
         from enrollments e join profiles p on p.id = e.user_id
         where e.product_type = 'classroom' and e.product_id = $1
         order by e.created_at`,
        [id]
      ),
      q(
        `select * from classroom_sessions where classroom_id = $1
         order by coalesce(starts_at, created_at) desc limit 100`,
        [id]
      ),
      q(`select * from classroom_materials where classroom_id = $1 order by created_at desc`, [id]),
      q(`select * from announcements where classroom_id = $1 order by created_at desc limit 50`, [id]),
      q(
        `select a.*, (select count(*)::int from submissions s where s.assignment_id = a.id) as submissions
         from assignments a where a.classroom_id = $1 order by a.created_at desc`,
        [id]
      ),
    ]);

    res.json({ classroom, members, sessions, materials, announcements, assignments });
  } catch (e: any) {
    fail(res, 'Could not load this classroom.', e);
  }
});

/** DELETE /admin/classrooms/:id/members/:userId — remove a learner from the room. */
adminOpsRouter.delete('/classrooms/:id/members/:userId', async (req, res) => {
  try {
    const rows = await q(
      `delete from enrollments
       where product_type = 'classroom' and product_id = $1 and user_id = $2
       returning id`,
      [req.params.id, req.params.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'That learner is not in this classroom.' });
    res.json({ removed: true });
  } catch (e: any) {
    fail(res, 'Could not remove the member.', e);
  }
});

/** POST /admin/classrooms/:id/members { email } — add an existing account to the room. */
adminOpsRouter.post('/classrooms/:id/members', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Enter the email of a registered learner.' });
    const [user] = await q(`select id, full_name, email from profiles where email = $1`, [email]);
    if (!user) return res.status(404).json({ error: 'No account with that email. Ask them to register first.' });

    const rows = await q(
      `insert into enrollments(user_id, product_type, product_id) values ($1, 'classroom', $2)
       on conflict (user_id, product_type, product_id) do nothing returning *`,
      [user.id, req.params.id]
    );
    if (!rows[0]) return res.json({ already_enrolled: true, member: user });

    const [c] = await q(`select title from classrooms where id = $1`, [req.params.id]);
    await notify(user.id, 'enrollment', `You were added to ${c?.title ?? 'a classroom'}`,
      'An instructor added you to this classroom. Open it to see the timetable and materials.');
    res.status(201).json({ member: user, enrollment: rows[0] });
  } catch (e: any) {
    fail(res, 'Could not add the member.', e);
  }
});

/** GET /admin/classrooms/:id/messages — the room's discussion, same rich shape
 *  learners see (replies, issue/solved flags, attachments, seen counts) so the
 *  manage screen can render the thread without a second code path. */
adminOpsRouter.get('/classrooms/:id/messages', async (req, res) => {
  try {
    const rows = await q(
      `select m.id, m.body, m.created_at, m.sender_id, m.parent_id, m.is_issue, m.is_solved,
              m.attachment_key, m.attachment_name, m.attachment_kind,
              p.full_name as sender_name, p.email as sender_email, p.role as sender_role,
              pm.body as parent_body, pp.full_name as parent_sender,
              (select count(*)::int from classroom_reads cr
                join enrollments e2 on e2.user_id = cr.user_id
                 and e2.product_type = 'classroom' and e2.product_id = m.classroom_id
               where cr.classroom_id = m.classroom_id
                 and cr.user_id != m.sender_id
                 and cr.last_read_at >= m.created_at) as seen_count
         from classroom_messages m
         left join profiles p on p.id = m.sender_id
         left join classroom_messages pm on pm.id = m.parent_id
         left join profiles pp on pp.id = pm.sender_id
        where m.classroom_id = $1 order by m.created_at asc limit 200`,
      [req.params.id]
    );
    res.json(rows.map((r: any) => {
      const { attachment_key, attachment_name, attachment_kind, ...rest } = r;
      return {
        ...rest,
        attachment: attachment_key
          ? { key: attachment_key, name: attachment_name ?? 'file', kind: attachment_kind ?? 'file', url: `/files/classroom-message/${r.id}` }
          : null,
      };
    }));
  } catch (e: any) {
    fail(res, 'Could not load the classroom discussion.', e);
  }
});

/**
 * POST /admin/classrooms/:id/messages { body, parent_id?, is_issue?, attachment?, notify? }
 * Writes into the same thread learners read in their Discuss tab (threaded,
 * with attachments, exactly like a member's post). Notifications are opt-in
 * here (a chat message is not an announcement) — use POST /admin/announcements
 * to broadcast.
 */
adminOpsRouter.post('/classrooms/:id/messages', async (req, res) => {
  try {
    const body = String(req.body?.body ?? '').trim();
    const att = req.body?.attachment;
    if (!body && !att?.key) return res.status(400).json({ error: 'Message is empty.' });
    const [room] = await q(`select id, title from classrooms where id = $1`, [req.params.id]);
    if (!room) return res.status(404).json({ error: 'Classroom not found.' });

    const rows = await q(
      `insert into classroom_messages(classroom_id, sender_id, body, parent_id, is_issue, attachment_key, attachment_name, attachment_kind)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [req.params.id, adminId(req), body, req.body?.parent_id ?? null, Boolean(req.body?.is_issue),
       att?.key ?? null, att?.name ?? null, att?.kind ?? null]
    );

    emit(`classroom:${req.params.id}`, 'classroom-message', { classroom_id: req.params.id, message: rows[0] });
    emit('admin', 'classroom-message', { classroom_id: req.params.id, message: rows[0] });

    let notified = 0;
    if (req.body?.notify) {
      const members = await q(
        `select user_id from enrollments where product_type = 'classroom' and product_id = $1`,
        [req.params.id]
      );
      for (const m of members) {
        await notify(m.user_id, 'announcement', `Message in ${room.title}`, body.slice(0, 140));
        notified++;
      }
    }
    res.status(201).json({ ...rows[0], notified });
  } catch (e: any) {
    fail(res, 'Could not send the message.', e);
  }
});

/**
 * PATCH /admin/classrooms/:id/messages/:mid { is_solved } — the instructor
 * closes a learner-reported issue in the Discuss tab.
 */
adminOpsRouter.patch('/classrooms/:id/messages/:mid', async (req, res) => {
  try {
    if (req.body?.is_solved === undefined) {
      return res.status(400).json({ error: 'is_solved is required.' });
    }
    const rows = await q(
      `update classroom_messages set is_solved = $1
        where id = $2 and classroom_id = $3 and is_issue = true
        returning *`,
      [Boolean(req.body.is_solved), req.params.mid, req.params.id]
    );
    if (!rows[0]) {
      const [anyRow] = await q('select id from classroom_messages where id = $1 and classroom_id = $2',
        [req.params.mid, req.params.id]);
      if (!anyRow) return res.status(404).json({ error: 'Message not found.' });
      return res.status(400).json({ error: 'Only issue messages can be marked solved.' });
    }
    emit(`classroom:${req.params.id}`, 'classroom-message', { classroom_id: req.params.id, message: rows[0] });
    emit('admin', 'classroom-message', { classroom_id: req.params.id, message: rows[0] });
    res.json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not update the message.', e);
  }
});

/* ============================================================
   Live control — host a session, record, see who attended
   ============================================================ */

/** GET /admin/live/overview — everything the control room needs to pick a session. */
adminOpsRouter.get('/live/overview', async (req, res) => {
  try {
    const sessions = await q(
      `select s.id, s.title, s.starts_at, s.ends_at, s.status, s.recording_status, s.livekit_room,
              s.classroom_id, c.title as classroom_title, c.slug as classroom_slug,
              (select count(*)::int from enrollments e
               where e.product_type = 'classroom' and e.product_id = s.classroom_id) as members,
              (select count(*)::int from attendance a where a.session_id = s.id) as attended
       from classroom_sessions s left join classrooms c on c.id = s.classroom_id
       order by (s.status = 'live') desc, coalesce(s.starts_at, s.created_at) desc
       limit 100`
    );
    /* Classrooms with no session yet are still startable — the API creates the
       session on demand, so surface them as an explicit choice. */
    const classrooms = await q(
      `select c.id, c.title, c.livekit_room, c.is_published,
              (select count(*)::int from enrollments e
               where e.product_type = 'classroom' and e.product_id = c.id) as members
       from classrooms c order by c.created_at desc`
    );
    res.json({ sessions, classrooms });
  } catch (e: any) {
    fail(res, 'Could not load live sessions.', e);
  }
});

/** PATCH /admin/sessions/:id/recording { recording_status } */
adminOpsRouter.patch('/sessions/:id/recording', async (req, res) => {
  try {
    const allowed = ['none', 'recording', 'processing', 'ready', 'failed'];
    const status = String(req.body?.recording_status ?? '');
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `recording_status must be one of: ${allowed.join(', ')}.` });
    }
    const rows = await q(
      `update classroom_sessions set recording_status = $1 where id = $2
       returning id, status, recording_status`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Session not found.' });
    res.json(rows[0]);
  } catch (e: any) {
    fail(res, 'Could not update the recording state.', e);
  }
});

/** GET /admin/sessions/:id/attendance — who actually joined, from the attendance table. */
adminOpsRouter.get('/sessions/:id/attendance', async (req, res) => {
  try {
    const rows = await q(
      `select a.joined_at, p.id as user_id, p.full_name, p.email
       from attendance a left join profiles p on p.id = a.user_id
       where a.session_id = $1 order by a.joined_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e: any) {
    fail(res, 'Could not load attendance.', e);
  }
});

/* ============================================================
   Destructive operations — guarded, never silent
   ============================================================ */

/**
 * A course or classroom with learners attached is not deleted by accident.
 * Without ?force=true the API answers 409 and reports how many enrollments
 * would be orphaned, so the console can ask the admin to confirm.
 */
adminOpsRouter.delete('/courses/:id', async (req, res) => {
  try {
    const n = await q(
      `select count(*)::int as n from enrollments where product_type = 'course' and product_id = $1`,
      [req.params.id]
    );
    const count = n[0]?.n ?? 0;
    if (count > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        error: `This course has ${count} enrolled learner${count === 1 ? '' : 's'}. Deleting it removes their access.`,
        enrollments: count,
      });
    }
    await pool.query(`delete from enrollments where product_type = 'course' and product_id = $1`, [req.params.id]);
    const rows = await q(`delete from courses where id = $1 returning id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Course not found.' });
    res.json({ removed: true, orphaned_enrollments: count });
  } catch (e: any) {
    fail(res, 'Could not delete the course.', e);
  }
});

adminOpsRouter.delete('/classrooms/:id', async (req, res) => {
  try {
    const n = await q(
      `select count(*)::int as n from enrollments where product_type = 'classroom' and product_id = $1`,
      [req.params.id]
    );
    const count = n[0]?.n ?? 0;
    if (count > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        error: `This classroom has ${count} enrolled learner${count === 1 ? '' : 's'}. Deleting it removes their access.`,
        enrollments: count,
      });
    }
    await pool.query(`delete from enrollments where product_type = 'classroom' and product_id = $1`, [req.params.id]);
    const rows = await q(`delete from classrooms where id = $1 returning id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Classroom not found.' });
    res.json({ removed: true, orphaned_enrollments: count });
  } catch (e: any) {
    fail(res, 'Could not delete the classroom.', e);
  }
});

adminOpsRouter.delete('/sessions/:id', async (req, res) => {
  try {
    const rows = await q(`delete from classroom_sessions where id = $1 returning id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Session not found.' });
    res.json({ removed: true });
  } catch (e: any) {
    fail(res, 'Could not delete the session.', e);
  }
});

adminOpsRouter.delete('/sections/:id', async (req, res) => {
  try {
    const rows = await q(`delete from course_sections where id = $1 returning id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Section not found.' });
    res.json({ removed: true });
  } catch (e: any) {
    fail(res, 'Could not delete the section.', e);
  }
});

adminOpsRouter.delete('/lessons/:id', async (req, res) => {
  try {
    const rows = await q(`delete from lessons where id = $1 returning id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lesson not found.' });
    res.json({ removed: true });
  } catch (e: any) {
    fail(res, 'Could not delete the lesson.', e);
  }
});
