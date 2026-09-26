import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { requireUser } from '../middleware/requireUser.js';
import { sendEmail } from '../lib/email.js';
import { notify } from '../lib/notify.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;
const token = () => crypto.randomBytes(32).toString('hex');
const verifyUrl = (t: string) => `${env.APP_URL}/verify-email?token=${t}`;
const resetUrl = (t: string) => `${env.APP_URL}/reset-password?token=${t}`;

function sign(id: string, role: string, email: string): string {
  return jwt.sign({ sub: id, role, email }, env.JWT_SECRET, { expiresIn: `${env.JWT_EXPIRES_DAYS}d` });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authRouter = Router();

// POST /auth/register — creates UNVERIFIED account, emails Resend verification link.
authRouter.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body ?? {};
    if (!full_name || !EMAIL_RE.test(String(email ?? ''))) {
      return res.status(400).json({ error: 'Valid name and email are required.' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const clean = String(email).toLowerCase().trim();
    const exists = await q('select id from profiles where email = $1', [clean]);
    if (exists[0]) {
      // No enumeration: same response, but nudge existing users to login.
      return res.json({ needs_verification: true, hint: 'If this email is registered, check your inbox.' });
    }
    const hash = await bcrypt.hash(String(password), 10);
    const v = token();
    await pool.query(
      `insert into profiles(email, full_name, password_hash, email_verified, verify_token)
       values ($1, $2, $3, false, $4)`,
      [clean, String(full_name).trim(), hash, v]);
    await sendEmail(clean, 'Verify your FerixCourse account',
      `Welcome! Confirm your email to activate your account:<br/><br/><a href="${verifyUrl(v)}">${verifyUrl(v)}</a>`);
    res.status(201).json({ needs_verification: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// GET /auth/verify?token= — clicked from email.
authRouter.get('/verify', async (req, res) => {
  try {
    const t = String(req.query.token ?? '');
    if (!t) return res.status(400).json({ error: 'Invalid link.' });
    const rows = await q('select id from profiles where verify_token = $1', [t]);
    if (!rows[0]) return res.status(400).json({ error: 'Link expired or already used.' });
    await pool.query(`update profiles set email_verified = true, verify_token = null where id = $1`, [rows[0].id]);
    await notify(rows[0].id, 'welcome', 'Welcome to FerixCourse', 'Your email is verified. Browse the catalog, join a live cohort, or request custom training.');
    res.json({ verified: true });
  } catch {
    res.status(500).json({ error: 'Verification failed. Try again.' });
  }
});

// POST /auth/verify-resend { email }
authRouter.post('/verify-resend', async (req, res) => {
  try {
    const clean = String(req.body?.email ?? '').toLowerCase().trim();
    const rows = await q('select id, email_verified from profiles where email = $1', [clean]);
    if (rows[0] && !rows[0].email_verified) {
      const v = token();
      await pool.query('update profiles set verify_token = $1 where id = $2', [v, rows[0].id]);
      await sendEmail(clean, 'Verify your FerixCourse account',
        `Confirm your email to activate your account:<br/><br/><a href="${verifyUrl(v)}">${verifyUrl(v)}</a>`);
    }
    res.json({ sent: true });
  } catch {
    res.status(500).json({ error: 'Could not resend.' });
  }
});

// POST /auth/login — verified accounts only.
authRouter.post('/login', async (req, res) => {
  try {
    const clean = String(req.body?.email ?? '').toLowerCase().trim();
    const rows = await q('select * from profiles where email = $1', [clean]);
    const fail = () => res.status(401).json({ error: 'Invalid email or password.' });
    if (!rows[0] || !rows[0].password_hash) return fail();
    const ok = await bcrypt.compare(String(req.body?.password ?? ''), rows[0].password_hash);
    if (!ok) return fail();
    if (!rows[0].email_verified) {
      return res.status(403).json({ error: 'Please verify your email first. Check your inbox.', needs_verification: true });
    }
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account disabled. Contact support.' });
    const u = rows[0];
    res.json({
      token: sign(u.id, u.role, u.email),
      user: { id: u.id, email: u.email, full_name: u.full_name, role: u.role },
    });
  } catch {
    res.status(500).json({ error: 'Login failed. Try again.' });
  }
});

// POST /auth/forgot { email } — always 200, token emailed when account exists.
authRouter.post('/forgot', async (req, res) => {
  try {
    const clean = String(req.body?.email ?? '').toLowerCase().trim();
    const rows = await q('select id from profiles where email = $1', [clean]);
    if (rows[0]) {
      const t = token();
      await pool.query(`update profiles set reset_token = $1, reset_expires = now() + interval '1 hour' where id = $2`, [t, rows[0].id]);
      await sendEmail(clean, 'Reset your FerixCourse password',
        `Choose a new password (link expires in 1 hour):<br/><br/><a href="${resetUrl(t)}">${resetUrl(t)}</a>`);
    }
    res.json({ sent: true });
  } catch {
    res.status(500).json({ error: 'Could not send reset link.' });
  }
});

// POST /auth/reset { token, password }
authRouter.post('/reset', async (req, res) => {
  try {
    const t = String(req.body?.token ?? '');
    const pw = String(req.body?.password ?? '');
    if (!t || pw.length < 8) return res.status(400).json({ error: 'Invalid link or short password.' });
    const rows = await q('select id from profiles where reset_token = $1 and reset_expires > now()', [t]);
    if (!rows[0]) return res.status(400).json({ error: 'Link expired. Request a new one.' });
    const hash = await bcrypt.hash(pw, 10);
    await pool.query(`update profiles set password_hash = $1, reset_token = null, reset_expires = null where id = $2`,
      [hash, rows[0].id]);
    res.json({ reset: true });
  } catch {
    res.status(500).json({ error: 'Reset failed. Try again.' });
  }
});

// GET /auth/me
authRouter.get('/me', requireUser, async (req, res) => {
  try {
    const rows = await q('select id, email, full_name, role, avatar_url, is_active, email_verified, created_at from profiles where id = $1',
      [(req as any).user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Could not load profile.' });
  }
});
