import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createClient } from '@sanity/client';

// Optional simple auth for server-to-server calls from your dashboard
// Set FAS_DASH_API_KEY in Netlify. If present, requests must include header: Authorization: Bearer <key>
const API_KEY = import.meta.env.FAS_DASH_API_KEY;

const sanity = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET,
  apiVersion: '2025-09-10',
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

const BodySchema = z.object({
  id: z.string().min(3),
  status: z.enum(['new', 'contacted', 'quoted', 'won', 'lost'])
});

function unauthorized(msg = 'Unauthorized') {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204 });

export const PATCH: APIRoute = async ({ request }) => {
  try {
    if (API_KEY) {
      const auth = request.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (token !== API_KEY) return unauthorized();
    }

    const payload = await request.json();
    const { id, status } = BodySchema.parse(payload);

    // Update Sanity document
    const result = await sanity.patch(id).set({ status }).commit({ autoGenerateArrayKeys: true });

    return new Response(JSON.stringify({ ok: true, id: result._id, status: result.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    const message = err?.message || 'Invalid request';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// (Optional) allow POST as well, for clients that cannot send PATCH
export const POST: APIRoute = PATCH;
