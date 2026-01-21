/**
 * Stripe Adaptive Pricing Webhook
 * Called by Stripe when customer enters shipping address
 * Returns real-time EasyPost rates dynamically
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

interface ShippingAddressInput {
  city?: string;
  country?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  state?: string;
}

interface CartItem {
  sku: string;
  quantity: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Verify Stripe signature
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }

    const body = await request.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        import.meta.env.STRIPE_SHIPPING_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 401 });
    }

    // 2. Extract shipping address and session details
    const { shipping_address, session_id } = event.data.object as {
      shipping_address: ShippingAddressInput;
      session_id: string;
    };

    if (!shipping_address || !session_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing shipping address or session ID'
        }),
        { status: 400 }
      );
    }

    // 3. Retrieve checkout session to get cart items from metadata
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const cartMetadata = session.metadata?.cart;
    if (!cartMetadata) {
      return new Response(
        JSON.stringify({
          error: 'Cart data not found in session metadata'
        }),
        { status: 400 }
      );
    }

    const cart: CartItem[] = JSON.parse(cartMetadata);

    // 4. Call fas-sanity Netlify function to get EasyPost rates
    const sanityBaseUrl = import.meta.env.SANITY_BASE_URL;
    const response = await fetch(
      `${sanityBaseUrl}/.netlify/functions/getShippingQuoteBySkus`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          destination: {
            addressLine1: shipping_address.line1,
            addressLine2: shipping_address.line2 || '',
            city: shipping_address.city,
            state: shipping_address.state,
            postalCode: shipping_address.postal_code,
            country: shipping_address.country || 'US',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EasyPost rate fetch failed:', errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to calculate shipping rates'
        }),
        { status: 500 }
      );
    }

    const rateData = await response.json();

    // 5. Transform EasyPost rates to Stripe format
    const shippingRates = rateData.rates.map((rate: any, index: number) => ({
      id: `rate_${index}_${rate.carrier.toLowerCase()}_${rate.service.toLowerCase().replace(/\s+/g, '_')}`,
      display_name: `${rate.carrier} ${rate.service}`,
      delivery_estimate: rate.deliveryDays
        ? {
            minimum: { unit: 'business_day', value: rate.deliveryDays },
            maximum: { unit: 'business_day', value: rate.deliveryDays + 1 },
          }
        : undefined,
      fixed_amount: {
        amount: Math.round(rate.amount * 100), // Convert dollars to cents
        currency: 'usd',
      },
      metadata: {
        easypost_rate_id: rate.rateId,
        easypost_shipment_id: rateData.easyPostShipmentId,
        carrier: rate.carrier,
        service: rate.service,
        carrier_id: rate.carrierId,
        service_code: rate.serviceCode,
      },
    }));

    // 6. Return formatted rates to Stripe
    return new Response(
      JSON.stringify({
        shipping_rates: shippingRates,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Shipping rates webhook error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error calculating shipping rates'
      }),
      { status: 500 }
    );
  }
};
