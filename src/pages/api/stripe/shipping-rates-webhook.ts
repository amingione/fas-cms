/**
 * Stripe Adaptive Pricing Webhook
 * Called by Stripe when customer enters shipping address in checkout
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

interface EasyPostRate {
  rateId: string;
  carrier: string;
  service: string;
  amount: number;
  deliveryDays?: number;
  carrierId: string;
  serviceCode: string;
}

interface EasyPostResponse {
  rates: EasyPostRate[];
  easyPostShipmentId: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Verify Stripe signature for security
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('[ShippingWebhook] Missing Stripe signature');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
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
      console.error('[ShippingWebhook] Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ShippingWebhook] ✅ Webhook event received:', event.type);

    // 2. Extract shipping address and session details
    const webhookData = event.data.object as any;
    const { shipping_address, session_id } = webhookData;

    if (!shipping_address || !session_id) {
      console.error('[ShippingWebhook] Missing required fields:', { 
        hasShippingAddress: !!shipping_address, 
        hasSessionId: !!session_id 
      });
      return new Response(
        JSON.stringify({
          error: 'Missing shipping address or session ID'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ShippingWebhook] 📍 Processing shipping address:', {
      city: shipping_address.city,
      state: shipping_address.state,
      postal_code: shipping_address.postal_code,
      country: shipping_address.country,
    });

    // 3. Retrieve checkout session to get cart items
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
      console.log('[ShippingWebhook] ✅ Session retrieved:', session_id);
    } catch (err) {
      console.error('[ShippingWebhook] ❌ Failed to retrieve session:', err);
      return new Response(
        JSON.stringify({
          error: 'Failed to retrieve session'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cartMetadata = session.metadata?.cart;
    if (!cartMetadata) {
      console.error('[ShippingWebhook] ❌ Cart data not found in session metadata');
      return new Response(
        JSON.stringify({
          error: 'Cart data not found in session metadata'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let cart: CartItem[];
    try {
      cart = JSON.parse(cartMetadata);
      console.log('[ShippingWebhook] 🛒 Cart items parsed:', cart.length, 'items');
    } catch (err) {
      console.error('[ShippingWebhook] ❌ Failed to parse cart metadata:', err);
      return new Response(
        JSON.stringify({
          error: 'Invalid cart data format'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Call fas-sanity Netlify function to get EasyPost rates
    const sanityBaseUrl = import.meta.env.SANITY_BASE_URL;
    if (!sanityBaseUrl) {
      console.error('[ShippingWebhook] ❌ SANITY_BASE_URL not configured');
      return new Response(
        JSON.stringify({
          error: 'Configuration error: SANITY_BASE_URL missing'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const easyPostEndpoint = `${sanityBaseUrl}/.netlify/functions/getShippingQuoteBySkus`;
    console.log('[ShippingWebhook] 📞 Calling EasyPost rate function:', easyPostEndpoint);

    const rateResponse = await fetch(
      easyPostEndpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          destination: {
            addressLine1: shipping_address.line1 || '',
            addressLine2: shipping_address.line2 || '',
            city: shipping_address.city || '',
            state: shipping_address.state || '',
            postalCode: shipping_address.postal_code || '',
            country: shipping_address.country || 'US',
          },
        }),
      }
    );

    if (!rateResponse.ok) {
      const errorText = await rateResponse.text();
      console.error('[ShippingWebhook] ❌ EasyPost rate fetch failed:', {
        status: rateResponse.status,
        statusText: rateResponse.statusText,
        error: errorText,
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to calculate shipping rates',
          details: errorText,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rateData: EasyPostResponse = await rateResponse.json();
    console.log('[ShippingWebhook] ✅ EasyPost rates received:', rateData.rates.length, 'rates');

    // 5. Transform EasyPost rates to Stripe format
    const shippingRates = rateData.rates.map((rate: EasyPostRate, index: number) => {
      const sanitizedCarrier = rate.carrier.toLowerCase().replace(/\s+/g, '_');
      const sanitizedService = rate.service.toLowerCase().replace(/\s+/g, '_');
      
      // Create unique ID for this rate
      const rateId = `rate_${index}_${sanitizedCarrier}_${sanitizedService}`;
      
      console.log(`[ShippingWebhook] 📦 Rate ${index + 1}:`, {
        carrier: rate.carrier,
        service: rate.service,
        amount: rate.amount,
        deliveryDays: rate.deliveryDays,
      });
      
      return {
        id: rateId,
        display_name: `${rate.carrier} ${rate.service}`,
        delivery_estimate: rate.deliveryDays
          ? {
              minimum: { 
                unit: 'business_day' as const, 
                value: rate.deliveryDays 
              },
              maximum: { 
                unit: 'business_day' as const, 
                value: rate.deliveryDays + 1 
              },
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
      };
    });

    console.log('[ShippingWebhook] ✅ Formatted shipping rates:', shippingRates.length);
    console.log('[ShippingWebhook] 📨 Returning rates to Stripe');

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
    console.error('[ShippingWebhook] ❌ Webhook error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error calculating shipping rates',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
