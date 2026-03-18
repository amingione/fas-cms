import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

/**
 * Storefront proxy endpoint.
 *
 * Architecture rule: Stripe PaymentIntent creation is Medusa-owned.
 * This route forwards the request to Medusa and returns Medusa's payload.
 */
export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse(
      { error: 'Medusa backend not configured.' },
      { status: 503 },
      { noIndex: true }
    );
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const cartId = typeof body?.cartId === 'string' ? body.cartId.trim() : '';
  if (!cartId) {
    return jsonResponse({ error: 'Missing cartId.' }, { status: 400 }, { noIndex: true });
  }

  try {
    const medusaResponse = await medusaFetch('/store/payment-intents', {
      method: 'POST',
      body: JSON.stringify({
        cartId,
        ...(body?.shippoRate && typeof body.shippoRate === 'object'
          ? { shippoRate: body.shippoRate }
          : {})
      })
    });

    const payload = await readJsonSafe<any>(medusaResponse);
    if (!medusaResponse.ok) {
      return jsonResponse(
        {
          error: payload?.error || payload?.message || 'Failed to create payment intent.',
          details: payload
        },
        { status: medusaResponse.status },
        { noIndex: true }
      );
    }

    // Compatibility fallback while env rollout converges.
    // Checkout requires this field to initialize Stripe Elements.
    if (
      (!payload || typeof payload !== 'object' || !String(payload.publishable_key || '').trim()) &&
      typeof process !== 'undefined'
    ) {
      const fallbackPublishable =
        process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        process.env.STRIPE_PUBLISHABLE_KEY ||
        '';
      if (fallbackPublishable.trim()) {
        payload.publishable_key = fallbackPublishable.trim();
      }
    }

    return jsonResponse(payload || {}, { status: 200 }, { noIndex: true });
  } catch (error: any) {
    return jsonResponse(
      { error: error?.message || 'Failed to create payment intent.' },
      { status: 500 },
      { noIndex: true }
    );
  }
};
