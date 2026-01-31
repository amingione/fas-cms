/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'stripe';
import { readSession } from '../../server/auth/session';
import { createOrderCartItem, type OrderCartItem } from '@/server/sanity/order-cart';
import { jsonResponse } from '@/server/http/responses';
import { saveOrderRequestSchema } from '@/lib/validators/api-requests';
import { stripeCheckoutSessionSchema } from '@/lib/validators/stripe';
import { sanityCustomerSchema } from '@/lib/validators/sanity';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

/**
 * FIELD MAPPING CONTRACT
 * Canonical source: .docs/reports/field-to-api-map.md
 */

interface OrderPayload {
  _type: 'order';
  stripeSessionId: string;
  cart: OrderCartItem[];
  totalAmount: number;
  amountSubtotal: number;
  amountTax: number;
  amountShipping: number;
  amountDiscount: number;
  status: 'pending' | 'paid' | 'fulfilled' | 'delivered' | 'canceled' | 'refunded';
  orderType: 'online' | 'retail' | 'wholesale' | 'in-store' | 'phone';
  paymentStatus:
    | 'pending'
    | 'unpaid'
    | 'paid'
    | 'failed'
    | 'refunded'
    | 'partially_refunded'
    | 'cancelled';
  createdAt: string;
  orderNumber: string;
  customerRef?: { _type: 'reference'; _ref: string };
  customerEmail: string;
  customerName: string;
  currency?: string;
  carrier?: string;
  service?: string;
  stripeShippingRateId?: string;
  shippingQuoteId?: string;
  shippingQuoteKey?: string;
  shippingQuoteRequestId?: string;
  deliveryDays?: number;
  estimatedDeliveryDate?: string;
  shippingAddress?: {
    name: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    name: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface SanityCustomerQueryResult {
  result?: { _id?: string } | null;
}

const normalizePaymentStatus = (
  sessionStatus?: string | null
): 'pending' | 'unpaid' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled' => {
  const normalizedSession = (sessionStatus || '').toLowerCase().trim();
  if (normalizedSession === 'paid') return 'paid';
  if (normalizedSession === 'unpaid') return 'unpaid';
  if (normalizedSession === 'no_payment_required') return 'paid';
  return 'pending';
};

const splitShippingDisplayName = (
  displayName?: string | null
): { carrier?: string; service?: string } => {
  const name = (displayName || '').trim();
  if (!name) return {};
  const parts = name
    .split(/[\u2013\u2014-]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      carrier: parts[0],
      service: parts.slice(1).join(' - ')
    };
  }
  return { service: name };
};

const deriveDeliveryEstimate = (
  shippingRate?: Stripe.ShippingRate | null
): { deliveryDays?: number; estimatedDeliveryDate?: string } => {
  const estimate = shippingRate?.delivery_estimate;
  const value = estimate?.maximum?.value ?? estimate?.minimum?.value;
  if (!Number.isFinite(value)) return {};
  const days = Math.max(0, Math.trunc(Number(value)));
  if (!days) return {};
  const base = new Date();
  base.setDate(base.getDate() + days);
  return {
    deliveryDays: days,
    estimatedDeliveryDate: base.toISOString()
  };
};

const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
});

export const POST = async ({ request }: { request: Request }) => {
  try {
    const bodyResult = saveOrderRequestSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'saveOrderRequestSchema',
        context: 'api/save-order',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 }
      );
    }

    const sessionResult = await readSession(request);
    const customerEmail = sessionResult.session?.user?.email;
    if (typeof customerEmail !== 'string') {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 }, { noIndex: true });
    }

    const { sessionId, cart } = bodyResult.data;

    const stripeSession = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details', 'shipping_cost.shipping_rate']
    });
    const stripeSessionResult = stripeCheckoutSessionSchema.safeParse(stripeSession);
    if (!stripeSessionResult.success) {
      console.error('[stripe-validation]', {
        id: stripeSession?.id,
        errors: stripeSessionResult.error.format()
      });
      throw new Error('Invalid Stripe session response');
    }
    const validatedSession = stripeSessionResult.data;

    const shippingCost = (stripeSession as any)?.shipping_cost as
      | Stripe.Checkout.Session.ShippingCost
      | null
      | undefined;
    const shippingRate =
      shippingCost && typeof shippingCost.shipping_rate === 'object'
        ? (shippingCost.shipping_rate as Stripe.ShippingRate)
        : null;
    const shippingRateMetadata =
      shippingRate?.metadata && typeof shippingRate.metadata === 'object'
        ? (shippingRate.metadata as Record<string, string | null | undefined>)
        : {};
    const sessionMetadata = (stripeSession.metadata || {}) as Record<
      string,
      string | null | undefined
    >;
    const extractShippingMeta = (key: string): string | undefined => {
      const candidate = shippingRateMetadata[key] ?? sessionMetadata[key];
      return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
    };
    const shippingRateMeta =
      extractShippingMeta('shippo_rate_id') ??
      extractShippingMeta('shippoRateId') ??
      extractShippingMeta('shipping_rate_id') ??
      extractShippingMeta('shippingRateId');
    const shippoRateId =
      extractShippingMeta('shippo_rate_id') ?? extractShippingMeta('shippoRateId');
    const stripeShippingRateId = shippingRateMeta
      ? shippingRateMeta.startsWith('dyn_')
        ? shippingRateMeta
        : `dyn_${shippingRateMeta}`
      : undefined;
    const { carrier: displayCarrier, service: displayService } = splitShippingDisplayName(
      shippingRate?.display_name
    );
    const carrier =
      extractShippingMeta('shipping_carrier') ?? extractShippingMeta('carrier') ?? displayCarrier;
    const service =
      extractShippingMeta('shipping_service') ?? extractShippingMeta('service') ?? displayService;
    const shippingProvider =
      extractShippingMeta('shipping_provider') ?? extractShippingMeta('provider');
    const derivedEstimate = deriveDeliveryEstimate(shippingRate);
    const deliveryDaysFromMeta = extractShippingMeta('shipping_delivery_days');
    const estimatedDeliveryDate =
      extractShippingMeta('shipping_estimated_delivery_date') ||
      derivedEstimate.estimatedDeliveryDate;
    const deliveryDays =
      deliveryDaysFromMeta && Number.isFinite(Number(deliveryDaysFromMeta))
        ? Number(deliveryDaysFromMeta)
        : derivedEstimate.deliveryDays;
    const shippingQuoteId = extractShippingMeta('shipping_quote_id');
    const shippingQuoteKey = extractShippingMeta('shipping_quote_key');
    const shippingQuoteRequestId = extractShippingMeta('shipping_quote_request_id');
    const shippingDetails =
      (stripeSession as any)?.collected_information?.shipping_details ||
      (stripeSession as any)?.shipping_details ||
      null;
    const customerDetails = validatedSession.customer_details || null;
    const shippingAddress = shippingDetails?.address
      ? {
          name: shippingDetails.name || '',
          phone: customerDetails?.phone || '',
          email: customerDetails?.email || '',
          addressLine1: shippingDetails.address.line1 || '',
          addressLine2: shippingDetails.address.line2 || '',
          city: shippingDetails.address.city || '',
          state: shippingDetails.address.state || '',
          postalCode: shippingDetails.address.postal_code || '',
          country: shippingDetails.address.country || ''
        }
      : undefined;
    const billingAddress = customerDetails?.address
      ? {
          name: customerDetails.name || '',
          phone: customerDetails.phone || '',
          email: customerDetails.email || '',
          addressLine1: customerDetails.address.line1 || '',
          addressLine2: customerDetails.address.line2 || '',
          city: customerDetails.address.city || '',
          state: customerDetails.address.state || '',
          postalCode: customerDetails.address.postal_code || '',
          country: customerDetails.address.country || ''
        }
      : undefined;

    const projectId =
      (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
      (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
      (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined);
    const dataset =
      (import.meta.env.SANITY_DATASET as string | undefined) ||
      (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
      (import.meta.env.VITE_SANITY_DATASET as string | undefined) ||
      'production';
    const tokenSanity =
      (import.meta.env.SANITY_WRITE_TOKEN as string | undefined) ||
      (import.meta.env.SANITY_API_TOKEN as string | undefined) ||
      (import.meta.env.VITE_SANITY_API_TOKEN as string | undefined);

    if (!projectId || !tokenSanity) {
      return jsonResponse({ error: 'Missing Sanity project ID or API token' }, { status: 500 });
    }

    const query = '*[_type == "customer" && email == $email][0]';
    const sanityUrl = new URL(`https://${projectId}.api.sanity.io/v1/data/query/${dataset}`);
    sanityUrl.searchParams.set('query', query);
    sanityUrl.searchParams.set('$email', customerEmail);

    const customerRes = await fetch(sanityUrl.toString(), {
      headers: { Authorization: `Bearer ${tokenSanity}` }
    });

    const customerData: SanityCustomerQueryResult = await customerRes.json();
    let customerId = customerData.result?._id;
    if (customerData.result) {
      const customerResult = sanityCustomerSchema.safeParse(customerData.result);
      if (!customerResult.success) {
        console.warn('[sanity-validation]', {
          _id: (customerData.result as any)?._id,
          _type: 'customer',
          errors: customerResult.error.format()
        });
        customerId = undefined;
      } else {
        customerId = customerResult.data._id;
      }
    }

    const amountSubtotal = validatedSession.amount_subtotal
      ? validatedSession.amount_subtotal / 100
      : 0;
    const amountTax =
      typeof validatedSession.total_details?.amount_tax === 'number'
        ? validatedSession.total_details.amount_tax / 100
        : 0;
    const amountShipping =
      typeof validatedSession.total_details?.amount_shipping === 'number'
        ? validatedSession.total_details.amount_shipping / 100
        : 0;
    const amountDiscount =
      typeof validatedSession.total_details?.amount_discount === 'number'
        ? validatedSession.total_details.amount_discount / 100
        : 0;
    const totalAmount = validatedSession.amount_total ? validatedSession.amount_total / 100 : 0;
    const customerName = validatedSession.customer_details?.name || '';
    const customerEmailValue = validatedSession.customer_details?.email || customerEmail || '';
    const normalizedPaymentStatus = normalizePaymentStatus(validatedSession.payment_status);

    const orderPayload: OrderPayload = {
      _type: 'order',
      stripeSessionId: sessionId,
      cart: cart.map((item) =>
        createOrderCartItem({
          id: item.id,
          sku: item.sku,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          categories: item.categories,
          image: item.image,
          productUrl: item.productUrl,
          productSlug: item.productSlug,
          metadata: item.metadata
        })
      ),
      orderNumber: `FAS-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: normalizedPaymentStatus === 'paid' ? 'paid' : 'pending',
      orderType: 'retail',
      paymentStatus: normalizedPaymentStatus,
      amountSubtotal,
      amountTax,
      amountShipping,
      amountDiscount,
      totalAmount,
      customerEmail: customerEmailValue,
      customerName,
      currency: validatedSession.currency || 'usd',
      carrier,
      service,
      shippingProvider,
      shippoRateId,
      stripeShippingRateId,
      shippingQuoteId,
      shippingQuoteKey,
      shippingQuoteRequestId,
      deliveryDays,
      estimatedDeliveryDate,
      shippingAddress,
      billingAddress
    };

    if (customerId) {
      orderPayload.customerRef = { _type: 'reference', _ref: customerId };
    }

    const sanityRes = await fetch(`https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenSanity}`
      },
      body: JSON.stringify({ mutations: [{ create: orderPayload }] })
    });

    if (!sanityRes.ok) {
      const errorDetails = await sanityRes.text();
      throw new Error(`Sanity response error: ${errorDetails}`);
    }

    return jsonResponse({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Error saving order:', err);
    return jsonResponse({ error: message }, { status: 500 });
  }
};
