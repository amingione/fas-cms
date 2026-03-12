import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@sanity/client';
import { customFabInquirySchema } from '@/lib/validators/api-requests';
import { requireSanityApiToken } from '@/server/sanity-token';
import { getSecret } from '@/server/aws-secrets';

const json = (data: any, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    ...init
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
  try { return await request.json(); } catch { return {}; }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = customFabInquirySchema.safeParse((await parseBody(request)) || {});
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'customFabInquirySchema',
        context: 'api/custom-fab-inquiry',
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

    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const description = String(body.description || '').trim();

    if (!name || !phone || !description) {
      return json({ message: 'Missing required fields' }, { status: 400 });
    }

    const sanityToken = await requireSanityApiToken('api/custom-fab-inquiry');
    const sanityClient = createClient({
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID!,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET!,
      token: sanityToken,
      apiVersion: '2024-01-01',
      useCdn: false
    });

    const resendApiKey = await getSecret('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is not set; skipping email send.');
      return json({ ok: true, message: 'Inquiry received (email not sent: missing RESEND_API_KEY).' }, { status: 200 });
    }
    const resend = new Resend(resendApiKey);
    const resendFrom =
      (import.meta.env.RESEND_FROM as string | undefined) || 'noreply@updates.fasmotorsports.com';
    const toAddress = 'sales@fasmotorsports.com';

    const safe = (v: any) => String(v ?? '').toString();
    const html = `
      <div>
        <h2>Custom Fabrication Inquiry</h2>
        <p><strong>Name:</strong> ${safe(name)}</p>
        <p><strong>Phone:</strong> ${safe(phone)}</p>
        ${email ? `<p><strong>Email:</strong> ${safe(email)}</p>` : ''}
        <p><strong>Description:</strong><br/>${safe(description).replace(/\n/g, '<br/>')}</p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: resendFrom,
        to: [toAddress],
        replyTo: email ? [email] : undefined,
        subject: `Custom Fab Inquiry from ${safe(name)}`,
        html
      });

      await sanityClient
        .create({
          _type: 'emailLog',
          to: email || phone,
          from: resendFrom,
          subject: 'Custom Fab Inquiry',
          status: 'sent',
          sentAt: new Date().toISOString(),
          emailType: 'custom_fab_inquiry',
          body: description
        })
        .catch((err) => console.error('Failed to log email:', err));

      return json({ ok: true, message: "Thanks! We'll be in touch shortly." }, { status: 200 });
    } catch (err) {
      console.error('custom-fab-inquiry send failed:', err);
      return json({ ok: false, message: 'Inquiry received, but email failed to send.' }, { status: 200 });
    }
  } catch (e) {
    console.error('custom-fab-inquiry POST failed:', e);
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
