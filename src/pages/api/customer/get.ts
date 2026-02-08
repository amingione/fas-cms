// src/pages/api/customer/get.ts (Astro APIRoute)
import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { customerGetSchema } from '@/lib/validators/api-requests';
import { sanityCustomerSchema } from '@/lib/validators/sanity';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization'
};

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const POST: APIRoute = async ({ request }) => {
  try {
    const projectId =
      process.env.SANITY_PROJECT_ID ||
      (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined);

    const dataset =
      process.env.SANITY_DATASET ||
      (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined);

    const token =
      process.env.SANITY_API_TOKEN ||
      (import.meta.env.PUBLIC_SANITY_API_TOKEN as string | undefined);

    const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01';

    if (!projectId || !dataset) {
      return new Response(
        JSON.stringify({
          error: 'Server misconfigured: missing SANITY_PROJECT_ID or SANITY_DATASET'
        }),
        { status: 500, headers: { ...cors, 'content-type': 'application/json' } }
      );
    }

    const rawBody = (await request.json().catch(() => ({}))) as { email?: string };
    const bodyResult = customerGetSchema.safeParse(rawBody);
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'customerGetSchema',
        context: 'api/customer/get',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422, headers: { ...cors, 'content-type': 'application/json' } }
      );
    }
    const emailLc = (bodyResult.data.email || '').toString().trim().toLowerCase();

    const client = createClient({
      projectId,
      dataset,
      apiVersion,
      token, // optional for public datasets; required if private
      useCdn: false
    });

    const customer = await client.fetch(`*[_type == "customer" && email == $email][0]`, {
      email: emailLc
    });

    const customerResult = sanityCustomerSchema.safeParse(customer);
    if (!customerResult.success) {
      console.warn('[sanity-validation]', {
        _id: (customer as any)?._id,
        _type: 'customer',
        errors: customerResult.error.format()
      });
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { ...cors, 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(customerResult.data || null), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (err: any) {
    console.error('customer/get error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
