import { createClient } from '@sanity/client';
import type { APIRoute } from 'astro';
import { attributionTrackSchema } from '@/lib/validators/api-requests';

const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET!,
  token: import.meta.env.SANITY_API_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = attributionTrackSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'attributionTrackSchema',
        context: 'api/attribution/track',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422 }
      );
    }
    const { orderId, utmParams, sessionId } = bodyResult.data;

    // Create attribution record (map snake_case to camelCase)
    const attribution = await sanityClient.create({
      _type: 'attribution',
      order: {
        _type: 'reference',
        _ref: orderId
      },
      sessionId: sessionId || null,
      utmSource: utmParams?.utm_source || null,
      utmMedium: utmParams?.utm_medium || null,
      utmCampaign: utmParams?.utm_campaign || null,
      utmTerm: utmParams?.utm_term || null,
      utmContent: utmParams?.utm_content || null,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Attribution tracked for order:', orderId);

    return new Response(JSON.stringify({ success: true, attribution }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Attribution tracking error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to track attribution',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
