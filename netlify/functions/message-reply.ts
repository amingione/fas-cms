import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { sendEmail } from './_resend';
import { sanity } from './_sanity';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const { _id, to, subject, html } = JSON.parse(event.body || '{}');
    if (!_id || !to || !subject || !html) return { statusCode: 400, body: 'Missing fields' };
    await sendEmail({ to, subject, html });
    // mark message as replied
    await sanity.patch(_id).set({ status: 'replied' }).commit();
    return { statusCode: 200, body: '{"ok":true}' };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Reply failed' };
  }
};
