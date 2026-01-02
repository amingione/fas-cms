import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { netlifySubmissionSchema } from '../../src/lib/validators/api-requests';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const bodyResult = netlifySubmissionSchema.safeParse(body);
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'netlifySubmissionSchema',
        context: 'netlify/submission-created',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request', details: bodyResult.error.format() })
      };
    }
    const payload = bodyResult.data?.payload || bodyResult.data;
    const formName = String(payload?.form_name ?? payload?.formName ?? 'unknown-form');
    const data: Record<string, any> = payload?.data || payload || {};

    const to = process.env.NOTIFY_EMAIL || 'sales@fasmotorsports.com';
    const from = process.env.NOTIFY_FROM || 'no-reply@fasmotorsports.com';

    const subject = `New ${formName} submission`;
    const lines = Object.entries(data)
      .filter(([k]) => !['form-name', 'bot-field'].includes(k))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v ?? '')}`)
      .join('\n');

    if (!process.env.RESEND_API_KEY) {
      console.warn('[submission-created] RESEND_API_KEY missing; skipping email send');
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
    }

    await resend.emails.send({ to, from, subject, text: lines });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[submission-created] error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }
};
