import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';
import { normalizeCartTotals, toCentsStrict } from '@/lib/money';
import { getAllSecrets } from '@/server/aws-secrets';

/**
 * Phase 1: PaymentIntent Checkout Endpoint
 * 
 * This endpoint replaces Stripe Hosted Checkout Sessions with PaymentIntents.
 * Medusa owns all cart/shipping/tax logic. Stripe is payment processor only.
 * 
 * Flow:
 * 1. Accept cart_id
 * 2. Fetch finalized cart from Medusa
 * 3. Validate cart state (shipping selected, totals locked)
 * 4. Create Stripe PaymentIntent with cart.total
 * 5. Return client_secret for Stripe Elements
 */

type MedusaCart = {
  id: string;
  metadata?: Record<string, any> | null;
  email?: string | null;
  currency_code?: string;
  region_id?: string;
  total?: number;
  subtotal?: number;
  tax_total?: number;
  shipping_total?: number;
  items?: Array<{
    id: string;
    variant_id?: string;
    unit_price?: number;
    title?: string;
    quantity?: number;
    install_only?: boolean | string | number | null;
    shipping_class?: string | null;
    metadata?: Record<string, any> | null;
    variant?: {
      metadata?: Record<string, any> | null;
      product?: {
        metadata?: Record<string, any> | null;
      };
    };
  }>;
  shipping_methods?: Array<{ id: string; name?: string; amount?: number }>;
  payment_collection?: {
    id?: string;
    payment_sessions?: Array<{ id?: string; provider_id?: string }>;
  } | null;
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country_code?: string;
    phone?: string;
  };
};

const GUEST_CART_ID_MIN_LENGTH = 16;

function isLikelyBearerCartId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length >= GUEST_CART_ID_MIN_LENGTH;
}

function toRoundedNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function resolveStripeKeyMode(secretKey: string): 'live' | 'test' | null {
  if (secretKey.startsWith('sk_live_')) return 'live';
  if (secretKey.startsWith('sk_test_')) return 'test';
  return null;
}

type StripeKeySource = 'process.env' | 'aws-secrets' | 'build-env';

type StripeKeys = {
  source: StripeKeySource;
  secretKey: string;
  publishableKey: string;
  mode: 'live' | 'test';
};

function readFromSource(
  sourceName: StripeKeySource,
  source: Record<string, string | undefined>
): { source: StripeKeySource; secretKey: string; publishableKey: string } {
  const secretKey = typeof source.STRIPE_SECRET_KEY === 'string' ? source.STRIPE_SECRET_KEY.trim() : '';
  const publicPublishable =
    typeof source.PUBLIC_STRIPE_PUBLISHABLE_KEY === 'string'
      ? source.PUBLIC_STRIPE_PUBLISHABLE_KEY.trim()
      : '';
  const legacyPublishable =
    typeof source.STRIPE_PUBLISHABLE_KEY === 'string' ? source.STRIPE_PUBLISHABLE_KEY.trim() : '';
  return {
    source: sourceName,
    secretKey,
    publishableKey: publicPublishable || legacyPublishable
  };
}

function keyShape(value: string): string {
  if (!value) return 'missing';
  if (value.startsWith('sk_live_')) return 'sk_live';
  if (value.startsWith('sk_test_')) return 'sk_test';
  if (value.startsWith('pk_live_')) return 'pk_live';
  if (value.startsWith('pk_test_')) return 'pk_test';
  if (value.startsWith('sk_')) return 'sk_unknown';
  if (value.startsWith('pk_')) return 'pk_unknown';
  return 'invalid';
}

async function resolveStripeKeys(): Promise<
  | { ok: true; keys: StripeKeys }
  | { ok: false; status: number; error: string }
> {
  const buildEnv = import.meta.env as Record<string, string | undefined>;
  const awsSecrets = await getAllSecrets();
  const candidates = [
    readFromSource('process.env', process.env as Record<string, string | undefined>),
    readFromSource('aws-secrets', awsSecrets),
    readFromSource('build-env', buildEnv)
  ];

  for (const candidate of candidates) {
    if (!candidate.secretKey || !candidate.publishableKey) continue;
    const mode = resolveStripeKeyMode(candidate.secretKey);
    if (!mode) {
      console.error('[stripe-config] invalid secret key format', {
        source: candidate.source,
        secretShape: keyShape(candidate.secretKey),
        publishableShape: keyShape(candidate.publishableKey)
      });
      return { ok: false, status: 500, error: 'Invalid Stripe secret key format.' };
    }
    const expectedPublishablePrefix = mode === 'live' ? 'pk_live_' : 'pk_test_';
    if (!candidate.publishableKey.startsWith(expectedPublishablePrefix)) {
      console.error('[stripe-config] key mode mismatch in same source', {
        source: candidate.source,
        mode,
        secretShape: keyShape(candidate.secretKey),
        publishableShape: keyShape(candidate.publishableKey)
      });
      return {
        ok: false,
        status: 500,
        error: `Stripe key mode mismatch in ${candidate.source} (expected ${expectedPublishablePrefix}).`
      };
    }
    console.info('[stripe-config] resolved Stripe keys', {
      source: candidate.source,
      mode
    });
    return {
      ok: true,
      keys: {
        source: candidate.source,
        secretKey: candidate.secretKey,
        publishableKey: candidate.publishableKey,
        mode
      }
    };
  }

  console.error('[stripe-config] missing Stripe key pair in all sources', {
    sources: candidates.map((candidate) => ({
      source: candidate.source,
      hasSecret: Boolean(candidate.secretKey),
      hasPublishable: Boolean(candidate.publishableKey),
      secretShape: keyShape(candidate.secretKey),
      publishableShape: keyShape(candidate.publishableKey)
    }))
  });
  return {
    ok: false,
    status: 500,
    error:
      'Missing Stripe key pair. Configure STRIPE_SECRET_KEY and PUBLIC_STRIPE_PUBLISHABLE_KEY in the same environment source.'
  };
}

function parseBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
}

function normalizeShippingClass(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isInstallOnlyItem(item: any): boolean {
  const directInstall = parseBooleanLike(item?.install_only);
  if (directInstall === true) return true;
  const directRequiresShipping =
    parseBooleanLike(item?.requires_shipping) ??
    parseBooleanLike(item?.is_shipping_required);
  if (directRequiresShipping === false) return true;
  const directShippingClass = normalizeShippingClass(item?.shipping_class);
  if (
    directShippingClass.includes('installonly') ||
    directShippingClass.includes('service')
  ) {
    return true;
  }

  const metadataSources = [
    item?.metadata,
    item?.variant?.metadata,
    item?.variant?.product?.metadata
  ].filter((metadata) => metadata && typeof metadata === 'object');

  for (const metadata of metadataSources) {
    const installOnly =
      parseBooleanLike((metadata as any)?.install_only) ??
      parseBooleanLike((metadata as any)?.installOnly);
    if (installOnly === true) return true;
    const requiresShipping =
      parseBooleanLike((metadata as any)?.requires_shipping) ??
      parseBooleanLike((metadata as any)?.requiresShipping);
    if (requiresShipping === false) return true;

    const shippingClass = normalizeShippingClass(
      (metadata as any)?.shipping_class ?? (metadata as any)?.shippingClass
    );
    if (
      shippingClass.includes('installonly') ||
      shippingClass.includes('service')
    ) {
      return true;
    }
  }

  return false;
}

function resolveEffectiveCartTotalCents(cart: MedusaCart): number {
  const medusaTotal = toCentsStrict(cart?.total, 'cart.total');
  const baseTotal = typeof medusaTotal === 'number' ? medusaTotal : 0;
  return baseTotal;
}

type ShippoRateInput = {
  rate_id?: string;
  amount?: string;
  currency?: string;
  servicelevel?: string;
  provider?: string;
};

function resolveShippingAmountCents(
  cart: MedusaCart,
  shippingMethods: Array<{ id: string; name?: string; amount?: number }>
): number {
  const cartShipping = toRoundedNumber(cart?.shipping_total);
  if (typeof cartShipping === 'number' && cartShipping > 0) return cartShipping;

  const methodAmount = shippingMethods.reduce((max, method) => {
    const amount = toRoundedNumber(method?.amount);
    return typeof amount === 'number' && amount > max ? amount : max;
  }, 0);
  return methodAmount > 0 ? methodAmount : 0;
}

async function ensurePaymentCollectionAndSession(
  cart: MedusaCart,
  cartId: string,
  systemProviderId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  let paymentCollectionId = String(cart?.payment_collection?.id || '').trim();
  const existingSessions = Array.isArray(cart?.payment_collection?.payment_sessions)
    ? cart.payment_collection?.payment_sessions
    : [];
  const existingSystemSession = existingSessions?.some(
    (session) => String(session?.provider_id || '').trim() === systemProviderId
  );

  if (!paymentCollectionId) {
    const paymentCollectionResponse = await medusaFetch(`/store/payment-collections`, {
      method: 'POST',
      body: JSON.stringify({ cart_id: cartId })
    });
    const paymentCollectionData = await readJsonSafe<any>(paymentCollectionResponse);
    if (!paymentCollectionResponse.ok) {
      return {
        ok: false,
        status: paymentCollectionResponse.status,
        error: paymentCollectionData?.message || 'Failed to create payment collection.'
      };
    }
    paymentCollectionId = String(paymentCollectionData?.payment_collection?.id || '').trim();
    if (!paymentCollectionId) {
      return { ok: false, status: 500, error: 'Payment collection not returned by Medusa.' };
    }
  }

  if (existingSystemSession) {
    return { ok: true };
  }

  const paymentSessionResponse = await medusaFetch(
    `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    {
      method: 'POST',
      body: JSON.stringify({ provider_id: systemProviderId })
    }
  );
  const paymentSessionData = await readJsonSafe<any>(paymentSessionResponse);
  if (!paymentSessionResponse.ok) {
    return {
      ok: false,
      status: paymentSessionResponse.status,
      error: paymentSessionData?.message || 'Failed to create payment session.'
    };
  }
  return { ok: true };
}

function buildCartIntentFingerprint(
  cart: MedusaCart,
  shippingAmountCents: number,
  taxAmountCents: number
): string {
  const normalizedItems = (Array.isArray(cart?.items) ? cart.items : [])
    .map((item) => {
      const lineId = String(item?.id || '').trim();
      const variantId = String(item?.variant_id || '').trim();
      const localItemId = String(item?.metadata?.local_item_id || '').trim();
      const qty = Math.max(1, toRoundedNumber(item?.quantity) ?? 1);
      const unitPrice = Math.max(0, toRoundedNumber(item?.unit_price) ?? 0);
      return `${lineId}|${variantId}|${localItemId}|${qty}|${unitPrice}`;
    })
    .sort();

  const normalizedShippingMethods = (Array.isArray(cart?.shipping_methods) ? cart.shipping_methods : [])
    .map((method) => {
      const id = String(method?.id || '').trim();
      const amount = Math.max(0, toRoundedNumber(method?.amount) ?? 0);
      return `${id}|${amount}`;
    })
    .sort();

  const payload = JSON.stringify({
    cartId: String(cart?.id || '').trim(),
    currency: String(cart?.currency_code || '').trim().toLowerCase(),
    subtotal: Math.max(0, toRoundedNumber(cart?.subtotal) ?? 0),
    total: Math.max(0, toRoundedNumber(cart?.total) ?? 0),
    shippingAmountCents,
    taxAmountCents,
    items: normalizedItems,
    shippingMethods: normalizedShippingMethods
  });

  return createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse(
      { error: 'Medusa backend not configured.' },
      { status: 503 },
      { noIndex: true }
    );
  }

  const stripeResolution = await resolveStripeKeys();
  if (!stripeResolution.ok) {
    return jsonResponse(
      { error: stripeResolution.error },
      { status: stripeResolution.status },
      { noIndex: true }
    );
  }
  const stripeSecret = stripeResolution.keys.secretKey;
  const publishableKey = stripeResolution.keys.publishableKey;

  const stripe = new Stripe(stripeSecret, {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
  });

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
  // Guest-checkout decision: cart IDs are capability tokens by design in this flow.
  // Guardrail: reject clearly invalid/low-entropy IDs and avoid logging cart IDs in plaintext.
  if (!isLikelyBearerCartId(cartId)) {
    return jsonResponse({ error: 'Invalid cartId.' }, { status: 400 }, { noIndex: true });
  }

  try {
    console.info('[cart-debug] create-intent started', {
      hasCartId: true
    });
    // Fetch authoritative cart state from Medusa. Client payload cannot influence totals.
    const cartResponse = await medusaFetch(`/store/carts/${cartId}`, {
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

    const cart: MedusaCart = cartData?.cart;
    normalizeCartTotals(cart as any);

    // Validation 1: Cart must have items
    const items = Array.isArray(cart?.items) ? cart.items : [];
    if (!items.length) {
      return jsonResponse(
        { error: 'Cart has no items. Cannot create payment intent.' },
        { status: 400 },
        { noIndex: true }
      );
    }

    const requiresShipping = items.some((item) => !isInstallOnlyItem(item));

    // Validation 2: Shipping method must be selected when shipping is required.
    const shippingMethods = Array.isArray(cart?.shipping_methods) ? cart.shipping_methods : [];
    if (requiresShipping && !shippingMethods.length) {
      return jsonResponse(
        { error: 'Shipping method not selected. Complete shipping selection before payment.' },
        { status: 400 },
        { noIndex: true }
      );
    }

    // Validation 3: Shipping address must exist when shipping is required.
    if (requiresShipping && !cart?.shipping_address?.country_code) {
      return jsonResponse(
        { error: 'Shipping address required for tax calculation.' },
        { status: 400 },
        { noIndex: true }
      );
    }

    // Validation 4: Total must be finalized (with local add-on surcharge reconciliation)
    const medusaTotal = resolveEffectiveCartTotalCents(cart);
    if (typeof medusaTotal !== 'number' || medusaTotal <= 0) {
      return jsonResponse(
        { error: 'Cart total is invalid or not calculated. Ensure shipping and tax are finalized.' },
        { status: 400 },
        { noIndex: true }
      );
    }

    const currency = (cart?.currency_code || 'usd').toLowerCase();
    const customerEmail = cart?.email || undefined;
    const shippingName =
      `${cart?.shipping_address?.first_name || ''} ${cart?.shipping_address?.last_name || ''}`.trim() ||
      customerEmail ||
      'Customer';

    let shippoRate: ShippoRateInput | null = null;
    if (body?.shippoRate && typeof body.shippoRate === 'object') {
      shippoRate = body.shippoRate as ShippoRateInput;
    }

    const medusaTaxCents = toRoundedNumber(cart?.tax_total) ?? 0;
    const shippingAmountCents = resolveShippingAmountCents(cart, shippingMethods);
    const total = medusaTotal;
    const subtotalCents = toRoundedNumber(cart?.subtotal) ?? 0;
    const effectiveTaxCents = Math.max(0, medusaTaxCents);
    console.info('[cart-debug] create-intent authoritative totals', {
      subtotalCents,
      shippingAmountCents,
      medusaTaxCents,
      total
    });

    // Create Stripe PaymentIntent with finalized amount (cents).
    const cartFingerprint = buildCartIntentFingerprint(cart, shippingAmountCents, effectiveTaxCents);
    const idempotencyKey = `pi:${cartId}:${currency}:${total}:${cartFingerprint}`;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        medusa_cart_id: cartId,
        customer_email: customerEmail || '',
        subtotal: String(cart?.subtotal ?? 0),
        tax_total: String(cart?.tax_total ?? 0),
        shipping_total: String(cart?.shipping_total ?? 0),
        item_count: String(items.length),
        requires_shipping: String(requiresShipping),
        ...(shippoRate?.rate_id ? { shippo_rate_id: shippoRate.rate_id } : {}),
        shipping_amount_cents: String(shippingAmountCents),
        ...(shippoRate?.currency ? { shippo_rate_currency: String(shippoRate.currency) } : {}),
        ...(shippoRate?.servicelevel ? { service_name: String(shippoRate.servicelevel) } : {}),
        ...(shippoRate?.provider ? { carrier: String(shippoRate.provider) } : {})
      },
      shipping: requiresShipping && cart?.shipping_address
        ? {
            name: shippingName,
            phone: cart.shipping_address.phone || undefined,
            address: {
              line1: cart.shipping_address.address_1,
              line2: cart.shipping_address.address_2 || undefined,
              city: cart.shipping_address.city,
              state: cart.shipping_address.province,
              postal_code: cart.shipping_address.postal_code,
              country: cart.shipping_address.country_code?.toUpperCase()
            }
          }
        : undefined
    }, { idempotencyKey });

    const regionId = (cart?.region_id || config.regionId || '').trim();
    const providersPath = regionId
      ? `/store/payment-providers?region_id=${encodeURIComponent(regionId)}`
      : '/store/payment-providers';
    const providersResponse = await medusaFetch(providersPath, { method: 'GET' });
    const providersData = await readJsonSafe<any>(providersResponse);
    if (!providersResponse.ok) {
      return jsonResponse(
        { error: providersData?.message || 'Failed to load payment providers.' },
        { status: providersResponse.status },
        { noIndex: true }
      );
    }

    const providers = Array.isArray(providersData?.payment_providers)
      ? providersData.payment_providers
      : [];
    const systemProvider = providers.find((provider: any) =>
      String(provider?.id || '').includes('system')
    );
    if (!systemProvider?.id) {
      return jsonResponse(
        { error: 'System payment provider unavailable in Medusa.' },
        { status: 500 },
        { noIndex: true }
      );
    }

    const paymentSetup = await ensurePaymentCollectionAndSession(cart, cartId, systemProvider.id);
    if (!paymentSetup.ok) {
      return jsonResponse(
        { error: paymentSetup.error },
        { status: paymentSetup.status },
        { noIndex: true }
      );
    }

    return jsonResponse(
      {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        breakdown: {
          subtotal_cents: subtotalCents,
          shipping_amount_cents: shippingAmountCents,
          tax_amount_cents: effectiveTaxCents,
          total_cents: total
        },
        publishable_key: publishableKey
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (error: any) {
    console.error('[PaymentIntent] Creation failed:', error);
    return jsonResponse(
      {
        error: 'Failed to create payment intent.',
        details: 'internal_error',
      },
      { status: 500 },
      { noIndex: true }
    );
  }
};
