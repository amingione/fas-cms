import type { APIRoute } from 'astro';

/**
 * Deprecated endpoint: order completion is webhook-only.
 * Stripe webhooks delivered to Medusa are the single completion authority.
 */
export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error: 'This endpoint is disabled.',
      message: 'Order completion is handled exclusively by Stripe webhooks in Medusa.'
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
