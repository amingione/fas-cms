import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { issueOrderConfirmationToken } from '@/server/order-confirmation-tokens';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

/**
 * Generate an order confirmation access token
 *
 * POST /api/orders/generate-confirmation-token
 * Body: { paymentIntentId: string, clientSecret: string }
 *
 * This endpoint generates a short-lived JWT token that grants access to
 * PII data on the order confirmation endpoint. The token is required to
 * prevent data exposure via URL leakage.
 *
 * Requires proof of possession: the caller must supply the Stripe
 * PaymentIntent `client_secret`. The server verifies it against the Stripe
 * API before issuing a token, ensuring only the party who initiated the
 * payment can mint an access token — even if the payment intent ID leaks.
 *
 * Returns:
 *   { token: string } on success
 *   400 if paymentIntentId or clientSecret is missing / invalid format
 *   401 if clientSecret does not match the payment intent (proof of possession failed)
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

  // Proof-of-possession: verify the supplied client_secret matches the
  // payment intent on Stripe's side. This prevents token minting by anyone
  // who only has the payment intent ID (e.g. from a leaked URL).
  const stripeSecret =
    process.env.STRIPE_SECRET_KEY || (import.meta as any).env?.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error('[generate-confirmation-token] STRIPE_SECRET_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const stripe = new Stripe(stripeSecret, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
    });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.client_secret !== clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid client secret (proof of possession failed)' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const token = issueOrderConfirmationToken(paymentIntentId);

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
