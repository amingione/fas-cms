/**
 * Legacy compatibility webhook.
 *
 * Canonical endpoint remains: https://api.fasmotorsports.com/webhooks/stripe (fas-medusa).
 * This route forwards raw Stripe webhook payloads to Medusa to prevent lost orders
 * when legacy dashboard endpoints are still configured in Stripe.
 *
 * IMPORTANT: Keep Stripe dashboard pointed to the canonical Medusa endpoint.
 * This forwarder is a safety net, not the primary webhook destination.
 */
import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';

function resolveCanonicalWebhookUrl(): string {
  const explicit =
    process.env.MEDUSA_STRIPE_WEBHOOK_URL ||
    (import.meta.env.MEDUSA_STRIPE_WEBHOOK_URL as string | undefined) ||
    '';
  if (explicit.trim()) return explicit.trim();

  const backend =
    process.env.MEDUSA_BACKEND_URL ||
    (import.meta.env.MEDUSA_BACKEND_URL as string | undefined) ||
    '';
  if (backend.trim()) {
    return `${backend.trim().replace(/\/+$/, '')}/webhooks/stripe`;
  }

  return 'https://api.fasmotorsports.com/webhooks/stripe';
}

export const POST: APIRoute = async ({ request }) => {
  const canonicalWebhook = resolveCanonicalWebhookUrl();
  const signature = request.headers.get('stripe-signature') || '';
  const contentType = request.headers.get('content-type') || 'application/json';

  if (!signature) {
    return jsonResponse(
      {
        error: 'Missing stripe-signature header.',
        canonical_webhook: canonicalWebhook,
      },
      { status: 400 },
      { noIndex: true }
    );
  }

  const rawBody = await request.text();

  try {
    const forwardResponse = await fetch(canonicalWebhook, {
      method: 'POST',
      headers: {
        'content-type': contentType,
        'stripe-signature': signature,
      },
      body: rawBody,
    });

    const responseText = await forwardResponse.text();
    let responseBody: unknown = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = { message: responseText || 'No response body from Medusa webhook.' };
    }

    return jsonResponse(
      {
        forwarded: true,
        canonical_webhook: canonicalWebhook,
        medusa_status: forwardResponse.status,
        medusa_response: responseBody,
      },
      { status: forwardResponse.status },
      { noIndex: true }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to forward webhook';
    return jsonResponse(
      {
        error: message,
        forwarded: false,
        canonical_webhook: canonicalWebhook,
      },
      { status: 502 },
      { noIndex: true }
    );
  }
};
