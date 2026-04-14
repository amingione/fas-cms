import type { APIRoute } from 'astro';
import { medusaFetch } from '@/lib/medusa';

/**
 * Look up a Medusa order by Stripe PaymentIntent ID
 *
 * GET /api/orders/by-payment-intent?id=pi_xxx&token=xxx
 *
 * This storefront endpoint proxies the Medusa-owned endpoint.
 * Medusa remains the sole source of truth and security authority.
 *
 * Architecture: Medusa is the sole source of truth for order data.
 * All order details (total, email, shipping address) are sourced from Medusa,
 * never directly from Stripe.
 *
 * Security enforcement, proof verification, and rate limiting are handled in Medusa.
 */

export const GET: APIRoute = async ({ url }) => {
  const paymentIntentId = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  if (!paymentIntentId) {
    return new Response(
      JSON.stringify({ error: 'Missing "id" parameter (Stripe PaymentIntent ID)' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing "token" parameter (access token required)' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }

  try {
    const upstream = await medusaFetch(
      `/store/order-confirmation/by-payment-intent?id=${encodeURIComponent(paymentIntentId)}&token=${encodeURIComponent(token)}`,
      { method: 'GET' }
    );
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
    console.error('[by-payment-intent] Proxy request failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch order details' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
};
