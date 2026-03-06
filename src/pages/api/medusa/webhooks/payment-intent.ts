/**
 * ⛔ DEPRECATED — Returns 410 Gone
 *
 * This Stripe webhook proxy has been removed. Stripe must send webhooks to a SINGLE
 * canonical endpoint: https://api.fasmotorsports.com/webhooks/stripe  (fas-medusa).
 *
 * Having a second Stripe webhook endpoint on fasmotorsports.com means every
 * payment_intent.succeeded fires TWICE — once here and once in Medusa —
 * causing duplicate order creation attempts and split payment event graphs.
 *
 * STRIPE DASHBOARD ACTION REQUIRED:
 *   - Remove any Stripe webhook endpoint pointing to fasmotorsports.com/api/medusa/webhooks/*
 *   - Only api.fasmotorsports.com/webhooks/stripe should be registered in the Stripe dashboard
 *
 * All payment completion logic lives in fas-medusa/src/api/webhooks/stripe/route.ts.
 * All order completion logic (completeCartWorkflow) is invoked exclusively by Medusa.
 */
import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async () => {
  return jsonResponse(
    {
      error: 'This webhook endpoint is deprecated.',
      message: 'Stripe webhooks are now received exclusively by api.fasmotorsports.com/webhooks/stripe.',
      canonical_webhook: 'https://api.fasmotorsports.com/webhooks/stripe',
    },
    { status: 410 },
    { noIndex: true }
  );
};
