import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { jsonResponse } from '@/server/http/responses';
import { wheelQuoteUpdateSchema } from '@/lib/validators/api-requests';

const sanity = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204 });

export const PATCH: APIRoute = async ({ request }) => {
  try {
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
