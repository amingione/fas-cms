/**
 * Create Stripe Payment Intent
 * Initializes checkout with cart subtotal (shipping added later)
 */
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { cart_id } = await request.json();

    if (!cart_id) {
      return new Response(JSON.stringify({ error: 'cart_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch cart from Medusa
    const medusaUrl = import.meta.env.MEDUSA_API_URL || 'http://localhost:9000';
    const cartResponse = await fetch(`${medusaUrl}/store/carts/${cart_id}`);

    if (!cartResponse.ok) {
      return new Response(JSON.stringify({ error: 'Cart not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { cart } = await cartResponse.json();

    // Create Payment Intent with cart subtotal (shipping added later)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: cart.subtotal, // Amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        cart_id,
        integration: 'fas_checkout',
        source: 'astro_storefront'
      }
    });

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Payment Intent creation error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to create payment intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
