import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const DEFAULT_FROM = process.env.RESEND_FROM || 'F.A.S. Motorsports <noreply@updates.fasmotorsports.com>';
const DEFAULT_SUBJECT = 'Welcome to F.A.S. Motorsports — Your Build Starts Here';
const CTA_URL = 'https://www.fasmotorsports.com/shop';

const buildHtml = (name?: string) => `
  <h2 style="margin:0 0 16px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">Welcome to F.A.S. Motorsports</h2>
  <p style="margin:0 0 12px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    Thanks for joining the F.A.S. family${name ? `, ${name}` : ''}!
  </p>
  <p style="margin:0 0 12px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    You’ll receive:
  </p>
  <ul style="margin:0 0 12px 20px;padding:0;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <li>Exclusive deals & early product drops</li>
    <li>Performance insights and tuning updates</li>
    <li>Build guides & horsepower planning tools</li>
    <li>VIP access to events and giveaways</li>
  </ul>
  <p style="margin:0 0 20px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    We’re excited to have you here.
  </p>
  <a href="${CTA_URL}"
     style="display:inline-block;padding:12px 18px;background:#e02020;color:#fff;border-radius:6px;font-weight:bold;text-decoration:none;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    Shop F.A.S. Motorsports
  </a>
  <p style="margin:20px 0 0;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">— F.A.S. Motorsports</p>
`;

const buildText = (name?: string) =>
  [
    'Welcome to F.A.S. Motorsports',
    `Thanks for joining the F.A.S. family${name ? `, ${name}` : ''}!`,
    '',
    'You’ll receive:',
    '- Exclusive deals & early product drops',
    '- Performance insights and tuning updates',
    '- Build guides & horsepower planning tools',
    '- VIP access to events and giveaways',
    '',
    `Start browsing: ${CTA_URL}`,
    '',
    '— F.A.S. Motorsports'
  ].join('\n');

type SanityWebhookBody = {
  items?: any[];
  item?: any;
  document?: any;
  body?: any;
  payload?: any;
} | null;

const getDocumentFromPayload = (body: SanityWebhookBody) => {
  if (!body) return null;
  if (Array.isArray(body.items) && body.items.length) return body.items[0];
  if (body.item) return body.item;
  if (body.document) return body.document;
  if (body.payload?.document) return body.payload.document;
  if (body.body && typeof body.body === 'object' && !Array.isArray(body.body)) return body.body;
  return body;
};

export const handler: Handler = async (event) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[welcome-subscriber] RESEND_API_KEY missing; skipping send');
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, skipped: 'missing-resend-api-key' })
      };
    }

    const payload = event.body ? (JSON.parse(event.body) as SanityWebhookBody) : null;
    const doc = getDocumentFromPayload(payload);

    if (!doc) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No document received' }) };
    }

    if (doc._type !== 'marketingOptIn') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'non-subscriber-doc' }) };
    }

    const email = typeof doc.email === 'string' ? doc.email.trim() : '';
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email on document' }) };
    }

    const name = typeof doc.name === 'string' ? doc.name.trim() : undefined;

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: DEFAULT_SUBJECT,
      html: buildHtml(name),
      text: buildText(name)
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error('[welcome-subscriber] error', error);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Internal error' }) };
  }
};
