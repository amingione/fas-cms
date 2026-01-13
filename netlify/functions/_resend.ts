import fetch from 'node-fetch';
import { safeJsonParse } from '../../src/lib/resend';

const KEY = process.env.RESEND_API_KEY!;
const FROM = process.env.RESEND_FROM || 'noreply@example.com';

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`${res.status} ${bodyText}`);
  return safeJsonParse(bodyText);
}
