import type { APIRoute } from 'astro';
import { getSecret } from '@/server/aws-secrets';

/**
 * Look up a Medusa order by Stripe PaymentIntent ID
 *
 * GET /api/orders/by-payment-intent?id=pi_xxx
 *
 * This endpoint is used by the order confirmation page to display the order number.
 * It polls Medusa admin API searching for an order with a payment session/intent matching the ID.
 *
 * No authentication required (the payment intent ID is secret enough and only known
 * to the customer who completed payment).
 *
 * Returns:
 *   { orderId: string, displayId: number } on success
 *   404 if order not found after retries
 *   400 if payment_intent parameter missing
 */

export const GET: APIRoute = async ({ url }) => {
  const paymentIntentId = url.searchParams.get('id');

  if (!paymentIntentId) {
    return new Response(
      JSON.stringify({ error: 'Missing "id" parameter (Stripe PaymentIntent ID)' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Get Medusa config
  const medusaBackendUrl =
    typeof process !== 'undefined' && process.env?.MEDUSA_BACKEND_URL
      ? process.env.MEDUSA_BACKEND_URL
      : (import.meta.env.MEDUSA_BACKEND_URL as string | undefined) || '';

  if (!medusaBackendUrl) {
    console.error('[by-payment-intent] MEDUSA_BACKEND_URL not configured');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let adminToken: string | undefined;
  try {
    adminToken = await getSecret('MEDUSA_ADMIN_API_TOKEN');
  } catch (err) {
    console.error('[by-payment-intent] Failed to get admin token:', err);
  }

  if (!adminToken) {
    console.error('[by-payment-intent] MEDUSA_ADMIN_API_TOKEN not configured');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Fetch orders from Medusa admin API
      // We fetch a small batch and filter client-side for the payment intent
      const response = await fetch(
        `${medusaBackendUrl}/admin/orders?limit=100&offset=0`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.warn(
          `[by-payment-intent] Attempt ${attempt}/${MAX_RETRIES}: Medusa admin API returned ${response.status}`
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
        continue;
      }

      const data = (await response.json()) as any;
      const orders = Array.isArray(data.orders) ? data.orders : [];

      // Search for order with matching payment intent in payment sessions or metadata
      for (const order of orders) {
        // Check payment sessions (Medusa's standard location)
        if (Array.isArray(order.payment_sessions)) {
          for (const session of order.payment_sessions) {
            if (
              session?.data?.id === paymentIntentId ||
              session?.data?.payment_intent_id === paymentIntentId ||
              session?.data?.payment_intent === paymentIntentId
            ) {
              return new Response(
                JSON.stringify({
                  orderId: order.id,
                  displayId: order.display_id
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
          }
        }

        // Also check metadata in case the PI ID was stored there
        if (order?.metadata && typeof order.metadata === 'object') {
          const meta = order.metadata as Record<string, any>;
          if (
            meta.stripe_payment_intent_id === paymentIntentId ||
            meta.payment_intent_id === paymentIntentId
          ) {
            return new Response(
              JSON.stringify({
                orderId: order.id,
                displayId: order.display_id
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        }
      }

      // Order not found in this batch; if we haven't retried yet, wait and try again
      if (attempt < MAX_RETRIES) {
        console.debug(
          `[by-payment-intent] Attempt ${attempt}/${MAX_RETRIES}: Order not found, retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    } catch (error) {
      console.error(`[by-payment-intent] Attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  // Order not found after all retries
  return new Response(JSON.stringify({ error: 'Order not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};
