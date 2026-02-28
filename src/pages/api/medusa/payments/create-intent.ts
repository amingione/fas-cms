import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';
import { normalizeCartTotals, toCentsStrict } from '@/lib/money';

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

function toRoundedNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
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
  const directShippingClass = normalizeShippingClass(item?.shipping_class);
  if (directShippingClass.includes('installonly')) return true;

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

    const shippingClass = normalizeShippingClass(
      (metadata as any)?.shipping_class ?? (metadata as any)?.shippingClass
    );
    if (shippingClass.includes('installonly')) return true;
  }

  return false;
}

function collectUnmappedUpgrades(cart: MedusaCart): Array<{ id: string; label: string }> {
  const rawItems = Array.isArray(cart?.metadata?.local_cart_items)
    ? cart.metadata.local_cart_items
    : [];
  const unresolved: Array<{ id: string; label: string }> = [];

  rawItems.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    const id = String(entry.id ?? '').trim() || 'item';
    const selectedUpgrades = Array.isArray(entry.selectedUpgrades)
      ? entry.selectedUpgrades.filter((value: unknown) => typeof value === 'string')
      : [];
    const detailed = Array.isArray(entry.selectedUpgradesDetailed)
      ? entry.selectedUpgradesDetailed
      : [];

    if (!selectedUpgrades.length && !detailed.length) return;
    if (!detailed.length) {
      selectedUpgrades.forEach((label: string) => unresolved.push({ id, label }));
      return;
    }

    detailed.forEach((detail: any) => {
      if (!detail || typeof detail !== 'object') return;
      const label = String(detail.label ?? '').trim() || 'upgrade';
      const mapped = String(detail.medusaOptionValueId ?? '').trim();
      if (!mapped) unresolved.push({ id, label });
    });
  });

  return unresolved;
}

function collectAddonPriceMismatches(cart: MedusaCart): Array<{
  id: string;
  expectedUnitPrice: number;
  actualUnitPrice: number | null;
  addOnTotal: number;
}> {
  const rawItems = Array.isArray(cart?.metadata?.local_cart_items)
    ? cart.metadata.local_cart_items
    : [];
  const medusaItems = Array.isArray(cart?.items) ? cart.items : [];
  const byLocalId = new Map<string, any>();
  medusaItems.forEach((item) => {
    const localId = item?.metadata?.local_item_id;
    if (typeof localId === 'string' && localId.trim()) byLocalId.set(localId, item);
  });

  const mismatches: Array<{
    id: string;
    expectedUnitPrice: number;
    actualUnitPrice: number | null;
    addOnTotal: number;
  }> = [];

  rawItems.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    const id = String(entry.id ?? '').trim();
    if (!id) return;

    const basePrice = toRoundedNumber(entry.price);
    const detailed = Array.isArray(entry.selectedUpgradesDetailed) ? entry.selectedUpgradesDetailed : [];
    const addOnTotal = detailed.reduce((sum: number, detail: any) => {
      const cents = toRoundedNumber(detail?.priceCents);
      return sum + (cents && cents > 0 ? cents : 0);
    }, 0);
    if (basePrice == null || addOnTotal <= 0) return;

    const expectedUnitPrice = basePrice + addOnTotal;
    const medusaItem = byLocalId.get(id);
    const actualUnitPrice = toRoundedNumber(medusaItem?.unit_price);
    if (actualUnitPrice == null || actualUnitPrice !== expectedUnitPrice) {
      mismatches.push({
        id,
        expectedUnitPrice,
        actualUnitPrice: actualUnitPrice ?? null,
        addOnTotal
      });
    }
  });

  return mismatches;
}

function resolveEffectiveCartTotalCents(cart: MedusaCart): number {
  const medusaTotal = toCentsStrict(cart?.total, 'cart.total');
  const baseTotal = typeof medusaTotal === 'number' ? medusaTotal : 0;
  const mismatches = collectAddonPriceMismatches(cart);
  if (!mismatches.length) return baseTotal;
  const delta = mismatches.reduce((sum, entry) => {
    if (entry.actualUnitPrice == null) return sum + entry.addOnTotal;
    return sum + Math.max(0, entry.expectedUnitPrice - entry.actualUnitPrice);
  }, 0);
  return baseTotal + delta;
}

type ShippoRateInput = {
  rate_id?: string;
  amount?: string;
  currency?: string;
  servicelevel?: string;
  provider?: string;
};

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse(
      { error: 'Medusa backend not configured.' },
      { status: 503 },
      { noIndex: true }
    );
  }

  const stripeSecret =
    (import.meta.env.STRIPE_SECRET_KEY as string | undefined) ||
    (process.env.STRIPE_SECRET_KEY as string | undefined);
  if (!stripeSecret) {
    return jsonResponse(
      { error: 'Stripe secret key is missing.' },
      { status: 500 },
      { noIndex: true }
    );
  }

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

  // Fetch cart from Medusa
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
  const total = resolveEffectiveCartTotalCents(cart);
  if (typeof total !== 'number' || total <= 0) {
    return jsonResponse(
      { error: 'Cart total is invalid or not calculated. Ensure shipping and tax are finalized.' },
      { status: 400 },
      { noIndex: true }
    );
  }

  // Validation 5: upgrades must be mapped to Medusa option values.
  const unresolvedUpgrades = collectUnmappedUpgrades(cart);
  if (unresolvedUpgrades.length > 0) {
    console.warn('[unmapped_addon_selection] payment_intent_blocked', {
      cartId,
      count: unresolvedUpgrades.length,
      itemIds: Array.from(new Set(unresolvedUpgrades.map((entry) => entry.id)))
    });
    return jsonResponse(
      {
        error:
          'One or more selected upgrades are not mapped for checkout. Please update product mappings before payment.',
        details: unresolvedUpgrades
      },
      { status: 400 },
      { noIndex: true }
    );
  }

  // Validation 6: mapped add-on price drift monitoring.
  const addOnPriceMismatches = collectAddonPriceMismatches(cart);
  if (addOnPriceMismatches.length > 0) {
    console.warn('[unmapped_addon_selection] payment_intent_price_mismatch', {
      cartId,
      mismatches: addOnPriceMismatches
    });
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

  try {
    // Create Stripe PaymentIntent with finalized amount (cents).
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
        ...(shippoRate?.amount ? { shipping_amount_cents: String(shippoRate.amount) } : {}),
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
    });

    // Create a Medusa payment collection + system session so cart completion is allowed.
    const paymentCollectionResponse = await medusaFetch(`/store/payment-collections`, {
      method: 'POST',
      body: JSON.stringify({ cart_id: cartId })
    });
    const paymentCollectionData = await readJsonSafe<any>(paymentCollectionResponse);
    if (!paymentCollectionResponse.ok) {
      return jsonResponse(
        { error: paymentCollectionData?.message || 'Failed to create payment collection.' },
        { status: paymentCollectionResponse.status },
        { noIndex: true }
      );
    }

    const paymentCollectionId = paymentCollectionData?.payment_collection?.id;
    if (!paymentCollectionId) {
      return jsonResponse(
        { error: 'Payment collection not returned by Medusa.' },
        { status: 500 },
        { noIndex: true }
      );
    }

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

    const paymentSessionResponse = await medusaFetch(
      `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      {
        method: 'POST',
        body: JSON.stringify({ provider_id: systemProvider.id })
      }
    );
    const paymentSessionData = await readJsonSafe<any>(paymentSessionResponse);
    if (!paymentSessionResponse.ok) {
      return jsonResponse(
        { error: paymentSessionData?.message || 'Failed to create payment session.' },
        { status: paymentSessionResponse.status },
        { noIndex: true }
      );
    }

    return jsonResponse(
      {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (error: any) {
    console.error('[PaymentIntent] Creation failed:', error);
    return jsonResponse(
      {
        error: 'Failed to create payment intent.',
        details: error?.message || String(error),
      },
      { status: 500 },
      { noIndex: true }
    );
  }
};
