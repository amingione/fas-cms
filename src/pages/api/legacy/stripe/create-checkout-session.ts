/**
 * ⚠️ LEGACY: Hosted Stripe Checkout session endpoint (HARD DISABLED)
 *
 * STATUS: PERMANENTLY DISABLED - Returns 410 Gone
 * 
 * REASON FOR DISABLING:
 * This endpoint violates the Medusa-first pricing authority model by:
 * 1. Creating Stripe prices from Sanity CMS data (not Medusa /store/products)
 * 2. Using getActivePrice() from saleHelpers which pulls Sanity pricing
 * 3. Allowing cart items with undefined/0 prices to create checkout sessions
 * 4. Bypassing Medusa cart totals, shipping, and tax calculations
 *
 * REPLACEMENT:
 * Use the new PaymentIntent flow:
 * - POST /api/medusa/payments/create-intent
 * - Medusa calculates all pricing, tax, shipping
 * - Stripe is payment processor only (no line items, no pricing authority)
 *
 * See: docs/checkout/FRONTEND_IMPLEMENTATION.md
 * See: PHASE1_PAYMENTINTENT_IMPLEMENTATION.md
 */

import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error: 'This endpoint has been permanently disabled.',
      reason: 'Legacy Stripe Checkout Sessions violate Medusa-first pricing authority.',
      replacement: 'Use POST /api/medusa/payments/create-intent with Medusa cart totals.',
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
