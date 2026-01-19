import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { jsonResponse } from '@/server/http/responses';

const stripeSecret =
  (import.meta.env.STRIPE_SECRET_KEY as string | undefined) || process.env.STRIPE_SECRET_KEY;
const stripeApiVersion =
  (import.meta.env.STRIPE_API_VERSION as string | undefined) ||
  process.env.STRIPE_API_VERSION ||
  '2025-08-27.basil';

const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: stripeApiVersion as Stripe.LatestApiVersion })
  : null;

const SESSION_ID_PATTERN = /^cs_(?:live|test)_[A-Za-z0-9]+$/;

const isDebugAllowed = (): boolean => {
  const mode = (import.meta.env.MODE || process.env.NODE_ENV || 'development').toLowerCase();
  if (mode !== 'production') return true;
  const envFlag =
    (import.meta.env.DEBUG_STRIPE_CHECKOUT_SESSION as string | undefined) ||
    process.env.DEBUG_STRIPE_CHECKOUT_SESSION;
  return String(envFlag || '').toLowerCase() === 'true';
};

const getSessionId = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return SESSION_ID_PATTERN.test(trimmed) ? trimmed : null;
};

export const GET: APIRoute = async ({ request }) => {
  if (!stripe) {
    return jsonResponse({ error: 'Stripe not configured' }, { status: 500 }, { noIndex: true });
  }

  if (!isDebugAllowed()) {
    return jsonResponse({ error: 'Debug endpoint disabled' }, { status: 403 }, { noIndex: true });
  }

  const url = new URL(request.url);
  const sessionId = getSessionId(url.searchParams.get('session_id'));
  if (!sessionId) {
    return jsonResponse({ error: 'Missing or invalid session_id' }, { status: 400 }, { noIndex: true });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'shipping_cost.shipping_rate']
    });
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      expand: ['data.price.product']
    });

    return jsonResponse(
      {
        session,
        lineItems
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to retrieve checkout session';
    console.error('[checkout-debug] Failed to retrieve session', message);
    return jsonResponse({ error: message }, { status: 500 }, { noIndex: true });
  }
};
