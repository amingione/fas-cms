import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const DEFAULT_FROM =
  process.env.RESEND_FROM || 'F.A.S. Motorsports <noreply@updates.fasmotorsports.com>';
const DEFAULT_SUBJECT = 'Welcome to F.A.S. Motorsports — Where Real Builds Begin';
const PREVIEW_TEXT = 'Early access to new parts, pre-orders, and member-only pricing.';
const CTA_URL = 'https://www.fasmotorsports.com/shop';

const buildHtml = (name?: string) => `
  <div style="display:none;visibility:hidden;opacity:0;height:0;width:0;font-size:0;line-height:0;color:transparent;">
    ${PREVIEW_TEXT}
  </div>
  <h2 style="margin:0 0 16px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">Welcome to F.A.S. Motorsports</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    You’re in${name ? `, ${name}` : ''}.
  </p>
  <p style="margin:0 0 16px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    Thanks for subscribing to F.A.S. Motorsports. Around here, we keep things simple—high-quality parts, transparent performance data, and engineering that speaks for itself. Whether you’re building a modern muscle platform, a boosted street setup, or a truck that works harder than it should, you’ll get updates that actually matter.
  </p>
  <p style="margin:0 0 12px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">Here’s what you’ll get from us:</p>
  <ul style="margin:0 0 16px 20px;padding:0;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <li>Early access to new releases and limited pre-order runs</li>
    <li>Member-only pricing on select products</li>
    <li>Platform-specific insights for modern Hemi, Ford, GM, and performance truck builds</li>
    <li>Updates on tuning solutions, hardware improvements, and real testing outcomes</li>
  </ul>
  <p style="margin:0 0 16px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    Everything we develop is built for reliability, repeatability, and results you can feel—not just numbers on a page.
  </p>
  <p style="margin:0 0 20px;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    Appreciate you being here.
  </p>
  <a href="${CTA_URL}"
     style="display:inline-block;padding:12px 18px;background:#e02020;color:#fff;border-radius:6px;font-weight:bold;text-decoration:none;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    Shop F.A.S. Motorsports
  </a>
  <p style="margin:20px 0 0;font-size:15px;line-height:22px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">— F.A.S. Motorsports</p>
`;

const buildText = (name?: string) =>
  [
    PREVIEW_TEXT,
    '',
    'Welcome to F.A.S. Motorsports',
    `You’re in${name ? `, ${name}` : ''}.`,
    '',
    'Thanks for subscribing to F.A.S. Motorsports. Around here, we keep things simple—high-quality parts, transparent performance data, and engineering that speaks for itself. Whether you’re building a modern muscle platform, a boosted street setup, or a truck that works harder than it should, you’ll get updates that actually matter.',
    '',
    'Here’s what you’ll get from us:',
    '- Early access to new releases and limited pre-order runs',
    '- Member-only pricing on select products',
    '- Platform-specific insights for modern Hemi, Ford, GM, and performance truck builds',
    '- Updates on tuning solutions, hardware improvements, and real testing outcomes',
    '',
    'Everything we develop is built for reliability, repeatability, and results you can feel—not just numbers on a page.',
    'Appreciate you being here.',
    '',
    `Shop F.A.S. Motorsports: ${CTA_URL}`,
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

type DirectPayload = {
  email?: string;
  name?: string;
  source?: string;
};

const getDocumentFromPayload = (body: SanityWebhookBody) => {
  if (!body) return null;
  if (Array.isArray(body.items) && body.items.length) return body.items[0];
  if (body.item) return body.item;
  if (body.document) return body.document;
  if (body.payload?.document) return body.payload.document;
  if (body.body && typeof body.body === 'object' && !Array.isArray(body.body)) return body.body;
  return body;
};

const extractDirectPayload = (body: any): DirectPayload | null => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { email, name, source } = body as DirectPayload;
  if (typeof email !== 'string') return null;
  return {
    email: email.trim(),
    name: typeof name === 'string' ? name.trim() : undefined,
    source: typeof source === 'string' ? source.trim() : undefined
  };
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

    // Path 1: direct POST from modal with { email, name, source }
    const direct = extractDirectPayload(payload);
    if (direct && direct.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        await resend.emails.send({
          from: DEFAULT_FROM,
          to: direct.email,
          subject: DEFAULT_SUBJECT,
          html: buildHtml(direct.name),
          text: buildText(direct.name)
        });
        return {
          statusCode: 200,
          body: JSON.stringify({ ok: true, handled: 'direct', source: direct.source || 'popup_modal' })
        };
      } catch (err) {
        console.error('[welcome-subscriber] resend failed (direct)', err);
        return {
          statusCode: 200,
          body: JSON.stringify({ ok: true, handled: 'direct', source: direct.source || 'popup_modal', skipped: 'resend-error' })
        };
      }
    }

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

    try {
      await resend.emails.send({
        from: DEFAULT_FROM,
        to: email,
        subject: DEFAULT_SUBJECT,
        html: buildHtml(name),
        text: buildText(name)
      });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      console.error('[welcome-subscriber] resend failed (document)', err);
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'resend-error' }) };
    }
  } catch (error) {
    console.error('[welcome-subscriber] error', error);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Internal error' }) };
  }
};
