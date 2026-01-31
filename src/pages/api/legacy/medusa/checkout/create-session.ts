import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

type MedusaCartItem = {
  title?: string;
  quantity?: number;
  unit_price?: number;
  raw_unit_price?: { value?: string | number };
};

type MedusaShippingMethod = {
  id: string;
  name?: string;
  amount?: number;
  raw_amount?: { value?: string | number };
  data?: Record<string, any>;
  shipping_option_id?: string;
  provider_id?: string;
};

function getBaseUrl(request: Request): string | null {
  const envBase =
    (import.meta.env.PUBLIC_BASE_URL as string | undefined) ||
    (process.env.PUBLIC_BASE_URL as string | undefined) ||
    (import.meta.env.SITE_URL as string | undefined) ||
    (process.env.SITE_URL as string | undefined) ||
    (import.meta.env.BASE_URL as string | undefined) ||
    (process.env.BASE_URL as string | undefined);
  if (envBase && envBase.trim()) return envBase.trim().replace(/\/+$/, '');

  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || url.host;
  if (!host) return null;
  return `${proto}://${host}`;
}

function toUnitAmount(item: MedusaCartItem): number | null {
  if (typeof item.unit_price === 'number') return Math.round(item.unit_price);
  const raw = item.raw_unit_price?.value;
  const parsed = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function toShippingAmount(method: MedusaShippingMethod): number | null {
  if (typeof method.amount === 'number') return Math.round(method.amount);
  const raw = method.raw_amount?.value;
  const parsed = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

const toString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
};

const resolveServiceName = (value: unknown): string | undefined => {
  if (typeof value === 'string') return toString(value);
  if (value && typeof value === 'object') {
    const name = toString((value as any).name);
    if (name) return name;
    const token = toString((value as any).token);
    if (token) return token;
  }
  return undefined;
};

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse({ error: 'Medusa backend not configured.' }, { status: 503 }, { noIndex: true });
  }

  const stripeSecret =
    (import.meta.env.STRIPE_SECRET_KEY as string | undefined) ||
    (process.env.STRIPE_SECRET_KEY as string | undefined);
  if (!stripeSecret) {
    return jsonResponse({ error: 'Stripe secret key is missing.' }, { status: 500 }, { noIndex: true });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion });

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

  const cartResponse = await medusaFetch(`/store/carts/${cartId}?fields=+shipping_methods.data`, {
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

  const cart = cartData?.cart;
  const currency = (cart?.currency_code || 'usd').toLowerCase();
  const items: MedusaCartItem[] = Array.isArray(cart?.items) ? cart.items : [];
  const shippingMethods: MedusaShippingMethod[] = Array.isArray(cart?.shipping_methods)
    ? cart.shipping_methods
    : [];

  if (!items.length) {
    return jsonResponse({ error: 'Cart has no items.' }, { status: 400 }, { noIndex: true });
  }

  if (!shippingMethods.length) {
    return jsonResponse({ error: 'Shipping method not selected.' }, { status: 400 }, { noIndex: true });
  }

  const shipping = shippingMethods[0];
  const carrier = String(shipping?.data?.carrier || '').toLowerCase();
  if (carrier !== 'ups' && carrier !== 'usps') {
    return jsonResponse(
      { error: 'Shipping carrier must be UPS or USPS.' },
      { status: 400 },
      { noIndex: true }
    );
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of items) {
    const unitAmount = toUnitAmount(item);
    if (unitAmount === null) {
      return jsonResponse({ error: 'Cart item pricing missing.' }, { status: 400 }, { noIndex: true });
    }
    lineItems.push({
      quantity: Math.max(1, Number(item.quantity || 1)),
      price_data: {
        currency,
        unit_amount: unitAmount,
        product_data: {
          name: item.title || 'Item'
        }
      }
    });
  }

  const shippingAmount = toShippingAmount(shipping);
  if (shippingAmount === null) {
    return jsonResponse(
      { error: 'Shipping amount missing from Medusa selection.' },
      { status: 400 },
      { noIndex: true }
    );
  }

  const shippoRateId = toString(shipping?.data?.shippo_rate_id);
  const shippoRateAmount = toString(shipping?.data?.shippo_rate_amount);
  const shippoRateCurrency = toString(shipping?.data?.shippo_rate_currency);
  const shippoService = resolveServiceName(shipping?.data?.shippo_servicelevel);
  const shippingOptionId = toString(shipping?.shipping_option_id);
  const shippingMethodId = toString(shipping?.id);
  const providerId = toString(shipping?.provider_id);

  const rateMetadata: Record<string, string> = {};
  const addMeta = (key: string, value?: string) => {
    if (value) rateMetadata[key] = value;
  };
  addMeta('medusa_cart_id', cartId);
  addMeta('medusa_shipping_method_id', shippingMethodId);
  addMeta('medusa_shipping_option_id', shippingOptionId);
  addMeta('medusa_shipping_option_name', toString(shipping?.name));
  addMeta('shipping_provider', providerId || 'shippo');
  addMeta('provider', providerId || 'shippo');
  addMeta('carrier', carrier || undefined);
  addMeta('shipping_carrier', carrier || undefined);
  addMeta('service', shippoService);
  addMeta('shipping_service', shippoService);
  addMeta('shippo_rate_id', shippoRateId);
  addMeta('shipping_rate_id', shippoRateId);
  addMeta('shippo_rate_amount', shippoRateAmount);
  addMeta('shippo_rate_currency', shippoRateCurrency || currency);

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) {
    return jsonResponse(
      { error: 'Unable to determine base URL for checkout redirects.' },
      { status: 500 },
      { noIndex: true }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shipping.name || (carrier ? carrier.toUpperCase() : 'Shipping'),
          fixed_amount: {
            amount: shippingAmount,
            currency
          },
          metadata: rateMetadata
        }
      }
    ],
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    customer_email: cart?.email || undefined,
    client_reference_id: cartId,
    metadata: {
      medusa_cart_id: cartId,
      medusa_shipping_method_id: shippingMethodId || '',
      medusa_shipping_option_id: shippingOptionId || '',
      carrier,
      shipping_provider: providerId || 'shippo',
      provider: providerId || 'shippo',
      shippo_rate_id: shippoRateId || '',
      shipping_rate_id: shippoRateId || '',
      shippo_rate_amount: shippoRateAmount || '',
      shippo_rate_currency: shippoRateCurrency || currency,
      shipping_service: shippoService || '',
      shipping_carrier: carrier || ''
    }
  });

  if (!session?.url) {
    return jsonResponse({ error: 'Stripe session missing redirect URL.' }, { status: 500 }, { noIndex: true });
  }

  return jsonResponse(
    { url: session.url, id: session.id },
    { status: 200 },
    { noIndex: true }
  );
};
