import { Resend } from 'resend';

let client: Resend | null = null;
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY ?? '';
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const r = resend();
  if (!r || !to) throw new Error('Email not configured or missing recipient.');
  const res = await r.emails.send({
    from: process.env.EMAIL_FROM ?? 'no-reply@ferixcourse.com',
    to,
    subject: `[FerixCourse] ${subject}`,
    html: `<div style="font-family:sans-serif;max-width:560px"><h2>${subject}</h2><p>${body}</p><hr/><p style="color:#888;font-size:12px">FerixCourse — practical technology training</p></div>`,
  });
  if (res.error) throw new Error(`Resend error: ${res.error.message ?? 'unknown'}`);
}
