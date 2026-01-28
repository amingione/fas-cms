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

  const shippingAmount =
    typeof shipping.amount === 'number'
      ? Math.round(shipping.amount)
      : typeof shipping.raw_amount?.value === 'string'
        ? Math.round(Number(shipping.raw_amount.value))
        : typeof shipping.raw_amount?.value === 'number'
          ? Math.round(shipping.raw_amount.value)
          : null;

  if (shippingAmount !== null && shippingAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: shippingAmount,
        product_data: {
          name: `Shipping (${shipping.name || carrier.toUpperCase()})`
        }
      }
    });
  }

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
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    customer_email: cart?.email || undefined,
    client_reference_id: cartId,
    metadata: {
      medusa_cart_id: cartId,
      medusa_shipping_method_id: shipping.id,
      medusa_shipping_option_id: shipping?.shipping_option_id || '',
      carrier
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
