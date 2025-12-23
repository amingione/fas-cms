import { createClient } from '@sanity/client';
import type { APIRoute } from 'astro';

const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET!,
  token: import.meta.env.SANITY_API_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderId, utmParams, sessionId } = await request.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), { status: 400 });
    }

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
