import { createClient } from '@sanity/client';
import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { formSubmissionSchema } from '@/lib/validators/api-requests';

const json = (data: any, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    ...init
  });

async function parseBody(request: Request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    try {
      const fd = await request.formData();
      const result: Record<string, any> = {};
      fd.forEach((value, key) => {
        result[key] = typeof value === 'string' ? value : value?.name || '';
      });
      return result;
    } catch {
      return {};
    }
  }
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normaliseFields(raw: any): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const fields: Record<string, string> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'string') {
      fields[key] = value;
    } else if (Array.isArray(value)) {
      fields[key] = value.map((entry) => String(entry ?? '')).filter(Boolean).join(', ');
    } else {
      fields[key] = String(value ?? '');
    }
  });
  return fields;
}

type MarketingOptInMeta = {
  source?: string;
  tags?: string[];
};

let cachedSanityClient: ReturnType<typeof createClient> | null | undefined;

function getSanityClient() {
  if (cachedSanityClient !== undefined) {
    return cachedSanityClient;
  }

  const ime = (typeof import.meta !== 'undefined' ? (import.meta as any).env : {}) as Record<string, string | undefined>;
  const penv = (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string | undefined>;

  const projectId =
    ime.PUBLIC_SANITY_PROJECT_ID ||
    ime.SANITY_PROJECT_ID ||
    ime.SANITY_STUDIO_PROJECT_ID ||
    ime.VITE_SANITY_PROJECT_ID ||
    penv.PUBLIC_SANITY_PROJECT_ID ||
    penv.SANITY_PROJECT_ID ||
    penv.SANITY_STUDIO_PROJECT_ID ||
    penv.VITE_SANITY_PROJECT_ID;

  const dataset =
    ime.PUBLIC_SANITY_DATASET ||
    ime.SANITY_DATASET ||
    ime.SANITY_STUDIO_DATASET ||
    ime.VITE_SANITY_DATASET ||
    penv.PUBLIC_SANITY_DATASET ||
    penv.SANITY_DATASET ||
    penv.SANITY_STUDIO_DATASET ||
    penv.VITE_SANITY_DATASET ||
    'production';

  const apiVersion = ime.SANITY_API_VERSION || penv.SANITY_API_VERSION || '2024-01-01';

  const token =
    ime.SANITY_API_TOKEN ||
    ime.SANITY_WRITE_TOKEN ||
    ime.SANITY_API_READ_TOKEN ||
    ime.SANITY_READ_TOKEN ||
    ime.VITE_SANITY_API_TOKEN ||
    ime.VITE_SANITY_WRITE_TOKEN ||
    penv.SANITY_API_TOKEN ||
    penv.SANITY_WRITE_TOKEN ||
    penv.SANITY_API_READ_TOKEN ||
    penv.SANITY_READ_TOKEN ||
    penv.VITE_SANITY_API_TOKEN ||
    penv.VITE_SANITY_WRITE_TOKEN;

  if (projectId && dataset && apiVersion && token) {
    cachedSanityClient = createClient({
      projectId,
      dataset,
      apiVersion,
      token,
      useCdn: false
    });
  } else {
    console.warn(
      'Marketing opt-in tracking skipped: missing Sanity configuration. Ensure SANITY_* or PUBLIC_SANITY_* env vars (projectId/dataset/apiVersion/token) are set.'
    );
    cachedSanityClient = null;
  }

  return cachedSanityClient;
}

function parseMarketingOptIn(raw: unknown): MarketingOptInMeta | null {
  if (!raw || typeof raw !== 'object') return null;

  const source =
    'source' in raw && typeof (raw as Record<string, unknown>).source === 'string'
      ? (raw as Record<string, string>).source.trim()
      : undefined;

  const tags =
    'tags' in raw && Array.isArray((raw as Record<string, unknown>).tags)
      ? (raw as { tags: unknown[] }).tags
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean)
      : undefined;

  if (!source && !(tags && tags.length)) {
    return null;
  }

  return {
    ...(source ? { source } : {}),
    ...(tags && tags.length ? { tags } : {})
  };
}

async function recordMarketingOptIn(
  formName: string,
  fields: Record<string, string>,
  meta: MarketingOptInMeta
) {
  const email = fields.email?.trim();
  if (!email) {
    return;
  }

  const client = getSanityClient();
  if (!client) {
    return;
  }

  const name = fields.name?.trim() || undefined;
  const source = meta.source || fields.source?.trim() || undefined;
  const pageUrl = fields.pageUrl?.trim() || undefined;

  const excluded = new Set(['email', 'name', 'source', 'pageUrl']);
  const submittedFields = Object.entries(fields)
    .filter(([key, value]) => !excluded.has(key) && typeof value === 'string' && value.trim())
    .map(([key, value]) => {
      const trimmed = value.trim();
      return {
        _type: 'field',
        key,
        value: trimmed
      };
    });

  try {
    await client.create({
      _type: 'marketingOptIn',
      formName,
      email,
      name,
      source,
      pageUrl,
      tags: meta.tags && meta.tags.length ? meta.tags : undefined,
      submittedAt: new Date().toISOString(),
      fields: submittedFields
    });
  } catch (error) {
    console.error('Failed to persist marketing opt-in to Sanity:', error);
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = formSubmissionSchema.safeParse(await parseBody(request));
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'formSubmissionSchema',
        context: 'api/form-submission',
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
    const formName = String(body.formName || body.form || body.name || 'Website Form').trim();
    const rawFields = body.fields && typeof body.fields === 'object' ? body.fields : body;
    const fields = normaliseFields(rawFields);
    const replyEmail = typeof fields.email === 'string' ? fields.email.trim() : '';
    const marketingOptIn = parseMarketingOptIn(body.marketingOptIn);

    if (!Object.keys(fields).length) {
      return json({ message: 'No form fields provided.' }, { status: 400 });
    }

    const rows = Object.entries(fields)
      .filter(([key]) => key !== 'formName' && key !== 'fields')
      .map(
        ([key, value]) =>
          `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;font-weight:600;text-transform:capitalize;">${escapeHtml(
            key
          )}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;">${escapeHtml(
            value
          )}</td></tr>`
      )
      .join('');

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;font-size:14px;">
        <h2 style="margin-bottom:12px;">${escapeHtml(formName)} Submission</h2>
        <table style="border-collapse:collapse;width:100%;max-width:640px;">${rows}</table>
      </div>
    `;

    if (!import.meta.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set; skipping email send.');
    } else {
      const resend = new Resend(import.meta.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'FAS Motorsports <no-reply@fasmotorsports.io>',
        to: ['sales@fasmotorsports.com'],
        replyTo: replyEmail ? [replyEmail] : undefined,
        subject: `${formName} Submission`,
        html
      });
    }

    if (marketingOptIn) {
      await recordMarketingOptIn(formName, fields, marketingOptIn);
    }

    return json({ ok: true, message: 'Submission received.' }, { status: 200 });
  } catch (error) {
    console.error('form-submission error:', error);
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
