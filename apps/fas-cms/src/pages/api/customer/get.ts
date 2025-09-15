// src/pages/api/customer/get.ts (Astro APIRoute)
import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization'
};

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const POST: APIRoute = async ({ request }) => {
  try {
    const projectId =
      (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
      (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined) ||
      (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined);

    const dataset =
      (import.meta.env.SANITY_DATASET as string | undefined) ||
      (import.meta.env.VITE_SANITY_DATASET as string | undefined) ||
      (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined);

    const token =
      (import.meta.env.SANITY_READ_TOKEN as string | undefined) ||
      (import.meta.env.SANITY_TOKEN as string | undefined) ||
      (import.meta.env.VITE_SANITY_TOKEN as string | undefined) ||
      (import.meta.env.VITE_SANITY_API_TOKEN as string | undefined);

    const apiVersion = (import.meta.env.SANITY_API_VERSION as string | undefined) || '2024-10-01';

    if (!projectId || !dataset) {
      return new Response(
        JSON.stringify({
          error: 'Server misconfigured: missing SANITY_PROJECT_ID or SANITY_DATASET'
        }),
        { status: 500, headers: { ...cors, 'content-type': 'application/json' } }
      );
    }

    const { email } = (await request.json().catch(() => ({}))) as { email?: string };
    const emailLc = (email || '').toString().trim().toLowerCase();
    if (!emailLc) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400,
        headers: { ...cors, 'content-type': 'application/json' }
      });
    }

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

    return new Response(JSON.stringify(customer || null), {
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
