import Stripe from 'stripe';
import { randomUUID, createHash } from 'crypto';
import { readSession } from '../../server/auth/session';
import { sanity } from '../../server/sanity-client';
import { getActivePrice, getCompareAtPrice, isOnSale } from '@/lib/saleHelpers';
import { formatOptionSummary } from '@/lib/cart/format-option-summary';
import { checkoutRequestSchema } from '@/lib/validators/api-requests';
import { sanityProductSchema } from '@/lib/validators/sanity';
import { resolveAllowedCountries } from '@/lib/shipping-countries';

const stripeApiVersion =
  (import.meta.env.STRIPE_API_VERSION as string | undefined) || '2025-08-27.basil';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: stripeApiVersion as Stripe.LatestApiVersion
});

const configuredBaseUrl = import.meta.env.PUBLIC_BASE_URL || '';
const STRIPE_CHECKOUT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com; frame-src https://*.stripe.com; connect-src 'self' https://*.stripe.com https://api.stripe.com; img-src 'self' https://*.stripe.com data:; font-src 'self' https://*.stripe.com https://r2cdn.perplexity.ai data:;";

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Security-Policy': STRIPE_CHECKOUT_CSP
    }
  });

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    return url.origin;
  } catch {
    return baseUrl.replace(/\/+$/, '');
  }
}

function validateBaseUrl(baseUrl: string): Response | null {
  if (!baseUrl || !baseUrl.startsWith('http')) {
    console.error('❌ Invalid PUBLIC_BASE_URL:', baseUrl);
    return jsonResponse(
      { error: 'PUBLIC_BASE_URL is missing or invalid. Must start with http or https.' },
      500
    );
  }
  return null;
}

function hostKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    const match = url.replace(/^https?:\/\//i, '').split('/')[0];
    return match ? match.replace(/^www\./i, '').toLowerCase() : null;
  }
}

type CartSelection = {
  group?: string;
  value?: string;
  label?: string;
  priceDelta?: number;
};

type CheckoutCartItem = {
  id?: string;
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  productUrl?: string;
  installOnly?: boolean;
  shippingClass?: string;
  options?: Record<string, string>;
  selections?: CartSelection[] | Record<string, unknown>;
  selectedOptions?: string[];
  selectedUpgrades?: string[];
  basePrice?: number;
  extra?: number;
  upgrades?: unknown;
  addOns?: unknown;
  signature?: string;
};

type ShippingDimensions = { length: number; width: number; height: number };
type ShippingProduct = {
  _id: string;
  title?: string;
  sku?: string;
  price?: number | null;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  discountPercentage?: number | null;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  saleLabel?: string | null;
  saleActive?: boolean | null;
  shippingWeight?: number | null;
  boxDimensions?: string | null;
  shippingClass?: string | null;
  shipsAlone?: boolean | null;
  shippingConfig?: {
    weight?: number | null;
    dimensions?: { length?: number | null; width?: number | null; height?: number | null } | null;
    shippingClass?: string | null;
    requiresShipping?: boolean | null;
    separateShipment?: boolean | null;
  } | null;
};

type ShippingDestination = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type ShippingQuoteRate = {
  rateId?: string;
  carrier?: string;
  carrierId?: string;
  carrierCode?: string;
  service?: string;
  serviceCode?: string;
  amount?: number;
  currency?: string;
  deliveryDays?: number | null;
  estimatedDeliveryDate?: string | null;
  accurateDeliveryDate?: string | null;
  timeInTransit?: Record<string, unknown> | null;
  deliveryConfidence?: number | null;
  deliveryDateGuaranteed?: boolean;
};

type ShippingQuoteResponse = {
  success: boolean;
  installOnly?: boolean;
  freight?: boolean;
  message?: string;
  rates?: ShippingQuoteRate[];
  bestRate?: ShippingQuoteRate | null;
  shippingQuoteId?: string | null;
  easyPostShipmentId?: string | null;
  quoteKey?: string | null;
  quoteRequestId?: string | null;
};

type ShippingQuoteCartItem = {
  sku?: string;
  productId?: string;
  quantity: number;
};

type ShippingQuoteRequestPayload = {
  cart: ShippingQuoteCartItem[];
  destination: ShippingDestination;
  quoteKey: string;
  quoteRequestId: string;
};

type QuoteMetadataContext = {
  quoteKey: string;
  quoteRequestId: string;
  shippingQuoteId?: string | null;
  easyPostShipmentId?: string | null;
};

async function fetchShippingProductsForCart(
  cart: CheckoutCartItem[]
): Promise<Record<string, ShippingProduct>> {
  const ids = Array.from(
    new Set(
      cart
        .map((item) => normalizeCartId(typeof item?.id === 'string' ? item.id : undefined))
        .filter(Boolean)
    )
  );
  const skus = Array.from(
    new Set(cart.map((item) => (item?.sku ? String(item.sku).trim() : '')).filter(Boolean))
  );
  if (!ids.length && !skus.length) return {};
  try {
    const conditions: string[] = [];
    if (ids.length) conditions.push('_id in $ids');
    if (skus.length) conditions.push('sku in $skus');
    const conditionBlock = conditions.length ? conditions.join(' || ') : 'false';
    const query = `*[_type == "product" && !(_id in path('drafts.**')) && status == "active" && (productType == "service" || productType == "bundle" || productType == "physical" || featured == true) && (${conditionBlock})]{
      _id,
      title,
      sku,
      "price": coalesce(price, pricing.price),
      "onSale": coalesce(onSale, pricing.onSale),
      "salePrice": coalesce(salePrice, pricing.salePrice),
      "compareAtPrice": coalesce(compareAtPrice, pricing.compareAtPrice),
      "discountPercent": coalesce(discountPercent, discountPercentage, pricing.discountPercentage),
      "discountPercentage": coalesce(discountPercentage, discountPercent, pricing.discountPercentage),
      "saleStartDate": coalesce(saleStartDate, pricing.saleStartDate),
      "saleEndDate": coalesce(saleEndDate, pricing.saleEndDate),
      "saleLabel": coalesce(saleLabel, pricing.saleLabel),
      "saleActive": pricing.saleActive,
      shippingWeight,
      boxDimensions,
      shippingClass,
      shipsAlone,
      shippingConfig{
        weight,
        dimensions{
          length,
          width,
          height
        },
        shippingClass,
        requiresShipping,
        separateShipment
      }
    }`;
    const products = await sanity.fetch<ShippingProduct[]>(query, { ids, skus });
    const lookup: Record<string, ShippingProduct> = {};
    if (Array.isArray(products)) {
      products.forEach((product) => {
        const productResult = sanityProductSchema.partial().safeParse(product);
        if (!productResult.success) {
          console.warn('[sanity-validation]', {
            _id: (product as any)?._id,
            _type: 'product',
            errors: productResult.error.format()
          });
          return;
        }
        if (productResult.data?._id)
          lookup[productResult.data._id] = productResult.data as ShippingProduct;
      });
    }
    return lookup;
  } catch (error) {
    console.warn('[checkout] Failed to fetch shipping products', error);
    return {};
  }
}

const SANITY_QUOTE_FN_PATH = '/.netlify/functions/getShippingQuoteBySkus';
const FLAT_FALLBACK_AMOUNT_CENTS = 1500;
const FLAT_FALLBACK_DISPLAY_NAME = 'Temporary Shipping Rate (Flat Fallback)';

const makeDeliveryEstimate = (
  min: number,
  max: number
): Stripe.Checkout.SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate => ({
  minimum: { unit: 'business_day', value: Math.max(1, Math.round(min)) },
  maximum: { unit: 'business_day', value: Math.max(1, Math.round(max)) }
});

const normalizeCartId = (rawId?: string | null): string => {
  if (!rawId) return '';
  const trimmed = String(rawId).trim();
  if (!trimmed) return '';
  const [id] = trimmed.split('::');
  return id || trimmed;
};

const toMetadataString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    const serialized = JSON.stringify(value);
    return serialized;
  } catch {
    return undefined;
  }
};

function resolveSanityFunctionsBaseUrl(): string {
  const rawUrl =
    (import.meta.env.SANITY_FUNCTIONS_BASE_URL as string | undefined) ||
    (import.meta.env.PUBLIC_SANITY_FUNCTIONS_BASE_URL as string | undefined) ||
    process.env.SANITY_FUNCTIONS_BASE_URL ||
    process.env.PUBLIC_SANITY_FUNCTIONS_BASE_URL ||
    '';
  const normalized = normalizeBaseUrl(rawUrl);
  if (!normalized || !normalized.startsWith('http')) {
    throw new Error('Missing or invalid SANITY_FUNCTIONS_BASE_URL');
  }
  return normalized;
}

const normalizeQuoteDestination = (destination: ShippingDestination): ShippingDestination => ({
  addressLine1: destination.addressLine1.trim(),
  addressLine2: destination.addressLine2?.trim() || undefined,
  city: destination.city.trim(),
  state: destination.state.trim(),
  postalCode: destination.postalCode.trim(),
  country: destination.country.trim().toUpperCase()
});

const normalizeQuoteCartItems = (cart: CheckoutCartItem[]): ShippingQuoteCartItem[] =>
  cart
    .map((item) => {
      const quantity =
        typeof item.quantity === 'number' && Number.isFinite(item.quantity)
          ? Math.max(1, Math.floor(item.quantity))
          : 1;
      const sku = typeof item.sku === 'string' && item.sku.trim() ? item.sku.trim() : undefined;
      const productId = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : undefined;
      return { sku, productId, quantity };
    })
    .filter((item) => item.quantity > 0);

const buildQuoteKey = (
  cartItems: ShippingQuoteCartItem[],
  destination: ShippingDestination
): string => {
  const normalizedItems = cartItems
    .map((item) => ({
      identifier:
        (item.sku && item.sku.trim()) || (item.productId && item.productId.trim()) || 'custom_item',
      quantity: item.quantity
    }))
    .sort((a, b) => a.identifier.localeCompare(b.identifier));
  const canonical = {
    items: normalizedItems,
    destination: {
      addressLine1: destination.addressLine1.trim().toLowerCase(),
      city: destination.city.trim().toLowerCase(),
      state: destination.state.trim().toUpperCase(),
      postalCode: destination.postalCode.replace(/\s+/g, '').toUpperCase(),
      country: destination.country.trim().toUpperCase()
    }
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};

async function fetchLiveShippingQuote(
  payload: ShippingQuoteRequestPayload
): Promise<ShippingQuoteResponse> {
  const baseUrl = resolveSanityFunctionsBaseUrl();
  const quoteUrl = `${baseUrl}${SANITY_QUOTE_FN_PATH}`;
  const response = await fetch(quoteUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart: payload.cart,
      destination: payload.destination,
      quoteKey: payload.quoteKey,
      quoteRequestId: payload.quoteRequestId
    })
  });

  let payloadBody: any = {};
  try {
    payloadBody = await response.json();
  } catch (error) {
    throw new Error('Failed to parse shipping quote response');
  }

  if (!response.ok || !payloadBody?.success) {
    const message =
      payloadBody?.error ||
      payloadBody?.message ||
      'Unable to fetch shipping rates from the carrier provider';
    throw new Error(message);
  }

  return payloadBody as ShippingQuoteResponse;
}

const buildShippingOptionsFromRates = (
  rates: ShippingQuoteRate[],
  context: QuoteMetadataContext
): Stripe.Checkout.SessionCreateParams.ShippingOption[] => {
  return rates
    .filter((rate) => typeof rate.amount === 'number' && Number.isFinite(rate.amount))
    .map((rate) => {
      const amountCents = Math.max(0, Math.round((rate.amount || 0) * 100));
      const currency = rate.currency ? rate.currency.toLowerCase() : 'usd';
      const prefix = [rate.carrier, rate.service].filter(Boolean).join(' ').trim() || 'Shipping';
      const deliveryEstimate =
        typeof rate.deliveryDays === 'number' && Number.isFinite(rate.deliveryDays)
          ? makeDeliveryEstimate(Math.max(1, rate.deliveryDays), Math.max(1, rate.deliveryDays + 2))
          : undefined;
      const metadata: Record<string, string> = {};
      const pushMeta = (key: string, value?: unknown) => {
        const converted = toMetadataString(value);
        if (converted) metadata[key] = converted;
      };
      pushMeta('shipping_quote_key', context.quoteKey);
      pushMeta('shipping_quote_request_id', context.quoteRequestId);
      pushMeta('shipping_quote_id', context.shippingQuoteId);
      pushMeta('easy_post_shipment_id', context.easyPostShipmentId);
      pushMeta('selected_rate_id', rate.rateId);
      pushMeta('shipping_carrier', rate.carrier);
      pushMeta('shipping_service', rate.service);
      pushMeta('shipping_amount', (amountCents / 100).toFixed(2));

      return {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: amountCents, currency },
          display_name: prefix,
          ...(deliveryEstimate ? { delivery_estimate: deliveryEstimate } : {}),
          metadata
        }
      };
    });
};

export async function POST({ request }: { request: Request }) {
  // Resolve base URL: prefer explicit env var, else Origin header during dev/preview
  const origin = request.headers.get('origin') || '';
  const xfProto = request.headers.get('x-forwarded-proto') || '';
  const xfHost = request.headers.get('x-forwarded-host') || '';
  const forwarded = xfProto && xfHost ? `${xfProto}://${xfHost}` : '';
  const normalizedConfigured = normalizeBaseUrl(configuredBaseUrl);
  const normalizedRequest = normalizeBaseUrl(forwarded || origin);

  let baseUrl = normalizedRequest || normalizedConfigured;
  const configKey = hostKey(normalizedConfigured);
  const requestKey = hostKey(normalizedRequest);
  if (normalizedConfigured && configKey && requestKey && configKey === requestKey) {
    baseUrl = normalizedConfigured;
  } else if (!baseUrl && normalizedConfigured) {
    baseUrl = normalizedConfigured;
  }

  const validationTarget = baseUrl || normalizedConfigured || normalizedRequest;
  if (!validationTarget) {
    return jsonResponse(
      { error: 'Unable to determine site base URL for checkout redirects.' },
      500
    );
  }
  const validationError = validateBaseUrl(validationTarget);
  if (validationError) return validationError;

  baseUrl = normalizeBaseUrl(validationTarget);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Missing or invalid JSON body' }, 400);
  }

  const bodyResult = checkoutRequestSchema.safeParse(body);
  if (!bodyResult.success) {
    console.error('[validation-failure]', {
      schema: 'checkoutRequestSchema',
      context: 'api/checkout',
      identifier: 'unknown',
      timestamp: new Date().toISOString(),
      errors: bodyResult.error.format()
    });
    return jsonResponse({ error: 'Validation failed', details: bodyResult.error.format() }, 422);
  }

  const { cart, shippingDestination } = bodyResult.data;
  const clamp = (value: string, max = 500) => (value.length > max ? value.slice(0, max) : value);

  const formatSelectedOptions = (
    input?: Record<string, unknown> | null,
    selectionsRaw?: unknown
  ) => {
    type EntryMap = Map<string, Set<string>>;
    const entriesMap: EntryMap = new Map();
    const addValue = (key: unknown, value: unknown) => {
      const rawKey = key != null ? String(key) : '';
      const rawValue = value != null ? String(value) : '';
      const keyTrimmed = rawKey.trim();
      const valueTrimmed = rawValue.trim();
      if (!keyTrimmed || !valueTrimmed) return;
      const normalizedKey = keyTrimmed.replace(/\s+/g, ' ');
      const bucket = entriesMap.get(normalizedKey) ?? new Set<string>();
      bucket.add(valueTrimmed);
      entriesMap.set(normalizedKey, bucket);
    };

    if (input && typeof input === 'object') {
      Object.entries(input).forEach(([key, value]) => {
        if (value == null || value === '') return;
        if (Array.isArray(value)) {
          value.forEach((entry) => addValue(key, entry));
        } else if (typeof value === 'object') {
          Object.values(value as Record<string, unknown>).forEach((entry) => addValue(key, entry));
        } else {
          addValue(key, value);
        }
      });
    }

    const selectionsArray = Array.isArray(selectionsRaw)
      ? selectionsRaw
      : selectionsRaw && typeof selectionsRaw === 'object'
        ? Array.isArray((selectionsRaw as any)?.selections)
          ? (selectionsRaw as any).selections
          : Object.entries(selectionsRaw as Record<string, unknown>).flatMap(([key, value]) =>
              Array.isArray(value) ? value.map((entry) => ({ group: key, label: entry })) : []
            )
        : [];

    selectionsArray.forEach((entry: any) => {
      if (!entry || typeof entry !== 'object') return;
      const group =
        entry.group ??
        entry.name ??
        (typeof entry.key === 'string' ? entry.key : undefined) ??
        'Option';
      const label = entry.label ?? entry.value ?? '';
      addValue(group, label);
    });

    if (!entriesMap.size) return null;

    const entries: Array<[string, string]> = Array.from(entriesMap.entries()).map(
      ([key, valueSet]) => [key, Array.from(valueSet).join(', ')]
    );
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) return null;
    const summary = entries.map(([key, value]) => `${key}: ${value}`).join(' • ');
    const json = JSON.stringify(Object.fromEntries(entries));
    return { entries, summary, json };
  };

  const collectUpgrades = (raw: unknown, selectionSource?: unknown): string[] => {
    const values: string[] = [];
    const push = (val?: string | null) => {
      if (!val) return;
      const trimmed = val.trim();
      if (trimmed) values.push(trimmed);
    };
    if (Array.isArray(raw)) {
      raw.forEach((entry) => {
        if (typeof entry === 'string') push(entry);
        else if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>;
          push(
            (obj.label as string | undefined) ||
              (obj.name as string | undefined) ||
              (obj.title as string | undefined) ||
              (obj.value as string | undefined)
          );
        }
      });
    } else if (raw && typeof raw === 'object') {
      Object.values(raw).forEach((entry) => {
        if (typeof entry === 'string') push(entry);
      });
    } else if (typeof raw === 'string') {
      push(raw);
    }

    const fromSelections = Array.isArray(selectionSource)
      ? selectionSource
      : Array.isArray((selectionSource as any)?.selections)
        ? (selectionSource as any).selections
        : [];

    const upgradeRegex = /(upgrade|add[\s_-]*on|addon|extra|package|kit)/i;
    fromSelections.forEach((entry: any) => {
      if (!entry || typeof entry !== 'object') return;
      const group = String(entry.group || entry.name || '');
      const label = entry.label || entry.value;
      if (typeof label !== 'string' || !label.trim()) return;
      const delta =
        typeof entry.priceDelta === 'number'
          ? entry.priceDelta
          : typeof entry.delta === 'number'
            ? entry.delta
            : undefined;
      if (upgradeRegex.test(group) || (typeof delta === 'number' && delta > 0)) {
        push(label);
      }
    });

    return Array.from(new Set(values));
  };

  const calculateUpgradesTotal = (raw: unknown, selectionSource?: unknown): number | undefined => {
    let total = 0;
    const seen = new Set<string>();
    const addAmount = (amount: unknown, key?: string) => {
      const num = Number(amount);
      if (!Number.isFinite(num) || num <= 0) return;
      const dedupeKey = key ? key.trim().toLowerCase() : undefined;
      if (dedupeKey) {
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
      }
      total += num;
    };

    const readEntry = (entry: any, idx: number) => {
      if (!entry || typeof entry !== 'object') return;
      const amount = (entry as any).priceDelta ?? (entry as any).delta ?? (entry as any).price;
      const key =
        (entry as any).id ||
        (entry as any).key ||
        (entry as any).value ||
        (entry as any).label ||
        `${idx}`;
      addAmount(amount, String(key));
    };

    if (Array.isArray(raw)) {
      raw.forEach((entry, idx) => readEntry(entry, idx));
    } else if (raw && typeof raw === 'object') {
      Object.values(raw).forEach((entry, idx) => readEntry(entry, idx));
    }

    const selectionArray = Array.isArray(selectionSource)
      ? selectionSource
      : Array.isArray((selectionSource as any)?.selections)
        ? (selectionSource as any).selections
        : [];

    selectionArray.forEach((entry: any, idx: number) => {
      if (!entry || typeof entry !== 'object') return;
      const amount = (entry as any).priceDelta ?? (entry as any).delta ?? undefined;
      const key = entry.id || entry.key || entry.value || entry.label || `sel-upgrade-${idx}`;
      addAmount(amount, String(key));
    });

    return total > 0 ? Math.round(total * 100) / 100 : undefined;
  };

  const productLookup = await fetchShippingProductsForCart(cart as CheckoutCartItem[]);

  const cleanLabel = (value?: string | null): string => {
    if (!value) return '';
    return value
      .replace(/^option\s*\d*\s*:?/i, '')
      .replace(/^(type|upgrade|add[-\s]?on)s?\s*:?/i, '')
      .trim();
  };

  const toMetadataValue = (value: unknown): string | null => {
    if (value == null) return null;
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]' || trimmed === '{}') return null;
    return trimmed;
  };

  const lineItems = (cart as CheckoutCartItem[]).map((item) => {
    const rawId = typeof item.id === 'string' ? item.id : undefined;
    const sanityProductId = normalizeCartId(rawId);
    const product = sanityProductId ? productLookup[sanityProductId] : undefined;
    const verifiedPrice = getActivePrice(product as any);
    const compareAt = product ? getCompareAtPrice(product as any) : undefined;
    const basePrice = Number.isFinite(item.basePrice)
      ? Number(item.basePrice)
      : Number.isFinite(verifiedPrice)
        ? Number(verifiedPrice)
        : Number.isFinite(item.price)
          ? Number(item.price)
          : 0;
    const upgradesTotal = calculateUpgradesTotal(item.upgrades ?? item.addOns, item.selections);
    const addOnTotal =
      typeof upgradesTotal === 'number'
        ? upgradesTotal
        : Array.isArray(item.addOns)
          ? item.addOns.reduce((total, addOn) => {
              const price = Number((addOn as any)?.price);
              return Number.isFinite(price) ? total + price : total;
            }, 0)
          : 0;
    const discountTotal = Number.isFinite((item as any)?.discount)
      ? Number((item as any).discount)
      : 0;
    const finalPrice = basePrice + addOnTotal - discountTotal;
    const unitAmount = Math.max(0, Math.round(finalPrice * 100));
    if (unitAmount <= 0) {
      console.warn('[checkout] Cart item missing price, defaulting to $0.00', item);
    }
    const quantity = Math.max(1, Number.isFinite(item.quantity) ? Number(item.quantity) : 1);
    const optionDetails = formatSelectedOptions(
      item.options as Record<string, unknown> | null,
      item.selections
    );
    const upgradeValuesRaw = collectUpgrades(item.upgrades ?? item.addOns, item.selections);
    const upgradeValues = upgradeValuesRaw.map((entry) => cleanLabel(entry)).filter(Boolean);
    const productSku = typeof product?.sku === 'string' ? product.sku.trim() : '';
    const itemSku = typeof item.sku === 'string' ? item.sku.trim() : '';
    const skuValue =
      productSku || (itemSku && itemSku !== sanityProductId && itemSku !== rawId ? itemSku : '');
    const metadata: Record<string, string> = {
      ...(skuValue ? { sku: skuValue } : {}),
      ...(sanityProductId ? { sanity_product_id: sanityProductId } : {}),
      ...(product?._id ? { sanity_product_id_actual: product._id } : {})
    };
    const optionsValue = toMetadataValue(item.options ?? item.selections ?? null);
    if (optionsValue) {
      metadata.options = clamp(optionsValue, 500);
    }
    const upgradesValue = toMetadataValue(item.upgrades ?? item.addOns ?? null);
    if (upgradesValue) {
      metadata.upgrades = clamp(upgradesValue, 500);
    }
    if (item?.name) metadata.product_name = clamp(String(item.name), 200);
    if (item?.productUrl) metadata.product_url = clamp(String(item.productUrl), 300);
    if (item?.image) metadata.product_image = clamp(String(item.image), 400);
    const metaUnitPrice = Number(
      Number.isFinite(finalPrice) ? finalPrice : (item.price ?? unitAmount / 100)
    );
    if (Number.isFinite(metaUnitPrice)) {
      metadata.unit_price = metaUnitPrice.toFixed(2);
    }
    metadata.quantity = String(quantity);
    if (item?.signature) metadata.configuration_signature = clamp(String(item.signature), 120);
    if (product) {
      metadata.product_name = metadata.product_name || clamp(String(product.title || ''), 200);
      const originalPrice =
        typeof product.price === 'number' && Number.isFinite(product.price)
          ? product.price
          : undefined;
      if (typeof originalPrice === 'number') {
        metadata.original_price = Number(originalPrice).toFixed(2);
      }
      if (typeof compareAt === 'number') {
        metadata.compare_at_price = Number(compareAt).toFixed(2);
      }
      metadata.is_on_sale = isOnSale(product as any) ? 'true' : 'false';
      if (product.saleLabel) metadata.sale_label = clamp(String(product.saleLabel), 120);
    }

    if (optionDetails?.summary) {
      metadata.selected_options = clamp(optionDetails.summary);
    }
    if (optionDetails?.json) {
      metadata.selected_options_json = clamp(optionDetails.json);
    }
    if (optionDetails?.entries?.length) {
      optionDetails.entries.forEach(([label, value], idx) => {
        const index = idx + 1;
        metadata[`option${index}_name`] = clamp(label, 100);
        metadata[`option${index}_value`] = clamp(value, 200);
      });
      const vehicleEntry = optionDetails.entries.find(([label]) => /vehicle|platform/i.test(label));
      if (vehicleEntry && !metadata.option_vehicle) {
        metadata.option_vehicle = clamp(vehicleEntry[1], 200);
      }
    }
    if (upgradeValues.length) {
      metadata.upgrades_summary = clamp(upgradeValues.join(', '));
      upgradeValues.forEach((value, idx) => {
        metadata[`upgrade_${idx + 1}`] = clamp(value, 200);
      });
    }
    if (typeof upgradesTotal === 'number') {
      metadata.upgrades_total = upgradesTotal.toFixed(2);
    }
    if (typeof item.basePrice === 'number' && Number.isFinite(item.basePrice)) {
      metadata.base_price = Number(item.basePrice).toFixed(2);
    }
    if (typeof item.extra === 'number' && Number.isFinite(item.extra)) {
      metadata.option_upcharge = Number(item.extra).toFixed(2);
    }
    const baseProductName = (product as any)?.title || item.name || 'Item';
    const displayName = baseProductName || 'Item';
    const optionSummary = formatOptionSummary({
      options: item.options as Record<string, unknown>,
      selections: item.selections,
      selectedOptions: (item as any).selectedOptions,
      selectedUpgrades: (item as any).selectedUpgrades,
      upgrades: item.upgrades ?? item.addOns
    });
    const description = optionSummary ? clamp(optionSummary, 250) : undefined;

    return {
      price_data: {
        currency: 'usd',
        tax_behavior: 'exclusive',
        product_data: {
          name: displayName || 'Item',
          tax_code: 'txcd_99999999',
          ...(description ? { description } : {}),
          // Help fulfillment map back to Sanity/Inventory and capture configured options
          metadata
        },
        unit_amount: unitAmount
      },
      quantity
    } satisfies Stripe.Checkout.SessionCreateParams.LineItem;
  });

  if (!shippingDestination) {
    return jsonResponse(
      { error: 'Shipping address is required to calculate shipping rates.' },
      422
    );
  }

  const normalizedDestination = normalizeQuoteDestination(shippingDestination);
  const quoteItems = normalizeQuoteCartItems(cart as CheckoutCartItem[]);
  if (!quoteItems.length) {
    return jsonResponse({ error: 'Unable to build a shipping request from the cart items.' }, 422);
  }

  const quoteRequestId = randomUUID();
  const quoteKey = buildQuoteKey(quoteItems, normalizedDestination);

  const rawShippingMode =
    (import.meta.env.SHIPPING_LIVE_RATES_MODE as string | undefined) || 'live';
  const shippingMode = rawShippingMode.trim().toLowerCase();

  if (shippingMode === 'fail_closed') {
    return jsonResponse(
      { error: 'Shipping rates temporarily unavailable. Please try again soon.' },
      502
    );
  }

  if (shippingMode !== 'live' && shippingMode !== 'flat_fallback') {
    console.warn('[checkout] Unsupported SHIPPING_LIVE_RATES_MODE:', shippingMode);
    return jsonResponse(
      { error: 'Shipping rates temporarily unavailable. Please try again soon.' },
      502
    );
  }

  let shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [];
  let shippingQuote: ShippingQuoteResponse | null = null;
  let selectedRateId: string | undefined;
  let flatFallbackAmount: number | null = null;

  if (shippingMode === 'flat_fallback') {
    console.warn('[checkout] SHIPPING_LIVE_RATES_MODE=flat_fallback; using emergency flat rate');
    flatFallbackAmount = FLAT_FALLBACK_AMOUNT_CENTS;
    const fallbackMetadata: Record<string, string> = {
      shipping_quote_key: quoteKey,
      shipping_quote_request_id: quoteRequestId,
      shipping_mode: 'flat_fallback',
      shipping_fallback_amount: (flatFallbackAmount / 100).toFixed(2)
    };
    shippingOptions = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: flatFallbackAmount, currency: 'usd' },
          display_name: FLAT_FALLBACK_DISPLAY_NAME,
          metadata: fallbackMetadata
        }
      }
    ];
  } else {
    try {
      shippingQuote = await fetchLiveShippingQuote({
        cart: quoteItems,
        destination: normalizedDestination,
        quoteKey,
        quoteRequestId
      });
    } catch (error) {
      console.error('[checkout] shipping quote failed', { quoteKey, quoteRequestId, error });
      const message =
        error instanceof Error ? error.message : 'Unable to calculate shipping rates right now.';
      return jsonResponse({ error: message }, 502);
    }

    if (shippingQuote.installOnly) {
      return jsonResponse(
        {
          error:
            shippingQuote.message ||
            'One or more cart items require installation-only service. Please contact us to proceed.'
        },
        422
      );
    }

    if (shippingQuote.freight) {
      return jsonResponse(
        {
          error:
            shippingQuote.message ||
            'This order requires a freight shipment. Please request a custom quote or contact support.'
        },
        422
      );
    }

    const rates = Array.isArray(shippingQuote.rates) ? shippingQuote.rates : [];
    if (!rates.length) {
      return jsonResponse(
        { error: shippingQuote.message || 'No shipping rates were returned for this destination.' },
        422
      );
    }

    selectedRateId = shippingQuote.bestRate?.rateId ?? rates[0]?.rateId;

    shippingOptions = buildShippingOptionsFromRates(rates, {
      quoteKey,
      quoteRequestId,
      shippingQuoteId: shippingQuote.shippingQuoteId,
      easyPostShipmentId: shippingQuote.easyPostShipmentId
    });
  }

  if (!shippingOptions.length) {
    return jsonResponse(
      { error: 'Unable to build Stripe shipping options from the rate data.' },
      422
    );
  }

  // Derive optional user identity for reliable joins in webhook
  let userEmail: string | undefined;
  try {
    const { session } = await readSession(request);
    if (session?.user) {
      userEmail = String(session.user.email || '');
    }
  } catch (error) {
    void error;
  }

  const allowedCountries = resolveAllowedCountries();
  try {
    const shippingAddressCollection: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection =
      {
        allowed_countries: allowedCountries
      };

    const customerEmail = userEmail || undefined;

    const metadataForSession: Record<string, string> = {
      cart_id: randomUUID(),
      shipping_quote_key: quoteKey,
      shipping_quote_request_id: quoteRequestId
    };
    const sessionMetaPush = (key: string, value?: unknown) => {
      const converted = toMetadataString(value);
      if (converted) metadataForSession[key] = converted;
    };
    if (shippingQuote) {
      sessionMetaPush('shipping_quote_id', shippingQuote.shippingQuoteId);
      sessionMetaPush('easy_post_shipment_id', shippingQuote.easyPostShipmentId);
    }
    if (selectedRateId) {
      sessionMetaPush('selected_rate_id', selectedRateId);
    }
    if (shippingMode === 'flat_fallback') {
      sessionMetaPush('shipping_mode', 'flat_fallback');
      if (flatFallbackAmount !== null) {
        sessionMetaPush('shipping_fallback_amount', (flatFallbackAmount / 100).toFixed(2));
      }
    }

    const paymentIntentMetadata = { ...metadataForSession };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      // Offer standard cards plus Affirm financing at checkout
      payment_method_types: ['card', 'affirm'],
      mode: 'payment',
      line_items: lineItems,
      metadata: metadataForSession,
      payment_intent_data: {
        metadata: paymentIntentMetadata
      },
      locale: 'en',
      tax_id_collection: { enabled: true },
      // Enable Stripe Tax for automatic sales tax calculation
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      shipping_address_collection: shippingAddressCollection,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,
      consent_collection: { promotions: 'auto' }
    };

    if (shippingOptions) {
      sessionParams.shipping_options = shippingOptions;
    }

    // Guard rail: Stripe rejects automatic tax when payment_intent_data.shipping is present.
    if (sessionParams.payment_intent_data && 'shipping' in sessionParams.payment_intent_data) {
      delete (sessionParams.payment_intent_data as { shipping?: unknown }).shipping;
    }

    sessionParams.customer_creation = 'always';
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    // With automatic tax enabled, Stripe expects to collect the shipping address at checkout.
    // Avoid passing payment_intent_data.shipping so we don't trigger the "cannot enable automatic tax" error.
    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ url: session.url }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Stripe Checkout Session Error:', err);
    return jsonResponse({ error: message }, 500);
  }
}
