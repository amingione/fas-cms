import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

/**
 * Phase 1: PaymentIntent Checkout Endpoint
 * 
 * This endpoint replaces Stripe Hosted Checkout Sessions with PaymentIntents.
 * Medusa owns all cart/shipping/tax logic. Stripe is payment processor only.
 * 
 * Flow:
 * 1. Accept cart_id
 * 2. Fetch finalized cart from Medusa
 * 3. Validate cart state (shipping selected, totals locked)
 * 4. Create Stripe PaymentIntent with cart.total
 * 5. Return client_secret for Stripe Elements
 */

type MedusaCart = {
  id: string;
  email?: string | null;
  currency_code?: string;
  total?: number;
  subtotal?: number;
  tax_total?: number;
  shipping_total?: number;
  items?: Array<{ id: string; title?: string; quantity?: number }>;
  shipping_methods?: Array<{ id: string; name?: string; amount?: number }>;
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country_code?: string;
  };
};

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse(
      { error: 'Medusa backend not configured.' },
      { status: 503 },
      { noIndex: true }
    );
  }

  const stripeSecret =
    (import.meta.env.STRIPE_SECRET_KEY as string | undefined) ||
    (process.env.STRIPE_SECRET_KEY as string | undefined);
  if (!stripeSecret) {
    return jsonResponse(
      { error: 'Stripe secret key is missing.' },
      { status: 500 },
      { noIndex: true }
    );
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
  });

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const cartId = typeof body?.cartId === 'string' ? body.cartId.trim() : '';
  if (!cartId) {
    return jsonResponse({ error: 'Missing cartId.' }, { status: 400 }, { noIndex: true });
  }

  // Fetch cart from Medusa
  const cartResponse = await medusaFetch(`/store/carts/${cartId}`, {
    method: 'GET'
  });
  const cartData = await readJsonSafe<any>(cartResponse);
  
  if (!cartResponse.ok) {
    return jsonResponse(
      { error: cartData?.message || 'Unable to load cart.', details: cartData },
      { status: cartResponse.status },
      { noIndex: true }
    );
  }

  const cart: MedusaCart = cartData?.cart;
  
  // Validation 1: Cart must have items
  const items = Array.isArray(cart?.items) ? cart.items : [];
  if (!items.length) {
    return jsonResponse(
      { error: 'Cart has no items. Cannot create payment intent.' },
      { status: 400 },
      { noIndex: true }
    );
  }

  // Validation 2: Shipping method must be selected
  const shippingMethods = Array.isArray(cart?.shipping_methods) ? cart.shipping_methods : [];
  if (!shippingMethods.length) {
    return jsonResponse(
      { error: 'Shipping method not selected. Complete shipping selection before payment.' },
      { status: 400 },
      { noIndex: true }
    );
  }

  // Validation 3: Shipping address must exist (for tax calculation)
  if (!cart?.shipping_address?.country_code) {
    return jsonResponse(
      { error: 'Shipping address required for tax calculation.' },
      { status: 400 },
      { noIndex: true }
    );
  }

  // Validation 4: Total must be finalized
  const total = cart?.total;
  if (typeof total !== 'number' || total <= 0) {
    return jsonResponse(
      { error: 'Cart total is invalid or not calculated. Ensure shipping and tax are finalized.' },
      { status: 400 },
      { noIndex: true }
    );
  }

  // Create PaymentIntent with finalized amount
  // Ensure amount is an integer (Stripe requires cents, not dollars)
  const amountInCents = Math.round(total);
  const currency = (cart?.currency_code || 'usd').toLowerCase();
  const customerEmail = cart?.email || undefined;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        medusa_cart_id: cartId,
        customer_email: customerEmail || '',
        subtotal: String(cart?.subtotal || 0),
        tax_total: String(cart?.tax_total || 0),
        shipping_total: String(cart?.shipping_total || 0),
        item_count: String(items.length),
      },
      description: `Order for ${items.length} item(s) - Cart ${cartId}`,
    });

    return jsonResponse(
      {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (error: any) {
    console.error('[PaymentIntent] Creation failed:', error);
    return jsonResponse(
      {
        error: 'Failed to create payment intent.',
        details: error?.message || String(error),
      },
      { status: 500 },
      { noIndex: true }
    );
  }
};
