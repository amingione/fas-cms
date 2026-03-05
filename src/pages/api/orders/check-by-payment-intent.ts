import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { requireSanityApiToken } from '@/server/sanity-token';

/**
 * Check Order by Payment Intent ID
 *
 * Used by success page to poll for order completion.
 * Guards against race condition where user arrives before webhook completes.
 */

const SANITY_PROJECT_ID =
  process.env.SANITY_PROJECT_ID ||
  (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
  '';
const SANITY_DATASET =
  process.env.SANITY_DATASET ||
  (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
  '';
let cachedSanityClient: ReturnType<typeof createClient> | null = null;
let sanityClientPromise: Promise<ReturnType<typeof createClient>> | null = null;

async function getSanityClient() {
  if (cachedSanityClient) return cachedSanityClient;
  if (sanityClientPromise) return sanityClientPromise;
  sanityClientPromise = (async () => {
    const token = await requireSanityApiToken('api/orders/check-by-payment-intent');
    cachedSanityClient = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
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

export const GET: APIRoute = async ({ url }) => {
  const sanity = await getSanityClient();
  const paymentIntentId = url.searchParams.get('payment_intent_id');

  if (!paymentIntentId) {
    return new Response(
      JSON.stringify({ error: 'Missing payment_intent_id parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Query Sanity for order by payment intent ID
    const order = await sanity.fetch(
      '*[_type == "order" && stripePaymentIntentId == $paymentIntentId][0]',
      { paymentIntentId }
    );

    if (order) {
      return new Response(
        JSON.stringify({
          exists: true,
          order: {
            _id: order._id,
            orderNumber: order.orderNumber,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.fulfillmentStatus
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          exists: false,
          message: 'Order not yet created'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('[Check Order] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to check order',
        details: error?.message || String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
