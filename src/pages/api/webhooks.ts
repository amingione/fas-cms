import Stripe from 'stripe';
import { createClient } from '@sanity/client';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil'
});

const sanity = createClient({
  projectId: import.meta.env.SANITY_STUDIO_PROJECT_ID,
  dataset: import.meta.env.SANITY_STUDIO_DATASET,
  apiVersion: '2023-06-07',
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

export const config = {
  runtime: 'nodejs' // Important: disable edge runtime so we can read raw body
};

export async function POST({ request }: { request: Request }) {
  const secret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET in env.');
    return new Response('Webhook secret not configured.', { status: 500 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    console.error('❌ Missing stripe-signature header.');
    return new Response('Missing stripe-signature.', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err);
    return new Response('Webhook signature verification failed.', { status: 400 });
  }

  // Handle event types
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log('✅ Payment confirmed for session:', session.id);
    console.log('Customer Email:', session.customer_details?.email);

    try {
      const newOrder = await sanity.create({
        _type: 'order',
        stripeSessionId: session.id,
        customerEmail: session.customer_details?.email || '',
        cart: [], // Can fill in later
        totalAmount: session.amount_total ? session.amount_total / 100 : 0, // Convert cents to dollars
        status: 'paid',
        createdAt: new Date().toISOString(),
        shippingAddress: {
          name: session.customer_details?.name || '',
          phone: session.customer_details?.phone || '',
          email: session.customer_details?.email || '',
          addressLine1: session.customer_details?.address?.line1 || '',
          addressLine2: session.customer_details?.address?.line2 || '',
          city: session.customer_details?.address?.city || '',
          state: session.customer_details?.address?.state || '',
          postalCode: session.customer_details?.address?.postal_code || '',
          country: session.customer_details?.address?.country || 'US'
        },
        webhookNotified: true
      });

      console.log('📝 Order saved to Sanity:', newOrder._id);
    } catch (err) {
      console.error('❌ Failed to save order to Sanity:', err);
    }
  }

  return new Response('Webhook received.', { status: 200 });
}
