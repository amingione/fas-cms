import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { jsonResponse } from '@/server/http/responses';
import { wheelQuoteUpdateSchema } from '@/lib/validators/api-requests';
import { requireSanityApiToken } from '@/server/sanity-token';

let cachedSanityClient: ReturnType<typeof createClient> | null = null;
let sanityClientPromise: Promise<ReturnType<typeof createClient>> | null = null;

async function getSanityClient() {
  if (cachedSanityClient) return cachedSanityClient;
  if (sanityClientPromise) return sanityClientPromise;
  sanityClientPromise = (async () => {
    const token = await requireSanityApiToken('api/wheel-quote-update');
    cachedSanityClient = createClient({
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET,
      apiVersion: '2024-01-01',
      token,
      useCdn: false
    });
    return cachedSanityClient;
  })();
  try {
    return await sanityClientPromise;
  } finally {
    sanityClientPromise = null;
  }
}

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204 });

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const sanity = await getSanityClient();
    const payloadResult = wheelQuoteUpdateSchema.safeParse(await request.json());
    if (!payloadResult.success) {
      console.error('[validation-failure]', {
        schema: 'wheelQuoteUpdateSchema',
        context: 'api/wheel-quote-update',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: payloadResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: payloadResult.error.format() },
        { status: 422 }
      );
    }
    const { id, status } = payloadResult.data;

    // Update Sanity document
    const result = await sanity.patch(id).set({ status }).commit({ autoGenerateArrayKeys: true });

    return jsonResponse({ ok: true, id: result._id, status: result.status });
  } catch (err: any) {
    const message = err?.message || 'Invalid request';
    return jsonResponse({ error: message }, { status: 400 });
  }
};

// (Optional) allow POST as well, for clients that cannot send PATCH
export const POST: APIRoute = PATCH;
