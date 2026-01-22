/**
 * Stripe Adaptive Pricing Webhook
 * Called by Stripe when customer enters shipping address in checkout
 * Returns real-time EasyPost rates dynamically
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
});

interface ShippingAddressInput {
  city?: string;
  country?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  state?: string;
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

type ShippingMeta = {
  weightLbs: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
};

const EASYPOST_API_BASE = import.meta.env.EASYPOST_API_BASE || 'https://api.easypost.com';
const REQUIRED_WAREHOUSE_FIELDS = [
  'WAREHOUSE_ADDRESS_LINE1',
  'WAREHOUSE_CITY',
  'WAREHOUSE_STATE',
  'WAREHOUSE_ZIP'
];

const parseNumber = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseShippingMeta = (metadata: Record<string, string>, quantity: number): ShippingMeta | null => {
  if (metadata.shipping_required !== 'true') return null;
  const weight = parseNumber(metadata.package_weight);
  const length = parseNumber(metadata.package_length);
  const width = parseNumber(metadata.package_width);
  const height = parseNumber(metadata.package_height);
  if (!weight || !length || !width || !height) return null;
  if (metadata.package_weight_unit && metadata.package_weight_unit !== 'pound') return null;
  if (metadata.dimensions_unit && metadata.dimensions_unit !== 'inch') return null;
  return { weightLbs: weight, length, width, height, quantity };
};

const resolveOriginAddress = () => ({
  name: 'F.A.S. Motorsports LLC',
  street1: import.meta.env.WAREHOUSE_ADDRESS_LINE1!,
  street2: import.meta.env.WAREHOUSE_ADDRESS_LINE2 || undefined,
  city: import.meta.env.WAREHOUSE_CITY!,
  state: import.meta.env.WAREHOUSE_STATE!,
  zip: import.meta.env.WAREHOUSE_ZIP!,
  country: 'US',
  phone: import.meta.env.WAREHOUSE_PHONE || undefined,
  email: import.meta.env.WAREHOUSE_EMAIL || undefined
});

const requestEasyPostRates = async (
  destination: ShippingAddressInput,
  parcels: ShippingMeta[]
): Promise<EasyPostResponse> => {
  const apiKey = import.meta.env.EASYPOST_API_KEY;
  if (!apiKey) {
    throw new Error('EASYPOST_API_KEY not configured');
  }

  const totalWeightLbs = parcels.reduce(
    (sum, parcel) => sum + parcel.weightLbs * parcel.quantity,
    0
  );
  const maxLength = Math.max(...parcels.map((parcel) => parcel.length));
  const maxWidth = Math.max(...parcels.map((parcel) => parcel.width));
  const maxHeight = Math.max(...parcels.map((parcel) => parcel.height));

  const payload = {
    shipment: {
      to_address: {
        street1: destination.line1 || '',
        street2: destination.line2 || '',
        city: destination.city || '',
        state: destination.state || '',
        zip: destination.postal_code || '',
        country: destination.country || 'US'
      },
      from_address: resolveOriginAddress(),
      parcel: {
        length: maxLength,
        width: maxWidth,
        height: maxHeight,
        weight: Math.max(1, Math.round(totalWeightLbs * 16))
      }
    }
  };

  const response = await fetch(`${EASYPOST_API_BASE}/v2/shipments`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EasyPost rate request failed: ${errorText}`);
  }

  const data = await response.json();
  const rates = Array.isArray(data?.rates) ? data.rates : [];

  return {
    easyPostShipmentId: data?.id,
    rates: rates.map((rate: any) => ({
      rateId: rate.id,
      carrier: rate.carrier,
      service: rate.service,
      amount: Number(rate.rate),
      deliveryDays: rate.delivery_days ?? undefined,
      carrierId: rate.carrier_id,
      serviceCode: rate.service_code
    }))
  };
};

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

    const shippingWebhookSecret = import.meta.env.STRIPE_SHIPPING_WEBHOOK_SECRET;
    if (!shippingWebhookSecret) {
      console.error('❌ Missing STRIPE_SHIPPING_WEBHOOK_SECRET');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const missingWarehouseFields = REQUIRED_WAREHOUSE_FIELDS.filter(
      (key) => !import.meta.env[key]
    );
    if (missingWarehouseFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required warehouse config',
          missing: missingWarehouseFields
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        shippingWebhookSecret
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

    // 3. Retrieve checkout session and line items
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

    const lineItems = await stripe.checkout.sessions.listLineItems(session_id, {
      limit: 100,
      expand: ['data.price.product']
    });
    const shippable: ShippingMeta[] = [];
    for (const item of lineItems.data) {
      const quantity = Math.max(1, item.quantity || 1);
      const product = typeof item.price?.product === 'string' ? null : item.price?.product;
      const metadata = (product && !('deleted' in product) ? product.metadata : {}) || {};
      const parsed = parseShippingMeta(metadata as Record<string, string>, quantity);
      if (parsed) {
        shippable.push(parsed);
      }
    }

    if (!shippable.length) {
      console.error('[ShippingWebhook] ❌ No shippable items found for EasyPost rates');
      return new Response(
        JSON.stringify({ error: 'No shippable items available for shipping rates' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ShippingWebhook] 📦 Shippable items:', shippable.length);

    // 4. Call EasyPost API directly to get rates
    let rateData: EasyPostResponse;
    try {
      rateData = await requestEasyPostRates(shipping_address, shippable);
    } catch (err) {
      console.error('[ShippingWebhook] ❌ EasyPost rate fetch failed:', err);
      return new Response(
        JSON.stringify({
          error: 'Failed to calculate shipping rates',
          message: err instanceof Error ? err.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ShippingWebhook] ✅ EasyPost rates received:', rateData.rates.length, 'rates');

    // 5. Transform EasyPost rates to Stripe format
    const shippingRates = rateData.rates.map((rate: EasyPostRate, index: number) => {
      // Create stable ID that won't collide with EasyPost rate IDs.
      const rateId = `dyn_${rate.rateId}`;
      
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
