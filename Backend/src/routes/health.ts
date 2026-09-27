import { Router } from 'express';
import { checkDb } from '../config/db.js';

export const healthRouter = Router();
healthRouter.get('/', async (_req, res) => {
  const db = await checkDb();
  res.json({ ok: true, service: 'ferixcourse-backend', revision: process.env.RELEASE_ID ?? 'local', db });
});
