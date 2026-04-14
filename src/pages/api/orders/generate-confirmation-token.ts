import type { APIRoute } from 'astro';
import { medusaFetch } from '@/lib/medusa';

/**
 * Generate an order confirmation access token
 *
 * POST /api/orders/generate-confirmation-token
 * Body: { paymentIntentId: string, clientSecret: string }
 *
 * This storefront endpoint is a Medusa proxy.
 * Medusa is the sole commerce authority and owns Stripe access.
 *
 * Returns:
 *   { token: string } on success
 *   400 if paymentIntentId or clientSecret is missing / invalid format
 *   401 if payment proof fails
 *   500 on server configuration error
 */

export const POST: APIRoute = async ({ request }) => {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const { paymentIntentId, clientSecret } = body;

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid "paymentIntentId" in request body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Validate payment intent ID format (should start with pi_)
  if (!paymentIntentId.startsWith('pi_')) {
    return new Response(
      JSON.stringify({ error: 'Invalid payment intent ID format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (!clientSecret || typeof clientSecret !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid "clientSecret" in request body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const upstream = await medusaFetch('/store/order-confirmation/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        payment_intent_client_secret: clientSecret
      })
    });

    const responseText = await upstream.text();
    return new Response(responseText, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        ...(upstream.headers.get('X-RateLimit-Remaining')
          ? { 'X-RateLimit-Remaining': upstream.headers.get('X-RateLimit-Remaining') as string }
          : {}),
        ...(upstream.headers.get('Retry-After')
          ? { 'Retry-After': upstream.headers.get('Retry-After') as string }
          : {})
      }
    });
  } catch (error) {
    console.error('[generate-confirmation-token] Proxy request failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate token' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
};
