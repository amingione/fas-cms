import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { jsonResponse } from '@/server/http/responses';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

const DEFAULT_TIMEOUT_MS = 10000;

const readEnv = (name: string): string => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const parseTimeoutMs = (value: string | undefined): number => {
  if (!value) return DEFAULT_TIMEOUT_MS;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1000) return DEFAULT_TIMEOUT_MS;
  return parsed;
};

const getCartIdFromMetadata = (metadata: Record<string, string | null | undefined> | null | undefined): string => {
  if (!metadata) return '';
  const direct = metadata.medusa_cart_id || metadata.medusaCartId || metadata.cart_id;
  return typeof direct === 'string' ? direct.trim() : '';
};

const safeJsonParse = (value: string): any | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const buildForwardHeaders = (request: Request, eventId: string): Headers => {
  const headers = new Headers();
  headers.set('content-type', request.headers.get('content-type') || 'application/json');
  headers.set('x-fas-forwarded-from', 'fas-cms-fresh:/api/medusa/webhooks/payment-intent');
  headers.set('x-fas-forwarded-event-id', eventId);

  const stripeSignature = request.headers.get('stripe-signature');
  if (stripeSignature) {
    headers.set('stripe-signature', stripeSignature);
  }

  const sharedSecret = readEnv('WEBHOOK_FORWARD_SHARED_SECRET');
  if (sharedSecret) {
    headers.set('x-fas-forwarded-secret', sharedSecret);
  }

  return headers;
};

async function forwardStripeWebhook(input: {
  request: Request;
  rawBody: string;
  eventId: string;
  targetUrl: string;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(input.targetUrl, {
      method: 'POST',
      headers: buildForwardHeaders(input.request, input.eventId),
      body: input.rawBody,
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body,
      error: '',
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: '',
      error: error instanceof Error ? error.message : 'Unknown forward error',
    };
  } finally {
    clearTimeout(timer);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const webhookSecret = readEnv('STRIPE_WEBHOOK_SECRET');
  const stripeSecret = readEnv('STRIPE_SECRET_KEY');

  let event: Stripe.Event | null = null;

  if (webhookSecret) {
    const signature = request.headers.get('stripe-signature') || '';
    if (!signature) {
      return jsonResponse(
        { received: false, error: 'Missing stripe-signature header' },
        { status: 400 },
        { noIndex: true }
      );
    }

    if (!stripeSecret) {
      return jsonResponse(
        { received: false, error: 'STRIPE_SECRET_KEY is required when STRIPE_WEBHOOK_SECRET is set' },
        { status: 500 },
        { noIndex: true }
      );
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
    });

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      return jsonResponse(
        {
          received: false,
          error: 'Invalid Stripe signature',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 400 },
        { noIndex: true }
      );
    }
  } else {
    event = safeJsonParse(rawBody) as Stripe.Event | null;
    if (!event || typeof event !== 'object') {
      return jsonResponse(
        { received: false, error: 'Invalid webhook payload JSON' },
        { status: 400 },
        { noIndex: true }
      );
    }
  }

  if (event.type !== 'payment_intent.succeeded') {
    return jsonResponse(
      {
        received: true,
        ignored: true,
        event_id: event.id || null,
        event_type: event.type || null,
      },
      { status: 200 },
      { noIndex: true }
    );
  }

  const paymentIntent = event.data?.object as Stripe.PaymentIntent;
  const paymentIntentId = typeof paymentIntent?.id === 'string' ? paymentIntent.id : '';
  const medusaCartId = getCartIdFromMetadata(paymentIntent?.metadata);
  const eventId = typeof event.id === 'string' ? event.id : `evt-${Date.now()}`;

  const forwardUrl =
    readEnv('PAYMENT_INTENT_WEBHOOK_FORWARD_URL') ||
    readEnv('WEBHOOK_FORWARD_STRIPE_PAYMENT_INTENT_URL');
  const forwardEnabled = parseBoolean(process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED, Boolean(forwardUrl));
  const forwardFailOpen = parseBoolean(process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_FAIL_OPEN, true);
  const forwardTimeoutMs = parseTimeoutMs(process.env.WEBHOOK_FORWARD_TIMEOUT_MS);

  let forwardResult: Awaited<ReturnType<typeof forwardStripeWebhook>> | null = null;
  if (forwardEnabled && forwardUrl) {
    forwardResult = await forwardStripeWebhook({
      request,
      rawBody,
      eventId,
      targetUrl: forwardUrl,
      timeoutMs: forwardTimeoutMs,
    });

    if (forwardResult.ok) {
      return jsonResponse(
        {
          received: true,
          forwarded: true,
          forward_status: forwardResult.status,
          event_id: eventId,
          payment_intent_id: paymentIntentId || null,
        },
        { status: 200 },
        { noIndex: true }
      );
    }

    if (!forwardFailOpen) {
      return jsonResponse(
        {
          received: false,
          forwarded: true,
          error: 'Webhook forwarding failed',
          details: forwardResult.error || forwardResult.body || 'Unknown downstream error',
          event_id: eventId,
        },
        { status: 502 },
        { noIndex: true }
      );
    }
  }

  const localProcessEnabled = parseBoolean(process.env.PAYMENT_INTENT_WEBHOOK_LOCAL_PROCESS_ENABLED, true);
  if (!localProcessEnabled) {
    return jsonResponse(
      {
        received: true,
        forwarded: Boolean(forwardResult),
        local_processed: false,
        event_id: eventId,
      },
      { status: 200 },
      { noIndex: true }
    );
  }

  if (!paymentIntentId || !medusaCartId) {
    return jsonResponse(
      {
        received: true,
        ignored: true,
        reason: 'Missing payment_intent_id or medusa_cart_id metadata',
        event_id: eventId,
      },
      { status: 200 },
      { noIndex: true }
    );
  }

  try {
    const completeOrderUrl = new URL('/api/complete-order', request.url).toString();
    const completeResponse = await fetch(completeOrderUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cart_id: medusaCartId,
        payment_intent_id: paymentIntentId,
      }),
    });

    const completeBody = await completeResponse.text();
    const completeJson = safeJsonParse(completeBody);

    if (!completeResponse.ok) {
      return jsonResponse(
        {
          received: false,
          error: 'Local order completion failed',
          status: completeResponse.status,
          details: completeJson || completeBody,
          event_id: eventId,
        },
        { status: 500 },
        { noIndex: true }
      );
    }

    return jsonResponse(
      {
        received: true,
        forwarded: Boolean(forwardResult),
        local_processed: true,
        event_id: eventId,
        payment_intent_id: paymentIntentId,
        medusa_cart_id: medusaCartId,
        local_result: completeJson || null,
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (error) {
    return jsonResponse(
      {
        received: false,
        error: 'Local order completion request failed',
        details: error instanceof Error ? error.message : String(error),
        event_id: eventId,
      },
      { status: 502 },
      { noIndex: true }
    );
  }
};
