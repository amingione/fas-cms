/**
 * Complete Order After Payment
 * Converts Medusa cart to order and syncs to Sanity for fulfillment
 */
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';
import { createClient } from '@sanity/client';
import { requireSanityApiToken } from '@/server/sanity-token';
import { formatOrderNumber } from '@/lib/order-number';

const resolveEnv = (name: string): string => {
  const runtimeValue = process.env[name];
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim();
  }
  const buildValue = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof buildValue === 'string' ? buildValue.trim() : '';
};

let cachedSanityClient: ReturnType<typeof createClient> | null = null;

const getSanityClient = () => {
  if (cachedSanityClient) return cachedSanityClient;

  const projectId =
    resolveEnv('SANITY_PROJECT_ID') ||
    ((import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) || '').trim();
  if (!projectId) {
    throw new Error('Missing SANITY_PROJECT_ID for api/complete-order');
  }

  const dataset =
    resolveEnv('SANITY_DATASET') ||
    ((import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) || 'production').trim();

  cachedSanityClient = createClient({
    projectId,
    dataset,
    token: requireSanityApiToken('api/complete-order'),
    apiVersion: '2024-01-01',
    useCdn: false
  });

  return cachedSanityClient;
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
    const medusaUrl = resolveEnv('MEDUSA_API_URL') || 'http://localhost:9000';
    const publishableKey =
      (import.meta.env.MEDUSA_PUBLISHABLE_KEY as string | undefined) ||
      (import.meta.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY as string | undefined) ||
      (process.env.MEDUSA_PUBLISHABLE_KEY as string | undefined) ||
      (process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY as string | undefined);

    if (!publishableKey) {
      return new Response(JSON.stringify({ error: 'Missing Medusa publishable key.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cartResponse = await fetch(`${medusaUrl}/store/carts/${cart_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': publishableKey
      }
    });

    const cartPayload = await cartResponse.json().catch(() => ({}));
    if (!cartResponse.ok || !cartPayload?.cart) {
      return new Response(JSON.stringify({ error: 'Failed to load cart before completion.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cartTotalCents = Number(cartPayload.cart?.total ?? NaN);
    const cartCurrency = String(cartPayload.cart?.currency_code || '').toLowerCase();
    const piAmount = Number(paymentIntent.amount ?? NaN);
    const piCurrency = String(paymentIntent.currency || '').toLowerCase();
    if (
      !Number.isFinite(cartTotalCents) ||
      !Number.isFinite(piAmount) ||
      cartTotalCents !== piAmount ||
      !cartCurrency ||
      cartCurrency !== piCurrency
    ) {
      return new Response(
        JSON.stringify({
          error: 'Payment amount/currency mismatch.',
          details: {
            cart_total: cartTotalCents,
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

    const completeResponse = await fetch(`${medusaUrl}/store/carts/${cart_id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': publishableKey
      }
    });

    if (!completeResponse.ok) {
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

    const { order } = await completeResponse.json();

    // Sync order to Sanity for fulfillment
    const formattedOrderNumber = await syncOrderToSanity(order, paymentIntent);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: formattedOrderNumber || order.display_id
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

const toNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : undefined;
};

const toDollars = (cents: unknown): number | undefined => {
  const n = toNumber(cents);
  if (n === undefined) return undefined;
  return Math.round(n) / 100;
};

const ORDER_NUMBER_PATTERN = /^FAS-\d{6}$/;

const toCanonicalOrderNumber = (...values: Array<unknown>): string | undefined => {
  for (const value of values) {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    if (!raw) continue;
    const normalized = raw.toUpperCase();
    if (ORDER_NUMBER_PATTERN.test(normalized)) return normalized;
    const digits = normalized.replace(/\D/g, '');
    if (digits) {
      return `FAS-${digits.slice(-6).padStart(6, '0')}`;
    }
  }
  return undefined;
};

const normalizePaymentStatus = (status: string | undefined): string => {
  switch (status) {
    case 'captured':
      return 'paid';
    case 'refunded':
      return 'refunded';
    case 'partially_refunded':
      return 'partially_refunded';
    case 'canceled':
      return 'cancelled';
    case 'not_paid':
      return 'unpaid';
    case 'authorized':
    case 'partially_authorized':
    case 'awaiting':
    case 'partially_captured':
    case 'requires_action':
      return 'pending';
    default:
      return 'pending';
  }
};

const deriveOrderStatus = (input: {
  orderStatus?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
}): string => {
  if (input.orderStatus === 'canceled') return 'canceled';
  if (input.paymentStatus === 'refunded' || input.paymentStatus === 'partially_refunded') {
    return 'refunded';
  }
  if (
    input.fulfillmentStatus === 'delivered' ||
    input.fulfillmentStatus === 'partially_delivered'
  ) {
    return 'delivered';
  }
  if (
    input.fulfillmentStatus === 'fulfilled' ||
    input.fulfillmentStatus === 'shipped' ||
    input.fulfillmentStatus === 'partially_shipped' ||
    input.fulfillmentStatus === 'partially_fulfilled'
  ) {
    return 'fulfilled';
  }
  if (input.paymentStatus === 'paid') return 'paid';
  if (input.orderStatus === 'completed') return 'paid';
  return 'pending';
};

const buildSanityAddress = (
  address: any,
  fallback: any,
  email: string | undefined,
): Record<string, string | undefined> | undefined => {
  const first = address?.first_name;
  const last = address?.last_name;
  const name =
    [first, last].filter(Boolean).join(' ').trim() ||
    fallback?.name ||
    undefined;

  const line1 = address?.address_1 || fallback?.address?.line1;
  const line2 = address?.address_2 || fallback?.address?.line2;
  const city = address?.city || fallback?.address?.city;
  const state = address?.province || fallback?.address?.state;
  const postalCode = address?.postal_code || fallback?.address?.postal_code;
  const country = (address?.country_code || fallback?.address?.country || '').toString().toUpperCase();
  const phone = address?.phone || fallback?.phone;

  if (!line1 && !city && !postalCode && !country) return undefined;

  return {
    name,
    phone,
    email,
    addressLine1: line1,
    addressLine2: line2,
    city,
    state,
    postalCode,
    country: country || undefined,
  };
};

const toOptionDetails = (values: Record<string, unknown> | null | undefined): string[] | undefined => {
  if (!values || typeof values !== 'object') return undefined;
  const entries = Object.entries(values)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .filter(Boolean);
  return entries.length ? entries : undefined;
};

const resolveWeightUnit = (unit: string | undefined): 'pound' | 'ounce' | 'gram' | 'kilogram' => {
  switch ((unit || '').toLowerCase()) {
    case 'oz':
      return 'ounce';
    case 'g':
      return 'gram';
    case 'kg':
      return 'kilogram';
    case 'lb':
    default:
      return 'pound';
  }
};

const computeShipmentSnapshot = (items: any[], weightUnit: string | undefined) => {
  let totalWeight = 0;
  let maxL = 0;
  let maxW = 0;
  let maxH = 0;
  let hasAll = true;
  let hasAny = false;

  for (const item of items) {
    const qty = Number(item?.quantity || 0);
    const variant = item?.variant || {};
    const metadata = item?.metadata || {};
    const metaDimensions = metadata?.shipping_dimensions || metadata?.dimensions || {};

    const weight =
      toNumber(variant?.weight) ??
      toNumber(metadata?.shipping_weight ?? metadata?.weight ?? metadata?.shippingWeight);
    const length =
      toNumber(variant?.length) ??
      toNumber(metaDimensions?.length ?? metadata?.length ?? metadata?.shippingLength);
    const width =
      toNumber(variant?.width) ??
      toNumber(metaDimensions?.width ?? metadata?.width ?? metadata?.shippingWidth);
    const height =
      toNumber(variant?.height) ??
      toNumber(metaDimensions?.height ?? metadata?.height ?? metadata?.shippingHeight);

    if ([weight, length, width, height].some((v) => v === undefined)) {
      hasAll = false;
      continue;
    }

    hasAny = true;
    totalWeight += Number(weight) * (Number.isFinite(qty) ? qty : 1);
    maxL = Math.max(maxL, Number(length));
    maxW = Math.max(maxW, Number(width));
    maxH = Math.max(maxH, Number(height));
  }

  if (!hasAny || !hasAll || totalWeight <= 0 || maxL <= 0 || maxW <= 0 || maxH <= 0) {
    return undefined;
  }

  return {
    weight: { value: totalWeight, unit: resolveWeightUnit(weightUnit) },
    dimensions: { length: maxL, width: maxW, height: maxH },
  };
};

/**
 * Sync completed order to Sanity for fulfillment workflow
 */
async function syncOrderToSanity(medusaOrder: any, paymentIntent: any): Promise<string> {
  try {
    const sanityClient = getSanityClient();

    // Check if order already exists (idempotency)
    const existing = await sanityClient.fetch(
      `*[_type == "order" && medusaOrderId == $orderId][0]`,
      { orderId: medusaOrder.id }
    );

    if (existing) {
      console.log(`Order ${medusaOrder.id} already exists in Sanity`);
      const existingOrderNumber = toCanonicalOrderNumber(existing?.orderNumber, medusaOrder?.display_id, medusaOrder?.id) || '';
      return formatOrderNumber(existingOrderNumber) || existingOrderNumber;
    }

    // Extract shipping details from Payment Intent metadata
    const shipping = paymentIntent.shipping || {};
    const metadata = paymentIntent.metadata || {};

    const paymentStatus = normalizePaymentStatus(medusaOrder?.payment_status);
    const fulfillmentStatus = medusaOrder?.fulfillment_status;
    const orderStatus = deriveOrderStatus({
      orderStatus: medusaOrder?.status,
      paymentStatus,
      fulfillmentStatus,
    });

    const customerEmail =
      medusaOrder?.email || metadata?.customer_email || paymentIntent.receipt_email || undefined;

    const shippingAddress = buildSanityAddress(
      medusaOrder?.shipping_address,
      shipping,
      customerEmail,
    );

    const billingAddress = buildSanityAddress(
      medusaOrder?.billing_address,
      shipping,
      customerEmail,
    );

    const cartItems = Array.isArray(medusaOrder?.items)
      ? medusaOrder.items.map((item: any) => {
          const quantity = Number.isFinite(item?.quantity) ? item.quantity : 1;
          const unitPriceCents = toNumber(item?.unit_price) ?? 0;
          const lineTotalCents =
            toNumber(item?.total) ??
            toNumber(item?.subtotal) ??
            unitPriceCents * (Number.isFinite(quantity) ? quantity : 1);
          const optionDetails = toOptionDetails(item?.variant_option_values);
          const metadataRaw =
            item?.metadata && Object.keys(item.metadata).length
              ? JSON.stringify(item.metadata)
              : undefined;

          return {
            _type: 'orderCartItem',
            id: item?.id,
            name: item?.product_title || item?.title,
            productName: item?.product_title || item?.title,
            sku: item?.variant_sku || item?.variant?.sku || item?.sku,
            image: item?.thumbnail || item?.variant?.thumbnail,
            quantity,
            price: toDollars(unitPriceCents),
            total: toDollars(lineTotalCents),
            selectedVariant: item?.variant_title || item?.variant?.title,
            optionDetails,
            productSlug: item?.product_handle,
            productUrl: item?.product_handle ? `/products/${item.product_handle}` : undefined,
            lineTotal: toDollars(lineTotalCents),
            metadata: metadataRaw ? { raw: metadataRaw } : undefined,
          };
        })
      : [];

    const subtotalCents = toNumber(medusaOrder?.subtotal) ?? 0;
    const shippingCents = toNumber(medusaOrder?.shipping_total) ?? 0;
    const taxCents = toNumber(medusaOrder?.tax_total) ?? 0;
    const discountCents = toNumber(medusaOrder?.discount_total) ?? 0;
    const totalCents = toNumber(medusaOrder?.total) ?? 0;

    const shipmentSnapshot = computeShipmentSnapshot(
      Array.isArray(medusaOrder?.items) ? medusaOrder.items : [],
      process.env.SHIPPO_WEIGHT_UNIT,
    );

    const canonicalOrderNumber = toCanonicalOrderNumber(
      medusaOrder?.display_id,
      medusaOrder?.id,
      paymentIntent?.metadata?.order_number,
    );
    if (!canonicalOrderNumber) {
      throw new Error(`Unable to derive canonical order number for Medusa order ${medusaOrder?.id || 'unknown'}`);
    }

    // Ensure order number is properly formatted using centralized utility
    const formattedOrderNumber = formatOrderNumber(canonicalOrderNumber) || canonicalOrderNumber;

    // Create order document in Sanity
    const sanityOrder = await sanityClient.create(
      {
        _type: 'order',
        medusaOrderId: medusaOrder.id,
        medusaCartId: metadata?.medusa_cart_id || medusaOrder?.cart_id,
        orderNumber: formattedOrderNumber,
        status: orderStatus,
        paymentStatus,
        fulfillmentStatus,

        // Customer info
        customerEmail,
        customerName:
          medusaOrder?.shipping_address
            ? `${medusaOrder.shipping_address.first_name || ''} ${
                medusaOrder.shipping_address.last_name || ''
              }`.trim() || shipping?.name
            : shipping?.name,
        customerPhone:
          medusaOrder?.shipping_address?.phone || shipping?.phone || undefined,

        // Shipping info
        shippingAddress,
        billingAddress,

        // Shipping method (from Shippo quote)
        shippingMethod: {
          carrier: metadata?.carrier,
          serviceName: metadata?.service_name,
          shippoRateId: metadata?.shippo_rate_id,
          amountCents: shippingCents,
        },

        carrier: metadata?.carrier,
        service: metadata?.service_name,
        shippoRateId: metadata?.shippo_rate_id,
        shippoRateAmount: toNumber(metadata?.shipping_amount_cents),
        shippoRateCurrency: metadata?.shippo_rate_currency,
        shippoServicelevel: metadata?.service_name,
        shippoCarrier: metadata?.carrier,
        shippoProvider: metadata?.carrier,

        // Order items (primary)
        cart: cartItems,

        // Order items (legacy)
        items: cartItems.map((item: any) => ({
          productId: undefined,
          variantId: undefined,
          title: item.name,
          quantity: item.quantity,
          unitPrice: Math.round((item.price || 0) * 100),
          total: Math.round((item.total || 0) * 100),
        })),

        // Financial
        amountSubtotal: toDollars(subtotalCents),
        amountShipping: toDollars(shippingCents),
        amountTax: toDollars(taxCents),
        amountDiscount: toDollars(discountCents),
        totalAmount: toDollars(totalCents),
        subtotalCents,
        shippingCents,
        totalCents,
        currency: medusaOrder?.currency_code || undefined,

        // Payment
        paymentIntentId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,

        // Fulfillment tracking (updated manually in Sanity)
        labelPurchased: false,
        packingSlipPrinted: false,

        // Shipping snapshot (for manual label purchase)
        ...(shipmentSnapshot?.weight ? { weight: shipmentSnapshot.weight } : {}),
        ...(shipmentSnapshot?.dimensions ? { dimensions: shipmentSnapshot.dimensions } : {}),

        // Timestamps
        createdAt: medusaOrder?.created_at || new Date().toISOString(),
        updatedAt: medusaOrder?.updated_at || new Date().toISOString(),
        paidAt:
          medusaOrder?.paid_at ||
          (paymentIntent?.created
            ? new Date(paymentIntent.created * 1000).toISOString()
            : undefined),
      },
      { autoGenerateArrayKeys: true },
    );

    console.log(`Order synced to Sanity: ${sanityOrder._id}`);
    return formattedOrderNumber;
  } catch (error) {
    console.error('Sanity sync error:', error);
    throw error;
  }
}
