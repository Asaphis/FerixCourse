import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

async function isMember(userId: string, classroomId: string): Promise<boolean> {
  const enr = await q(`select id from enrollments where user_id = $1 and product_type = 'classroom' and product_id = $2`,
    [userId, classroomId]);
  if (enr[0]) return true;
  const prof = await q(`select role from profiles where id = $1`, [userId]);
  return prof[0]?.role === 'ADMIN' || prof[0]?.role === 'INSTRUCTOR';
}

export const liveRouter = Router();

// POST /live/token { classroom_id } — membership-checked LiveKit token.
// One room per classroom; 1-on-1 bookings get private rooms (room = booking id).
liveRouter.post('/token', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const { classroom_id, booking_id } = req.body ?? {};
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
      return res.status(503).json({ error: 'Live classrooms are not configured yet.' });
    }
    let room = '';
    if (classroom_id) {
      const c = await q('select livekit_room from classrooms where id = $1', [classroom_id]);
      if (!c[0]) return res.status(404).json({ error: 'Classroom not found.' });
      if (!(await isMember(me, classroom_id))) {
        return res.status(403).json({ error: "You don't have access to this classroom." });
      }
      room = c[0].livekit_room;
    } else if (booking_id) {
      const b = await q(`select * from bookings where id = $1`, [booking_id]);
      if (!b[0]) return res.status(404).json({ error: 'Booking not found.' });
      const prof = await q(`select role from profiles where id = $1`, [me]);
      const staff = prof[0]?.role === 'ADMIN' || prof[0]?.role === 'INSTRUCTOR';
      if (b[0].user_id !== me && !staff) {
        return res.status(403).json({ error: "You don't have access to this session." });
      }
      if (b[0].status !== 'confirmed' && b[0].status !== 'paid' && !staff) {
        return res.status(403).json({ error: 'This session is not confirmed yet.' });
      }
      room = b[0].livekit_room || `booking-${booking_id.slice(0, 8)}`;
      if (!b[0].livekit_room) {
        await pool.query('update bookings set livekit_room = $1 where id = $2', [room, booking_id]);
      }
    } else {
      return res.status(400).json({ error: 'classroom_id or booking_id required.' });
    }

    const prof = await q('select full_name from profiles where id = $1', [me]);
    const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
      identity: me,
      name: prof[0]?.full_name ?? 'Learner',
    });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });
    res.json({ url: process.env.LIVEKIT_URL, token: await at.toJwt(), room });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not create live access.' });
  }
});
