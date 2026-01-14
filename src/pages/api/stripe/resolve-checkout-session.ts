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

const getSessionId = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return SESSION_ID_PATTERN.test(trimmed) ? trimmed : null;
};

export const GET: APIRoute = async ({ request }) => {
  if (!stripe) {
    return jsonResponse({ error: 'Stripe not configured' }, { status: 500 }, { noIndex: true });
  }

  const url = new URL(request.url);
  const sessionId = getSessionId(url.searchParams.get('session_id'));
  if (!sessionId) {
    return jsonResponse({ error: 'Missing or invalid session_id' }, { status: 400 }, { noIndex: true });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session?.url) {
      return jsonResponse({ error: 'Checkout URL not available for session' }, { status: 404 }, { noIndex: true });
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: session.url,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve checkout session';
    console.error('[checkout-resolve] Failed to retrieve session', message);
    return jsonResponse({ error: message }, { status: 500 }, { noIndex: true });
  }
};
