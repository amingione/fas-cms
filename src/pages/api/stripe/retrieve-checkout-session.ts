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

const toSessionInfo = (session: Stripe.Checkout.Session) => ({
  id: session.id,
  status: session.status ?? null,
  payment_status: session.payment_status ?? null,
  customer_email: session.customer_details?.email || session.customer_email || undefined,
  amount_total: session.amount_total ?? undefined
});

const resolveBoolean = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
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

  const includeClientSecret = resolveBoolean(url.searchParams.get('include_client_secret'));

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const payload: Record<string, unknown> = { session: toSessionInfo(session) };
    if (includeClientSecret && session.client_secret) {
      payload.clientSecret = session.client_secret;
    }
    return jsonResponse(payload, { status: 200 }, { noIndex: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to retrieve checkout session';
    console.error('[checkout-return] Failed to retrieve session', message);
    return jsonResponse({ error: message }, { status: 500 }, { noIndex: true });
  }
};
