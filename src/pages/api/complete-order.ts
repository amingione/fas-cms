/**
 * Complete Order After Payment
 * Converts Medusa cart to order. Fulfillment is handled by fas-dash via Medusa.
 */
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';
import { getMedusaConfig, medusaFetch } from '@/lib/medusa';

const resolveEnv = (name: string): string => {
  const runtimeValue = process.env[name];
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim();
  }
  const buildValue = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof buildValue === 'string' ? buildValue.trim() : '';
};

const toCents = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return 0;
};

const resolveEffectiveCartTotalCents = (cart: any): number => {
  const baseTotal = toCents(cart?.total);
  const localItems = Array.isArray(cart?.metadata?.local_cart_items)
    ? cart.metadata.local_cart_items
    : [];
  const medusaItems = Array.isArray(cart?.items) ? cart.items : [];
  const byLocalId = new Map<string, any>();
  medusaItems.forEach((item: any) => {
    const localId = typeof item?.metadata?.local_item_id === 'string' ? item.metadata.local_item_id : '';
    if (localId) byLocalId.set(localId, item);
  });

  let delta = 0;
  localItems.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    const id = typeof entry.id === 'string' ? entry.id : '';
    if (!id) return;
    const baseUnit = toCents(entry.price);
    if (baseUnit <= 0) return;
    const detailed = Array.isArray(entry.selectedUpgradesDetailed) ? entry.selectedUpgradesDetailed : [];
    const addOnTotal = detailed.reduce((sum: number, detail: any) => sum + Math.max(0, toCents(detail?.priceCents)), 0);
    if (addOnTotal <= 0) return;
    const expectedUnit = baseUnit + addOnTotal;
    const actualUnit = toCents(byLocalId.get(id)?.unit_price);
    if (actualUnit < expectedUnit) {
      const qty = Math.max(1, toCents(byLocalId.get(id)?.quantity || entry.quantity || 1));
      delta += (expectedUnit - actualUnit) * qty;
    }
  });

  return baseTotal + delta;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const stripeSecretKey = resolveEnv('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Missing Stripe secret key.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
    });

    const { cart_id, payment_intent_id } = await request.json();

    if (!cart_id || !payment_intent_id) {
      return new Response(JSON.stringify({ error: 'cart_id and payment_intent_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch Payment Intent to get shipping details and payment status
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const metadataCartId =
      String(
        paymentIntent?.metadata?.medusa_cart_id ||
          paymentIntent?.metadata?.medusaCartId ||
          paymentIntent?.metadata?.cart_id ||
          ''
      ).trim();
    if (!metadataCartId || metadataCartId !== cart_id) {
      return new Response(JSON.stringify({ error: 'Payment/cart mismatch' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Complete cart in Medusa (convert to order)
    // Uses getMedusaConfig() / medusaFetch() — the standard pattern across all API routes.
    // This reads MEDUSA_BACKEND_URL (server) or PUBLIC_MEDUSA_BACKEND_URL (build) so there
    // is no more localhost:9000 fallback from a missing MEDUSA_API_URL variable.
    const medusaConfig = getMedusaConfig();
    if (!medusaConfig) {
      return new Response(JSON.stringify({ error: 'Medusa backend not configured.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Helper: fetch an existing order that was already created for this cart.
    // Used for race-condition recovery when the Stripe webhook completes the cart first.
    const fetchOrderByCartId = async (cartId: string): Promise<any | null> => {
      try {
        const res = await medusaFetch(`/store/orders?cart_id=${encodeURIComponent(cartId)}`, {
          method: 'GET'
        });
        const data = await res.json().catch(() => ({}));
        return data?.orders?.[0] ?? data?.order ?? null;
      } catch {
        return null;
      }
    };

    // Fetch cart — if 404, the Stripe webhook may have already completed it.
    const cartResponse = await medusaFetch(`/store/carts/${cart_id}`, { method: 'GET' });
    const cartPayload = await cartResponse.json().catch(() => ({}));

    if (!cartResponse.ok || !cartPayload?.cart) {
      if (cartResponse.status === 404) {
        // Cart gone → webhook likely completed it first. Look up the resulting order.
        const existingOrder = await fetchOrderByCartId(cart_id);
        if (existingOrder) {
          console.log(`[complete-order] cart ${cart_id} already converted; recovering order ${existingOrder.id}`);
          // Order fulfillment is handled by fas-dash via Medusa admin webhook — no Sanity write needed
          return new Response(
            JSON.stringify({
              success: true,
              order_id: existingOrder.id,
              order_number: existingOrder.display_id
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      return new Response(JSON.stringify({ error: 'Failed to load cart before completion.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cartTotalCents = resolveEffectiveCartTotalCents(cartPayload.cart);
    const stripeTaxTotalCents = Math.max(
      0,
      toCents(paymentIntent?.metadata?.stripe_tax_total_cents)
    );
    const expectedTotalCents = cartTotalCents + stripeTaxTotalCents;
    const cartCurrency = String(cartPayload.cart?.currency_code || '').toLowerCase();
    const piAmount = Number(paymentIntent.amount ?? NaN);
    const piCurrency = String(paymentIntent.currency || '').toLowerCase();
    if (
      !Number.isFinite(expectedTotalCents) ||
      !Number.isFinite(piAmount) ||
      expectedTotalCents !== piAmount ||
      !cartCurrency ||
      cartCurrency !== piCurrency
    ) {
      return new Response(
        JSON.stringify({
          error: 'Payment amount/currency mismatch.',
          details: {
            cart_total: cartTotalCents,
            stripe_tax_total: stripeTaxTotalCents,
            expected_total: expectedTotalCents,
            payment_intent_amount: piAmount,
            cart_currency: cartCurrency,
            payment_intent_currency: piCurrency
          }
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const completeResponse = await medusaFetch(`/store/carts/${cart_id}/complete`, {
      method: 'POST'
    });

    if (!completeResponse.ok) {
      // Race-condition recovery: webhook may have completed the cart between our cart fetch
      // and the complete call. Look up the resulting order before returning an error.
      const existingOrder = await fetchOrderByCartId(cart_id);
      if (existingOrder) {
        console.log(`[complete-order] complete failed but order found for cart ${cart_id}; recovering order ${existingOrder.id}`);
        // Order fulfillment is handled by fas-dash via Medusa admin webhook — no Sanity write needed
        return new Response(
          JSON.stringify({
            success: true,
            order_id: existingOrder.id,
            order_number: existingOrder.display_id
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const completePayload = await completeResponse.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: completePayload?.message || 'Failed to complete cart in Medusa'
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const completeData = await completeResponse.json().catch(() => ({}));
    // Medusa v2 returns { type: 'order', order: {...} }
    const order = completeData?.order ?? completeData;

    // Order fulfillment is handled by fas-dash via Medusa admin webhook — no Sanity write needed
    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.display_id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Order completion error:', error);

    // Explicit error status so frontend can block redirect and show retry state.
    return new Response(
      JSON.stringify({
        error: 'Failed to complete order.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

