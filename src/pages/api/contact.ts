import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@sanity/client';
import { contactRequestSchema } from '@/lib/validators/api-requests';

const json = (data: any, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    ...init
  });

const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET!,
  token: import.meta.env.SANITY_API_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false
});

async function parseBody(request: Request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await request.json(); } catch { return {}; }
  }
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    try {
      const fd = await request.formData();
      const obj: Record<string, any> = {};
      fd.forEach((v, k) => { obj[k] = typeof v === 'string' ? v : v?.name || ''; });
      return obj;
    } catch { return {}; }
  }
  // Fallback: try text as JSON
  try { return await request.json(); } catch { return {}; }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = contactRequestSchema.safeParse((await parseBody(request)) || {});
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'contactRequestSchema',
        context: 'api/contact',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return json(
        { message: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 }
      );
    }
    const body = bodyResult.data;

    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const name = String(body.name || `${firstName} ${lastName}` || '').trim();
    const email = String(body.email || '').trim();
    const vehicle = String(body.vehicle || '').trim();
    const topic = String(body.topic || '').trim().toLowerCase();
    const message = String(body.message || '').trim();

    if (!email || !message) {
      return json({ message: 'Missing required fields' }, { status: 400 });
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const toAddress = 'sales@fasmotorsports.com';

    const safe = (v: any) => String(v ?? '').toString();
    const html = `
      <div>
        <h2>New Website Contact</h2>
        ${name ? `<p><strong>Name:</strong> ${safe(name)}</p>` : ''}
        <p><strong>Email:</strong> ${safe(email)}</p>
        ${vehicle ? `<p><strong>Vehicle:</strong> ${safe(vehicle)}</p>` : ''}
        ${topic ? `<p><strong>Topic:</strong> ${safe(topic)}</p>` : ''}
        <p><strong>Message:</strong><br/>${safe(message).replace(/\n/g, '<br/>')}</p>
      </div>
    `;

    if (!import.meta.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set; skipping email send.');
      return json({ ok: true, message: 'Message received (email not sent: missing RESEND_API_KEY).' }, { status: 200 });
    }

    try {
      await resend.emails.send({
        from: 'FAS Motorsports <no-reply@fasmotorsports.io>',
        to: [toAddress],
        replyTo: email ? [email] : undefined,
        subject: name ? `Contact from ${name}` : 'New website contact',
        html
      });

      // Create email log
      await sanityClient
        .create({
          _type: 'emailLog',
          to: email,
          from: 'noreply@fasmotorsports.com',
          subject: 'Contact Form Submission',
          status: 'sent',
          sentAt: new Date().toISOString(),
          emailType: 'contact_form',
          body: message
        })
        .catch((err) => console.error('Failed to log email:', err));

      return json({ ok: true, message: 'Thanks! We\'ll get back to you shortly.' }, { status: 200 });
    } catch (err) {
      console.error('contact send failed:', err);
      return json({ ok: false, message: 'Received, but email failed to send.' }, { status: 200 });
    }
  } catch (e) {
    console.error('contact POST failed:', e);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
};

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
