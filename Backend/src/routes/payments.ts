import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;
const FW = 'https://api.flutterwave.com/v3';
const fwConfigured = () => Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

async function product(table: 'classrooms' | 'courses', id: string) {
  const rows = await q(`select id, title, price_kobo, currency from ${table} where id = $1`, [id]);
  return rows[0] ?? null;
}

async function grantAccess(userId: string, productType: string, productId: string, txId: string) {
  await pool.query(
    `insert into enrollments(user_id, product_type, product_id) values ($1, $2, $3) on conflict do nothing`,
    [userId, productType, productId]);
  const titles: Record<string, string> = { classroom: 'classrooms', course: 'courses' };
  const table = titles[productType];
  let name = productType;
  if (table) {
    const rows = await q(`select title from ${table} where id = $1`, [productId]).catch(() => []);
    if (rows[0]) name = rows[0].title;
  }
  await pool.query(
    `insert into notifications(user_id, type, title, body) values ($1, 'enrollment', $2, $3)`,
    [userId, `Enrolled: ${name}`, `Payment confirmed (ref ${txId}). Your content is unlocked.`]).catch(() => {});
}

export const paymentsRouter = Router();

// POST /payments/checkout — validate, price from DB, pending tx, Flutterwave link when configured.
paymentsRouter.post('/checkout', requireUser, async (req, res) => {
  try {
    const me = (req as any).user.id;
    const { product_type, product_id } = req.body ?? {};
    if (!['classroom', 'course'].includes(product_type) || !product_id) {
      return res.status(400).json({ error: 'Invalid product.' });
    }
    const table = product_type === 'classroom' ? 'classrooms' : 'courses';
    const p = await product(table, product_id);
    if (!p) return res.status(404).json({ error: 'Product not found.' });

    const enr = await q(`select id from enrollments where user_id = $1 and product_type = $2 and product_id = $3`,
      [me, product_type, product_id]);
    if (enr[0]) return res.json({ already_enrolled: true });

    if (p.price_kobo === 0) {
      await grantAccess(me, product_type, product_id, 'free');
      return res.json({ enrolled: true });
    }

    const txRef = `fx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const tx = await q(
      `insert into transactions(user_id, amount_kobo, currency, product_type, product_id, flutterwave_ref, status)
       values ($1, $2, $3, $4, $5, $6, 'pending') returning *`,
      [me, p.price_kobo, p.currency, product_type, product_id, txRef]);

    if (!fwConfigured()) {
      return res.status(201).json({
        transaction: tx[0], checkout_url: null, configured: false,
        message: 'Secure checkout activates once payment keys are configured. Your reservation is recorded.',
      });
    }

    const prof = await q('select email, full_name from profiles where id = $1', [me]);
    const init = await fetch(`${FW}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: p.price_kobo / 100,
        currency: p.currency,
        redirect_url: `${APP_URL}/payments/callback?tx=${tx[0].id}`,
        customer: { email: prof[0]?.email ?? (req as any).user.email ?? '', name: prof[0]?.full_name ?? 'FerixCourse learner' },
        customizations: { title: 'FerixCourse', description: p.title },
      }),
    });
    const initBody: any = await init.json().catch(() => ({}));
    if (!init.ok || !initBody?.data?.link) {
      return res.status(502).json({ error: 'Payment provider did not start checkout. Try again.', transaction: tx[0] });
    }
    res.status(201).json({ transaction: tx[0], checkout_url: initBody.data.link, configured: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not start checkout.', detail: e?.message });
  }
});

// GET /payments/status/:id — poll after returning from checkout.
paymentsRouter.get('/status/:id', requireUser, async (req, res) => {
  try {
    const rows = await q('select * from transactions where id = $1 and user_id = $2', [req.params.id, (req as any).user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Transaction not found.' });
    const t = rows[0];
    const enr = t.status === 'successful'
      ? await q(`select id from enrollments where user_id = $1 and product_type = $2 and product_id = $3`,
        [t.user_id, t.product_type, t.product_id])
      : [];
    res.json({ transaction: t, enrolled: enr.length > 0 });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load status.' });
  }
});

// POST /payments/flutterwave-webhook — NEVER trust the payload alone; re-verify server-side.
paymentsRouter.post('/flutterwave-webhook', async (req, res) => {
  try {
    const hash = process.env.FLUTTERWAVE_WEBHOOK_HASH ?? '';
    if (hash && req.headers['verif-hash'] !== hash) {
      return res.status(401).json({ error: 'Bad webhook signature.' });
    }
    const data = req.body?.data ?? {};
    const flwId = data.id;
    const txRef = data.tx_ref ?? data.txRef;
    if (!flwId || !txRef) return res.status(400).json({ error: 'Malformed webhook.' });

    // Idempotency: already successful → ack.
    const existing = await q(`select * from transactions where flutterwave_ref = $1`, [txRef]);
    if (existing[0]?.status === 'successful') return res.json({ ok: true, deduped: true });

    const verify = await fetch(`${FW}/transactions/${flwId}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY ?? ''}` },
    });
    const v: any = await verify.json().catch(() => ({}));
    const d = v?.data ?? {};
    const ok = verify.ok && d.status === 'successful' && d.tx_ref === txRef;

    if (!existing[0]) return res.status(404).json({ error: 'Unknown transaction.' });
    const t = existing[0];

    // Amount/currency must match what we charged.
    const amountOk = Math.round(Number(d.amount) * 100) === t.amount_kobo && d.currency === t.currency;
    if (ok && amountOk) {
      await pool.query(`update transactions set status = 'successful', completed_at = now() where id = $1`, [t.id]);
      await grantAccess(t.user_id, t.product_type, t.product_id, t.flutterwave_ref ?? t.id);
      return res.json({ ok: true });
    }
    await pool.query(`update transactions set status = 'failed', completed_at = now() where id = $1`, [t.id]);
    await pool.query(`insert into notifications(user_id, type, title, body) values ($1, 'payment_failed', $2, $3)`,
      [t.user_id, 'Payment failed', `Your payment of ${t.amount_kobo / 100} ${t.currency} did not complete.`]).catch(() => {});
    return res.json({ ok: true, failed: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Webhook error.' });
  }
});
