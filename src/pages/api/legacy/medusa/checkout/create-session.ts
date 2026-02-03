/**
 * ⚠️ LEGACY: Medusa Checkout Session endpoint (HARD DISABLED)
 *
 * STATUS: PERMANENTLY DISABLED - Returns 410 Gone
 *
 * REASON FOR DISABLING:
 * This endpoint creates Stripe Checkout Sessions instead of using Medusa's
 * native payment flow. It violates the Medusa-first architecture by:
 * 1. Bypassing Medusa's payment provider system
 * 2. Creating Stripe line items directly (not from Medusa cart)
 * 3. Mixing Stripe Checkout UI with Medusa cart state
 *
 * REPLACEMENT:
 * Use the new PaymentIntent flow:
 * - POST /api/medusa/payments/create-intent
 * - Medusa manages cart state and calculates totals
 * - Stripe is payment processor only via Medusa's payment provider
 *
 * See: docs/checkout/FRONTEND_IMPLEMENTATION.md
 * See: PHASE1_PAYMENTINTENT_IMPLEMENTATION.md
 */

import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error: 'This endpoint has been permanently disabled.',
      reason: 'Legacy Medusa Checkout Sessions violate Medusa-first payment architecture.',
      replacement: 'Use POST /api/medusa/payments/create-intent',
      documentation: '/docs/checkout/FRONTEND_IMPLEMENTATION.md'
    }),
    {
      status: 410, // Gone
      headers: {
        'Content-Type': 'application/json',
        'X-Deprecated': 'true',
        'X-Replacement-Endpoint': '/api/medusa/payments/create-intent'
      }
    }
  );
};

export const GET = POST;
