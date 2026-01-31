import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

/**
 * Phase 1: PaymentIntent Webhook Handler
 * 
 * Handles payment_intent.succeeded events for the new checkout flow.
 * 
 * Flow:
 * 1. Verify webhook signature
 * 2. Extract cart_id from metadata
 * 3. Complete order in Medusa
 * 4. Create order record in Sanity
 */

const SANITY_PROJECT_ID =
  (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
  (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
  '';
const SANITY_DATASET =
  (import.meta.env.SANITY_DATASET as string | undefined) ||
  (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
  '';
const SANITY_API_TOKEN = (import.meta.env.SANITY_API_TOKEN as string | undefined) || '';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
});

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: SANITY_API_TOKEN,
  useCdn: false
});

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret =
    (import.meta.env.STRIPE_WEBHOOK_SECRET as string | undefined) ||
    (process.env.STRIPE_WEBHOOK_SECRET as string | undefined);

  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('[PaymentIntent Webhook] Signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Only handle payment_intent.succeeded
  if (event.type !== 'payment_intent.succeeded') {
    return new Response(`Event type ${event.type} not handled by this endpoint`, { status: 200 });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const metadata = paymentIntent.metadata || {};
  const cartId = metadata.medusa_cart_id;

  if (!cartId) {
    console.error('[PaymentIntent Webhook] Missing medusa_cart_id in metadata');
    return new Response('Missing cart ID in metadata', { status: 400 });
  }

  console.log('[PaymentIntent Webhook] Processing payment for cart:', cartId);

  try {
    // Check if order already exists in Sanity
    const existingOrderId = await sanity.fetch<string | null>(
      '*[_type == "order" && stripePaymentIntentId == $paymentIntentId][0]._id',
      { paymentIntentId: paymentIntent.id }
    );

    if (existingOrderId) {
      console.log('[PaymentIntent Webhook] Order already exists:', existingOrderId);
      return new Response('Order already processed', { status: 200 });
    }

    // Complete order in Medusa
    const medusaConfig = getMedusaConfig();
    if (!medusaConfig) {
      throw new Error('Medusa backend not configured');
    }

    // CRITICAL: Validate cart total matches PaymentIntent amount
    // This prevents race conditions where cart is modified after intent creation
    const cartResponse = await medusaFetch(`/store/carts/${cartId}`, {
      method: 'GET'
    });
    const cartData = await readJsonSafe<any>(cartResponse);

    if (!cartResponse.ok) {
      throw new Error(`Failed to fetch cart: ${cartData?.message || 'Unknown error'}`);
    }

    const currentCart = cartData?.cart;
    const currentTotal = Math.round(currentCart?.total || 0);
    const intentAmount = paymentIntent.amount;

    if (currentTotal !== intentAmount) {
      console.error('[PaymentIntent Webhook] Cart total mismatch:', {
        cartId,
        currentTotal,
        intentAmount,
        diff: intentAmount - currentTotal,
      });
      throw new Error(
        `Cart total mismatch detected. Cart=${currentTotal} cents, Intent=${intentAmount} cents. ` +
        `Cart may have been modified after payment intent creation.`
      );
    }

    console.log('[PaymentIntent Webhook] ✓ Cart total verified:', currentTotal);

    const completeResponse = await medusaFetch(`/store/carts/${cartId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        payment_session_id: paymentIntent.id,
      })
    });

    const completeData = await readJsonSafe<any>(completeResponse);

    if (!completeResponse.ok) {
      console.error('[PaymentIntent Webhook] Medusa order completion failed:', completeData);
      throw new Error(completeData?.message || 'Failed to complete Medusa order');
    }

    const medusaOrder = completeData?.order;
    if (!medusaOrder?.id) {
      throw new Error('Medusa order completion returned no order ID');
    }

    console.log('[PaymentIntent Webhook] ✓ Medusa order created:', medusaOrder.id);

    // Create order in Sanity
    // IMPORTANT: Sanity is a read-only mirror for office dashboard use.
    // Medusa is the authoritative source for all order data and totals.
    // This record is created for internal operations and should NOT be used for business logic.
    const sanityOrder = await sanity.create({
      _type: 'order',
      orderNumber: `FAS-${Date.now()}-${paymentIntent.id.slice(-6).toUpperCase()}`,
      stripePaymentIntentId: paymentIntent.id,
      medusaOrderId: medusaOrder.id,
      medusaCartId: cartId,
      paymentStatus: 'paid',
      fulfillmentStatus: 'pending',
      total: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      customerEmail: metadata.customer_email || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Metadata: Explicitly mark this as a mirror record
      source: 'medusa',
      authoritative: false,
      description: 'Read-only mirror of Medusa order. Totals and order details are sourced from Medusa. Use Medusa API for authoritative data.',
    });

    console.log('[PaymentIntent Webhook] ✓ Sanity order created:', sanityOrder._id);

    return new Response(
      JSON.stringify({
        success: true,
        medusa_order_id: medusaOrder.id,
        sanity_order_id: sanityOrder._id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[PaymentIntent Webhook] Error processing payment:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process payment',
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
