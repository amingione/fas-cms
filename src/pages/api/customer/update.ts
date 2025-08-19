import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';

const toCustomerId = (sub?: string) =>
  sub ? `customer.${sub.replace(/[^a-zA-Z0-9_.-]/g, '_')}` : undefined;
const normEmail = (e?: string) => (e ? String(e).trim().toLowerCase() : '');

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    // Resolve env vars for server (support SANITY_*, VITE_*, PUBLIC_*)
    const projectId = (import.meta.env.SANITY_PROJECT_ID ||
      import.meta.env.VITE_SANITY_PROJECT_ID ||
      import.meta.env.PUBLIC_SANITY_PROJECT_ID) as string | undefined;
    const dataset = (import.meta.env.SANITY_DATASET ||
      import.meta.env.VITE_SANITY_DATASET ||
      import.meta.env.PUBLIC_SANITY_DATASET) as string | undefined;
    const token = (import.meta.env.SANITY_WRITE_TOKEN ||
      import.meta.env.SANITY_API_TOKEN ||
      import.meta.env.VITE_SANITY_WRITE_TOKEN ||
      import.meta.env.VITE_SANITY_API_TOKEN) as string | undefined;
    const apiVersion = (import.meta.env.SANITY_API_VERSION as string | undefined) || '2024-10-01';

    if (!projectId || !dataset) {
      return new Response('Server misconfigured: missing SANITY_PROJECT_ID or SANITY_DATASET', {
        status: 500,
        headers: { 'access-control-allow-origin': '*' }
      });
    }

    const sanity = createClient({ projectId, dataset, token, apiVersion, useCdn: false });

    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'Missing Sanity write token (SANITY_WRITE_TOKEN / SANITY_API_TOKEN)'
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
        }
      );
    }

    const body = await request.json();

    const {
      sub, // Auth0 user id (e.g., auth0|abc123)
      email,
      phone,
      address,
      billingAddress,
      firstName,
      lastName,
      emailOptIn,
      textOptIn,
      marketingOptIn
    } = body || {};

    // Basic input normalization
    const authId = typeof sub === 'string' ? sub : '';
    const emailLc = normEmail(email);

    if (!authId && !emailLc) {
      return new Response('Missing sub or email', { status: 400 });
    }

    // Prefer matching by authId first, then by email (normalized)
    const existing = await sanity.fetch(
      `*[_type=="customer" && ((defined(authId) && authId==$authId) || (!defined(authId) && email==$email))][0]`,
      { authId, email: emailLc }
    );

    // Build the doc fields we allow to be written
    const baseDoc: any = {
      _type: 'customer',
      authId: authId || existing?.authId || '',
      email: emailLc || existing?.email || '',
      phone: phone ?? existing?.phone ?? '',
      address: address ?? existing?.address ?? '',
      billingAddress: billingAddress ?? existing?.billingAddress ?? {},
      firstName: firstName ?? existing?.firstName ?? '',
      lastName: lastName ?? existing?.lastName ?? '',
      emailOptIn: !!(emailOptIn ?? existing?.emailOptIn ?? false),
      textOptIn: !!(textOptIn ?? existing?.textOptIn ?? false),
      marketingOptIn: !!(marketingOptIn ?? existing?.marketingOptIn ?? false),
      updatedAt: new Date().toISOString()
    };

    let saved;
    try {
      if (existing?._id) {
        saved = await sanity.patch(existing._id).set(baseDoc).commit();
      } else {
        const _id = toCustomerId(authId) || undefined; // only deterministic if we have sub
        saved = await sanity.create({ _id, ...baseDoc });
      }
    } catch (err: any) {
      const msg = err?.response?.body?.error?.description || err?.message || 'Sanity write failed';
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    return new Response(JSON.stringify({ ok: true, id: saved._id }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  } catch (e: any) {
    const msg = e?.response?.body?.error?.description || e?.message || 'Server error';
    console.error('customer/update failed:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
};
