import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { coursesRouter } from './routes/courses.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.use('/health', healthRouter);
  app.use('/courses', coursesRouter);

  // Phase 2+ modules mount here, one router per business function:
  // app.use('/courses', coursesRouter);
  // app.use('/classrooms', classroomsRouter);
  // app.use('/payments', paymentsRouter);
  // app.use('/flutterwave/webhook', flutterwaveWebhookRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
