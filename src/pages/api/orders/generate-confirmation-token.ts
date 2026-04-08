import type { APIRoute } from 'astro';
import { issueOrderConfirmationToken } from '@/server/order-confirmation-tokens';

/**
 * Generate an order confirmation access token
 *
 * POST /api/orders/generate-confirmation-token
 * Body: { paymentIntentId: string }
 *
 * This endpoint generates a short-lived JWT token that grants access to
 * PII data on the order confirmation endpoint. The token is required to
 * prevent data exposure via URL leakage.
 *
 * The token is issued client-side after payment succeeds and is included
 * in the confirmation page URL.
 *
 * Returns:
 *   { token: string } on success
 *   400 if paymentIntentId is missing
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

  const { paymentIntentId } = body;

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

  try {
    // Generate token with payment intent ID as orderId placeholder
    // The actual order ID is not yet known at this point (order is created async by webhook)
    const token = issueOrderConfirmationToken(paymentIntentId, paymentIntentId);

    return new Response(
      JSON.stringify({ token }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[generate-confirmation-token] Failed to generate token:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate token' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
