import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse({ error: 'Medusa backend not configured.' }, { status: 503 }, { noIndex: true });
  }

  const stripeSecret =
    (import.meta.env.STRIPE_SECRET_KEY as string | undefined) ||
    (process.env.STRIPE_SECRET_KEY as string | undefined);
  if (!stripeSecret) {
    return jsonResponse({ error: 'Stripe secret key is missing.' }, { status: 500 }, { noIndex: true });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) {
    return jsonResponse({ error: 'Missing sessionId.' }, { status: 400 }, { noIndex: true });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion });
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return jsonResponse(
      { error: 'Stripe payment not completed.', payment_status: session.payment_status },
      { status: 400 },
      { noIndex: true }
    );
  }

  const cartId = session?.metadata?.medusa_cart_id || session?.client_reference_id;
  if (!cartId) {
    return jsonResponse({ error: 'Medusa cart id missing from Stripe session.' }, { status: 400 }, { noIndex: true });
  }

  const paymentCollectionRes = await medusaFetch('/store/payment-collections', {
    method: 'POST',
    body: JSON.stringify({ cart_id: cartId })
  });
  const paymentCollectionData = await readJsonSafe<any>(paymentCollectionRes);
  if (!paymentCollectionRes.ok) {
    return jsonResponse(
      { error: paymentCollectionData?.message || 'Failed to create payment collection.', details: paymentCollectionData },
      { status: paymentCollectionRes.status },
      { noIndex: true }
    );
  }

  const paymentCollectionId = paymentCollectionData?.payment_collection?.id;
  if (!paymentCollectionId) {
    return jsonResponse({ error: 'Payment collection id missing.' }, { status: 500 }, { noIndex: true });
  }

  const paymentSessionRes = await medusaFetch(
    `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'pp_system_default' })
    }
  );
  const paymentSessionData = await readJsonSafe<any>(paymentSessionRes);
  if (!paymentSessionRes.ok) {
    return jsonResponse(
      { error: paymentSessionData?.message || 'Failed to create payment session.', details: paymentSessionData },
      { status: paymentSessionRes.status },
      { noIndex: true }
    );
  }

  const completeRes = await medusaFetch(`/store/carts/${cartId}/complete`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  const completeData = await readJsonSafe<any>(completeRes);
  if (!completeRes.ok) {
    return jsonResponse(
      { error: completeData?.message || 'Failed to complete cart.', details: completeData },
      { status: completeRes.status },
      { noIndex: true }
    );
  }

  return jsonResponse(
    { order: completeData?.order ?? null },
    { status: 200 },
    { noIndex: true }
  );
};
