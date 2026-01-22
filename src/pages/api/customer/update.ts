import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { customerUpdateSchema } from '@/lib/validators/api-requests';
import { sanityCustomerSchema } from '@/lib/validators/sanity';

const toCustomerId = (sub?: string) =>
  sub ? `customer.${sub.replace(/[^a-zA-Z0-9_.-]/g, '_')}` : undefined;
const normEmail = (e?: string) => (e ? String(e).trim().toLowerCase() : '');

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization'
    }
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const authToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const requiredToken =
      (import.meta.env.CUSTOMER_UPDATE_API_TOKEN as string | undefined) ||
      (import.meta.env.FAS_CUSTOMER_UPDATE_API_TOKEN as string | undefined) ||
      process.env.CUSTOMER_UPDATE_API_TOKEN ||
      process.env.FAS_CUSTOMER_UPDATE_API_TOKEN ||
      '';

    if (!requiredToken) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: missing CUSTOMER_UPDATE_API_TOKEN' }),
        {
          status: 500,
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
        }
      );
    }

    if (!authToken || authToken !== requiredToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

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
    const apiVersion = (import.meta.env.SANITY_API_VERSION as string | undefined) || '2024-01-01';

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

    const bodyResult = customerUpdateSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'customerUpdateSchema',
        context: 'api/customer/update',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }
      );
    }

    const {
      sub,
      email,
      phone,
      address,
      billingAddress,
      firstName,
      lastName,
      emailOptIn,
      textOptIn,
      marketingOptIn
    } = bodyResult.data || {};

    // Basic input normalization
    const userId = typeof sub === 'string' ? sub : '';
    const emailLc = normEmail(email);

    if (!userId && !emailLc) {
      return new Response('Missing sub or email', { status: 400 });
    }

    // Prefer matching by userId first, then by email (normalized)
    let existing = await sanity.fetch(
      `*[_type=="customer" && ((defined(userId) && userId==$userId) || (!defined(userId) && email==$email))][0]`,
      { userId, email: emailLc }
    );
    if (existing) {
      const existingResult = sanityCustomerSchema.partial().safeParse(existing);
      if (!existingResult.success) {
        console.warn('[sanity-validation]', {
          _id: (existing as any)?._id,
          _type: 'customer',
          errors: existingResult.error.format()
        });
        existing = null;
      } else {
        existing = existingResult.data;
      }
    }

    // Build the doc fields we allow to be written
    const baseDoc: any = {
      _type: 'customer',
      userId: userId || existing?.userId || '',
      email: emailLc || existing?.email || '',
      phone: phone ?? existing?.phone ?? '',
      address: address ?? existing?.address ?? '',
      billingAddress: billingAddress ?? existing?.billingAddress ?? {},
      firstName: firstName ?? existing?.firstName ?? '',
      lastName: lastName ?? existing?.lastName ?? '',
      emailOptIn: !!(emailOptIn ?? existing?.emailOptIn ?? false),
      textOptIn: !!(textOptIn ?? existing?.textOptIn ?? false),
      marketingOptIn: !!(marketingOptIn ?? existing?.marketingOptIn ?? false)
    };

    let saved;
    try {
      if (existing?._id) {
        saved = await sanity.patch(existing._id).set(baseDoc).commit();
      } else {
        const _id = toCustomerId(userId) || undefined; // only deterministic if we have sub
        saved = await sanity.create({ _id, ...baseDoc });
      }
    } catch (err: any) {
      const msg = err?.response?.body?.error?.description || err?.message || 'Sanity write failed';
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    if (saved?._id && emailLc) {
      try {
        const vendor = await sanity.fetch(
          '*[_type == "vendor" && customerRef._ref == $customerId][0]{_id}',
          { customerId: saved._id }
        );
        if (vendor?._id) {
          await sanity.patch(vendor._id).set({ 'portalAccess.email': emailLc }).commit();
        }
      } catch (err) {
        console.warn('[customer/update] unable to sync vendor portal email', err);
      }
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
