import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/requireUser.js';
import { env } from '../config/env.js';

const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;

export const paymentsRouter = Router();

// POST /payments/checkout — step 1 of the real flow: validate product, price from DB,
// create pending transaction. Step 2 (Flutterwave redirect) activates when keys are set.
paymentsRouter.post('/checkout', requireUser, async (req, res) => {
  try {
    const { product_type, product_id } = req.body ?? {};
    if (!['classroom', 'course'].includes(product_type) || !product_id) {
      return res.status(400).json({ error: 'Invalid product.' });
    }
    const table = product_type === 'classroom' ? 'classrooms' : 'courses';
    const rows = await q(`select id, title, price_kobo, currency from ${table} where id = $1`, [product_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });

    // Already enrolled? Send them in, don't charge twice.
    const enr = await q(`select id from enrollments where user_id = $1 and product_type = $2 and product_id = $3`,
      [(req as any).user.id, product_type, product_id]);
    if (enr[0]) return res.json({ already_enrolled: true });

    // Free product? Enroll immediately, no payment needed.
    if (rows[0].price_kobo === 0) {
      await pool.query(`insert into enrollments(user_id, product_type, product_id) values ($1, $2, $3) on conflict do nothing`,
        [(req as any).user.id, product_type, product_id]);
      return res.json({ enrolled: true });
    }

    const tx = await q(
      `insert into transactions(user_id, amount_kobo, currency, product_type, product_id, status)
       values ($1, $2, $3, $4, $5, 'pending') returning *`,
      [(req as any).user.id, rows[0].price_kobo, rows[0].currency, product_type, product_id]);

    const configured = Boolean(env.FLUTTERWAVE_SECRET_KEY);
    res.status(201).json({
      transaction: tx[0],
      checkout_url: null, // Phase 2: Flutterwave inline checkout link when keys are configured
      configured,
      message: configured
        ? 'Complete payment in the checkout window.'
        : 'Secure checkout activates once payment keys are configured. Your reservation is recorded.',
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not start checkout.', detail: e?.message });
  }
});
