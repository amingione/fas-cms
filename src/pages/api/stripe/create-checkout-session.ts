/**
 * Hosted Stripe Checkout session endpoint.
 *
 * The storefront posts cart data. Medusa (Shippo) determines shipping options
 * and we forward those rates into Stripe Checkout. Any client changes that
 * execute before the redirect must revalidate this flow.
 */

import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { readSession } from '../../../server/auth/session';
import { sanity } from '../../../server/sanity-client';
import { getActivePrice, getCompareAtPrice, isOnSale } from '@/lib/saleHelpers';
import { formatOptionSummary } from '@/lib/cart/format-option-summary';
import { stripeCheckoutRequestSchema } from '@/lib/validators/api-requests';
import { sanityProductSchema } from '@/lib/validators/sanity';
import { normalizeBaseUrl } from '@/lib/sanity-functions';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';

const stripeSecret =
  (import.meta.env.STRIPE_SECRET_KEY as string | undefined) || process.env.STRIPE_SECRET_KEY || '';

const stripe = new Stripe(stripeSecret, {
  apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
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
  stripePriceId?: string;
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

type ShippingProduct = {
  _id: string;
  title?: string;
  sku?: string;
  productType?: string | null;
  price?: number | null;
  stripePriceId?: string | null;
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

type Dimensions = { length: number; width: number; height: number };

type MedusaShippingOption = {
  id: string;
  name?: string;
  amount?: number;
  raw_amount?: { value?: string | number };
  data?: Record<string, any>;
  region?: { currency_code?: string };
};

type MedusaAddressInput = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

const toMedusaAmount = (option: MedusaShippingOption): number | null => {
  if (typeof option.amount === 'number') return Math.round(option.amount);
  const raw = option.raw_amount?.value;
  const parsed = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const splitName = (name?: string): { firstName: string; lastName: string } => {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const buildMedusaAddressPayload = (
  address: MedusaAddressInput | undefined,
  name?: string,
  phone?: string
): {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phone: string;
} | null => {
  if (!address) return null;
  const { firstName, lastName } = splitName(address.name || name);
  const address1 = address.line1?.trim() || '';
  const city = address.city?.trim() || '';
  const postalCode = address.postal_code?.trim() || '';
  const countryCode = address.country?.trim() || 'US';
  if (!address1 || !city || !postalCode || !countryCode) return null;
  return {
    firstName,
    lastName,
    address1,
    address2: address.line2?.trim() || '',
    city,
    province: address.state?.trim() || '',
    postalCode,
    countryCode,
    phone: phone?.trim() || ''
  };
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
      productType,
      "price": coalesce(price, pricing.price),
      stripePriceId,
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

const readString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
};

const parseBoxDimensions = (raw?: string | null): Dimensions | undefined => {
  if (!raw || typeof raw !== 'string') return undefined;
  const parts = raw
    .toLowerCase()
    .split(/[x×]/)
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (parts.length !== 3) return undefined;
  const [length, width, height] = parts;
  return { length, width, height };
};

const normalizeShippingClass = (value?: string | null): string => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
};

const isInstallOnlyShippingClass = (value?: string | null): boolean => {
  const normalized = normalizeShippingClass(value);
  return normalized.includes('installonly') || normalized.includes('installservice');
};

const resolveRequiresShipping = (product?: ShippingProduct, item?: CheckoutCartItem): boolean => {
  const productType =
    typeof product?.productType === 'string' ? product.productType.toLowerCase() : '';
  if (productType === 'service') return false;
  const requiresShipping = product?.shippingConfig?.requiresShipping;
  if (requiresShipping === true) return true;
  if (requiresShipping === false) {
    if (item?.installOnly) return false;
    const rawClass =
      typeof item?.shippingClass === 'string'
        ? item.shippingClass
        : typeof product?.shippingConfig?.shippingClass === 'string'
          ? product.shippingConfig.shippingClass
          : typeof product?.shippingClass === 'string'
            ? product.shippingClass
            : '';
    if (isInstallOnlyShippingClass(rawClass)) return false;
    return productType === 'physical' || productType === 'bundle' || !productType;
  }

  const rawClass =
    typeof item?.shippingClass === 'string'
      ? item.shippingClass
      : typeof product?.shippingConfig?.shippingClass === 'string'
        ? product.shippingConfig.shippingClass
        : typeof product?.shippingClass === 'string'
          ? product.shippingClass
          : '';

  if (item?.installOnly) return false;
  if (isInstallOnlyShippingClass(rawClass)) return false;
  return true;
};

const buildShippingProductMetadata = (
  product?: ShippingProduct,
  item?: CheckoutCartItem
): Record<string, string> => {
  if (!product || !item) return {};
  if (!resolveRequiresShipping(product, item)) return {};
  const weight =
    typeof product.shippingConfig?.weight === 'number'
      ? product.shippingConfig.weight
      : typeof product.shippingWeight === 'number'
        ? product.shippingWeight
        : undefined;
  const dimensions =
    product.shippingConfig?.dimensions &&
    typeof product.shippingConfig.dimensions.length === 'number' &&
    typeof product.shippingConfig.dimensions.width === 'number' &&
    typeof product.shippingConfig.dimensions.height === 'number'
      ? (product.shippingConfig.dimensions as Dimensions)
      : parseBoxDimensions(product.boxDimensions);

  const metadata: Record<string, string> = {
    // Stripe uses this flag to detect shippable products
    shipping_required: 'true',
    customs_description: 'Parts and accessories of the motor vehicles of headings 8701 to 8705:',
    origin_country: 'US',
    tariff_code: '8708'
  };
  // Stripe product metadata must include weight and dimensions for rate calculation
  if (typeof weight === 'number' && Number.isFinite(weight) && weight > 0) {
    metadata.package_weight = String(weight);
    metadata.package_weight_unit = 'pound';
  }
  if (dimensions) {
    metadata.package_length = String(dimensions.length);
    metadata.package_width = String(dimensions.width);
    metadata.package_height = String(dimensions.height);
    metadata.dimensions_unit = 'inch';
  }
  return metadata;
};

const toPackageDimensions = (
  metadata: Record<string, string>
): Stripe.ProductCreateParams.PackageDimensions | undefined => {
  const weight = Number(metadata.package_weight);
  const length = Number(metadata.package_length);
  const width = Number(metadata.package_width);
  const height = Number(metadata.package_height);

  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(length) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return undefined;
  }
  if (weight <= 0 || length <= 0 || width <= 0 || height <= 0) {
    return undefined;
  }
  if (metadata.package_weight_unit && metadata.package_weight_unit !== 'pound') {
    return undefined;
  }
  if (metadata.dimensions_unit && metadata.dimensions_unit !== 'inch') {
    return undefined;
  }

  return { weight, length, width, height };
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

  const bodyResult = stripeCheckoutRequestSchema.safeParse(body);
  if (!bodyResult.success) {
    console.error('[validation-failure]', {
      schema: 'stripeCheckoutRequestSchema',
      context: 'api/checkout',
      identifier: 'unknown',
      timestamp: new Date().toISOString(),
      errors: bodyResult.error.format()
    });
    return jsonResponse({ error: 'Validation failed', details: bodyResult.error.format() }, 422);
  }

  const { cart, metadata: requestMetadata, shippingAddress } = bodyResult.data;
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

  const requiresShippingSelection = (
    items: CheckoutCartItem[],
    productLookup: Record<string, ShippingProduct>
  ): boolean => {
    return items.some((item) => {
      if (!item) return false;
      const productId = normalizeCartId(typeof item.id === 'string' ? item.id : undefined);
      const product = productId ? productLookup[productId] : undefined;
      return resolveRequiresShipping(product, item);
    });
  };

  const productLookup = await fetchShippingProductsForCart(cart as CheckoutCartItem[]);
  const shippingRequired = requiresShippingSelection(cart as CheckoutCartItem[], productLookup);

  // Debug logging for shipping requirement determination
  console.log('[checkout] Shipping requirement check', {
    shippingRequired,
    cartItemCount: (cart as CheckoutCartItem[]).length,
    productLookupSize: Object.keys(productLookup).length,
    itemDetails: (cart as CheckoutCartItem[]).map((item) => {
      const productId = normalizeCartId(typeof item.id === 'string' ? item.id : undefined);
      const product = productId ? productLookup[productId] : undefined;
      return {
        itemId: item.id,
        itemName: item.name,
        productId,
        hasProduct: !!product,
        requiresShipping: resolveRequiresShipping(product, item),
        installOnly: item.installOnly,
        shippingClass:
          item.shippingClass || product?.shippingClass || product?.shippingConfig?.shippingClass
      };
    })
  });

  const stripePriceIds = Array.from(
    new Set(
      (cart as CheckoutCartItem[])
        .map((item) => {
          const itemPriceId =
            typeof item.stripePriceId === 'string' ? item.stripePriceId.trim() : '';
          if (itemPriceId.startsWith('price_')) return itemPriceId;
          const productId = normalizeCartId(typeof item.id === 'string' ? item.id : undefined);
          const product = productId ? productLookup[productId] : undefined;
          const productPriceId =
            typeof product?.stripePriceId === 'string' ? product.stripePriceId.trim() : '';
          return productPriceId.startsWith('price_') ? productPriceId : '';
        })
        .filter((priceId) => priceId.startsWith('price_'))
    )
  );
  let stripePriceMap = new Map<string, Stripe.Price>();
  if (stripePriceIds.length) {
    try {
      const prices = await Promise.all(
        stripePriceIds.map((priceId) => stripe.prices.retrieve(priceId, { expand: ['product'] }))
      );
      stripePriceMap = new Map(prices.filter(Boolean).map((price) => [price.id, price]));
    } catch (error) {
      console.error('[checkout] Failed to load Stripe price metadata', error);
      return jsonResponse({ error: 'Unable to load Stripe price metadata' }, 400);
    }
  }
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

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const shippingLineItemMeta: Array<{
    name?: string;
    price?: string;
    metadata: Record<string, string>;
  }> = [];
  for (const item of cart as CheckoutCartItem[]) {
    const rawId = typeof item.id === 'string' ? item.id : undefined;
    const sanityProductId = normalizeCartId(rawId);
    const product = sanityProductId ? productLookup[sanityProductId] : undefined;
    const itemPriceId = typeof item.stripePriceId === 'string' ? item.stripePriceId.trim() : '';
    const productPriceId =
      typeof product?.stripePriceId === 'string' ? product.stripePriceId.trim() : '';
    const stripePriceId = itemPriceId.startsWith('price_')
      ? itemPriceId
      : productPriceId.startsWith('price_')
        ? productPriceId
        : '';
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

    if (stripePriceId.startsWith('price_')) {
      const price = stripePriceMap.get(stripePriceId);
      if (!price) {
        return jsonResponse({ error: 'Stripe price not found' }, 400);
      }
      const isShippable = resolveRequiresShipping(product, item);
      const stripeProduct = typeof price.product === 'string' ? undefined : price.product;
      const liveStripeProduct =
        stripeProduct && !('deleted' in stripeProduct) ? stripeProduct : undefined;
      const stripeProductId =
        typeof price.product === 'string' ? price.product : liveStripeProduct?.id;

      if (isShippable && liveStripeProduct?.type === 'service') {
        console.warn(
          '[checkout] Stripe product type is "service" for shippable item. Falling back to ad-hoc product creation.',
          {
            priceId: price.id,
            productId: stripeProductId,
            itemId: item.id
          }
        );
      } else {
        const stripeMeta = liveStripeProduct?.metadata ?? {};
        const shippingMeta = buildShippingProductMetadata(product, item);
        const mergedMetadata: Record<string, string> = { ...stripeMeta, ...shippingMeta };
        const packageDimensions = toPackageDimensions(mergedMetadata);

        if (isShippable) {
          if (
            !mergedMetadata.package_weight ||
            !mergedMetadata.package_weight_unit ||
            !mergedMetadata.origin_country
          ) {
            return jsonResponse(
              { error: 'Shipping metadata required for Stripe price items' },
              400
            );
          }
          const needsUpdate =
            !liveStripeProduct ||
            liveStripeProduct.shippable !== true ||
            !liveStripeProduct.metadata?.package_weight ||
            !liveStripeProduct.metadata?.package_weight_unit ||
            !liveStripeProduct.metadata?.origin_country ||
            (packageDimensions && !liveStripeProduct.package_dimensions);
          if (needsUpdate && stripeProductId) {
            const updatePayload: Stripe.ProductUpdateParams = {
              shippable: true,
              metadata: mergedMetadata
            };
            if (packageDimensions) {
              updatePayload.package_dimensions = packageDimensions;
            }
            await stripe.products.update(stripeProductId, updatePayload);
          }
        }

        lineItems.push({
          price: stripePriceId,
          quantity
        });
        shippingLineItemMeta.push({
          name:
            (stripeProduct && !('deleted' in stripeProduct) ? stripeProduct.name : undefined) ||
            item.name ||
            'Item',
          price: stripePriceId,
          metadata: mergedMetadata
        });
        continue;
      }
    }

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
      ...(sanityProductId ? { sanity_product_id: sanityProductId } : {})
    };

    // Build shipping metadata and validate for shippable items
    const shippingMeta = buildShippingProductMetadata(product, item);
    const isItemShippable = resolveRequiresShipping(product, item);
    const hasShippingMeta = Boolean(
      shippingMeta.package_weight &&
      shippingMeta.package_weight_unit &&
      shippingMeta.origin_country &&
      shippingMeta.shipping_required
    );

    // Validate shipping metadata for shippable items
    if (isItemShippable && !hasShippingMeta) {
      const productId = product?._id || sanityProductId || item.sku || 'unknown';
      console.error('[checkout] Missing shipping metadata for shippable item', {
        productId,
        itemName: item.name,
        hasWeight: Boolean(shippingMeta.package_weight),
        hasOriginCountry: Boolean(shippingMeta.origin_country),
        hasShippingRequired: Boolean(shippingMeta.shipping_required)
      });
      return jsonResponse(
        {
          error: `Product "${item.name || 'Unknown'}" requires shipping but is missing required weight, dimensions, or shipping configuration. Please configure shipping details in Sanity.`,
          productId
        },
        400
      );
    }

    // Merge shipping metadata into main metadata object
    Object.assign(metadata, shippingMeta);
    const packageDimensions = toPackageDimensions(metadata);
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
    if (Number.isFinite(basePrice)) {
      metadata.original_price = Number(basePrice).toFixed(2);
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
      const onSale = isOnSale(product as any);
      metadata.is_on_sale = onSale ? 'true' : 'false';
      if (onSale && product.saleLabel) {
        metadata.sale_label = clamp(String(product.saleLabel), 120);
      }
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
    const resolvedDescription = description || clamp(displayName, 250);

    const stripeProduct = await stripe.products.create({
      name: displayName || 'Item',
      description: resolvedDescription,
      images: item.image ? [item.image] : undefined,
      tax_code: 'txcd_99999999',
      type: isItemShippable ? 'good' : 'service',
      shippable: isItemShippable,
      ...(packageDimensions ? { package_dimensions: packageDimensions } : {}),
      metadata
    });

    // Log product creation for shipping metadata debugging
    if (isItemShippable) {
      console.log('[checkout] Created shippable product for shipping:', {
        productId: stripeProduct.id,
        productName: stripeProduct.name,
        shippable: stripeProduct.shippable,
        type: stripeProduct.type,
        hasPackageWeight: !!metadata.package_weight,
        hasPackageWeightUnit: !!metadata.package_weight_unit,
        hasOriginCountry: !!metadata.origin_country,
        hasShippingRequired: metadata.shipping_required === 'true',
        hasPackageDimensions: !!stripeProduct.package_dimensions,
        hasDimensionsUnit: !!metadata.dimensions_unit,
        allMetadataKeys: Object.keys(metadata),
        // Show actual shipping values
        shippingMetadata: {
          shipping_required: metadata.shipping_required,
          package_weight: metadata.package_weight,
          package_weight_unit: metadata.package_weight_unit,
          package_length: metadata.package_length,
          package_width: metadata.package_width,
          package_height: metadata.package_height,
          dimensions_unit: metadata.dimensions_unit,
          origin_country: metadata.origin_country,
          customs_description: metadata.customs_description,
          tariff_code: metadata.tariff_code
        }
      });
    }

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: unitAmount,
      currency: 'usd',
      tax_behavior: 'exclusive'
    });
    await stripe.products.update(stripeProduct.id, {
      default_price: stripePrice.id
    });

    lineItems.push({
      price: stripePrice.id,
      quantity
    } satisfies Stripe.Checkout.SessionCreateParams.LineItem);
    shippingLineItemMeta.push({
      name: stripeProduct.name,
      price: stripePrice.id,
      metadata
    });
  }

  if (!lineItems.length) {
    return jsonResponse({ error: 'Cart has no valid line items' }, 400);
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

  const allowedCountries = ['US'];
  try {
    const shippingAddressCollection: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection =
      {
        allowed_countries: allowedCountries
      };

    let customerEmail = userEmail || undefined;

    const bodyRecord = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const metadataInput =
      requestMetadata && typeof requestMetadata === 'object'
        ? (requestMetadata as Record<string, unknown>)
        : {};
    const cartId =
      readString(bodyRecord.cartId) ||
      readString(bodyRecord.cart_id) ||
      readString(metadataInput.cart_id) ||
      readString(metadataInput.cartId) ||
      randomUUID();

    const metadataForSession: Record<string, string> = {
      cart_id: cartId,
      // Add cart items for post-checkout joins
      cart: JSON.stringify(
        (cart as CheckoutCartItem[]).map((item) => ({
          sku: item.sku || (typeof item.id === 'string' ? normalizeCartId(item.id) : ''),
          quantity: item.quantity || 1
        }))
      )
    };

    const cartType =
      readString(bodyRecord.cartType) ||
      readString(bodyRecord.cart_type) ||
      readString(metadataInput.cart_type) ||
      readString(metadataInput.cartType);
    if (cartType) {
      metadataForSession.cart_type = cartType;
    }

    const orderType =
      readString(bodyRecord.orderType) ||
      readString(bodyRecord.order_type) ||
      readString(metadataInput.order_type) ||
      readString(metadataInput.orderType);
    if (orderType) {
      metadataForSession.order_type = orderType;
    }

    const requestCustomerEmail =
      readString(bodyRecord.customerEmail) ||
      readString(bodyRecord.customer_email) ||
      readString(metadataInput.customer_email) ||
      readString(metadataInput.customerEmail);

    const requestCustomerName =
      readString(bodyRecord.customerName) ||
      readString(bodyRecord.customer_name) ||
      readString(metadataInput.customer_name) ||
      readString(metadataInput.customerName);

    const requestCustomerPhone =
      readString(bodyRecord.customerPhone) ||
      readString(bodyRecord.customer_phone) ||
      readString(metadataInput.customer_phone) ||
      readString(metadataInput.customerPhone);

    if (requestCustomerEmail) metadataForSession.customer_email = requestCustomerEmail;
    if (requestCustomerName) metadataForSession.customer_name = requestCustomerName;
    if (requestCustomerPhone) metadataForSession.customer_phone = requestCustomerPhone;

    if (requestCustomerEmail) {
      customerEmail = requestCustomerEmail;
    } else if (userEmail && !metadataForSession.customer_email) {
      metadataForSession.customer_email = userEmail;
    }

    if (metadataInput && typeof metadataInput === 'object') {
      Object.entries(metadataInput).forEach(([key, value]) => {
        const normalizedKey = key?.toString().trim();
        if (!normalizedKey) return;
        if (normalizedKey in metadataForSession) return;
        const normalizedValue = toMetadataString(value);
        if (normalizedValue) {
          metadataForSession[normalizedKey] = normalizedValue;
        }
      });
    }

    const paymentIntentMetadata: Record<string, string> = { ...metadataForSession };

    const proxyUrl = (path: string) => `${baseUrl}${path}`;
    const postProxy = async (path: string, payload: Record<string, unknown>) => {
      return fetch(proxyUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    };

    console.log('[checkout][step 1/8] Creating Medusa cart');
    const medusaCreateRes = await postProxy('/api/medusa/cart/create', {});
    const medusaCreatePayload = await medusaCreateRes.json().catch(() => null);
    if (!medusaCreateRes.ok) {
      return jsonResponse(
        {
          error: 'Step 1 failed: unable to create Medusa cart.',
          details: medusaCreatePayload
        },
        medusaCreateRes.status
      );
    }
    const medusaCartId =
      typeof medusaCreatePayload?.cartId === 'string' ? medusaCreatePayload.cartId : '';
    if (!medusaCartId) {
      return jsonResponse({ error: 'Step 1 failed: Medusa cart id missing.' }, 500);
    }

    console.log('[checkout][step 2/8] Adding line items to Medusa cart');
    const medusaAddRes = await postProxy('/api/medusa/cart/add-item', {
      cartId: medusaCartId,
      cart: { items: cart }
    });
    const medusaAddPayload = await medusaAddRes.json().catch(() => null);
    if (!medusaAddRes.ok) {
      return jsonResponse(
        {
          error: 'Step 2 failed: unable to add items to Medusa cart.',
          details: medusaAddPayload
        },
        medusaAddRes.status
      );
    }

    const addressPayload = buildMedusaAddressPayload(
      shippingAddress as MedusaAddressInput | undefined,
      requestCustomerName,
      requestCustomerPhone
    );
    if (!addressPayload) {
      return jsonResponse(
        {
          error:
            'Step 3 failed: shippingAddress must include line1, city, postal_code, and country (US only).'
        },
        400
      );
    }
    if (addressPayload.countryCode.toUpperCase() !== 'US') {
      return jsonResponse(
        { error: 'Step 3 failed: only US shipping addresses are supported.' },
        400
      );
    }

    console.log('[checkout][step 3/8] Setting Medusa shipping address');
    const medusaAddressRes = await postProxy('/api/medusa/cart/update-address', {
      cartId: medusaCartId,
      email: requestCustomerEmail || userEmail || undefined,
      shippingAddress: addressPayload
    });
    const medusaAddressPayload = await medusaAddressRes.json().catch(() => null);
    if (!medusaAddressRes.ok) {
      return jsonResponse(
        {
          error: 'Step 3 failed: unable to update Medusa shipping address.',
          details: medusaAddressPayload
        },
        medusaAddressRes.status
      );
    }

    console.log('[checkout][step 4/8] Fetching Medusa shipping options');
    const medusaOptionsRes = await postProxy('/api/medusa/cart/shipping-options', {
      cartId: medusaCartId
    });
    const medusaOptionsPayload = await medusaOptionsRes.json().catch(() => null);
    if (!medusaOptionsRes.ok) {
      return jsonResponse(
        {
          error: 'Step 4 failed: unable to fetch Medusa shipping options.',
          details: medusaOptionsPayload
        },
        medusaOptionsRes.status
      );
    }

    const medusaOptions: MedusaShippingOption[] = Array.isArray(
      medusaOptionsPayload?.shippingOptions
    )
      ? medusaOptionsPayload.shippingOptions
      : [];
    if (!medusaOptions.length) {
      return jsonResponse(
        { error: 'Step 4 failed: Medusa returned no shipping options.' },
        400
      );
    }

    console.log('[checkout][step 5/8] Converting Medusa rates for Stripe Checkout');
    const stripeShippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [];
    for (const option of medusaOptions) {
      const amount = toMedusaAmount(option);
      if (amount === null) {
        return jsonResponse(
          {
            error: 'Step 5 failed: invalid Medusa shipping amount.',
            details: { optionId: option?.id }
          },
          400
        );
      }
      const carrier = String(option?.data?.carrier || '').toLowerCase();
      stripeShippingOptions.push({
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: option.name || (carrier ? carrier.toUpperCase() : 'Shipping'),
          fixed_amount: {
            amount,
            currency: String(option?.region?.currency_code || 'usd').toLowerCase()
          },
          metadata: {
            medusa_shipping_option_id: option.id,
            medusa_shipping_option_name: option.name || '',
            carrier: carrier || ''
          }
        }
      });
    }

    const hasStaticRatePayload =
      'shippingRate' in bodyRecord || 'shipping_rate' in bodyRecord || 'selectedRate' in bodyRecord;

    if (shippingRequired && hasStaticRatePayload) {
      return jsonResponse(
        {
          error: 'Static shipping rates are disabled. Remove shippingRate/selectedRate payloads.'
        },
        400
      );
    }

    if (shippingRequired) {
      console.log('[checkout] Using Medusa + Shippo shipping rates for Stripe Checkout.');
      // Log shipping configuration for debugging
      const shippableItemCount = shippingLineItemMeta.filter((item) => {
        const meta = item.metadata;
        return meta.shipping_required === 'true' && meta.package_weight && meta.origin_country;
      }).length;
      console.log('[checkout] Shipping configuration check', {
        shippingRequired,
        lineItemCount: lineItems.length,
        shippableItemCount,
        invoiceCreationEnabled: true,
        shippingAddressCollectionEnabled: true
      });
      const shippingMetaSnapshot = shippingLineItemMeta.map((item, index) => {
        const metadata = item.metadata || {};
        return {
          index,
          name: item.name,
          price: item.price,
          hasMetadata: Object.keys(metadata).length > 0,
          shipping_required: metadata.shipping_required ?? null,
          package_weight: metadata.package_weight ?? null,
          package_weight_unit: metadata.package_weight_unit ?? null,
          origin_country: metadata.origin_country ?? null,
          package_length: metadata.package_length ?? null,
          package_width: metadata.package_width ?? null,
          package_height: metadata.package_height ?? null,
          dimensions_unit: metadata.dimensions_unit ?? null
        };
      });
      console.log('[checkout] Shipping line item metadata', shippingMetaSnapshot);
    }

    paymentIntentMetadata.ship_status = shippingRequired ? 'unshipped' : 'unshippable';
    metadataForSession.ship_status = paymentIntentMetadata.ship_status;
    metadataForSession.shipping_required = shippingRequired ? 'true' : 'false';

    console.log('[checkout][step 6/8] Attaching Medusa shipping options to Stripe Checkout session');
    metadataForSession.medusa_cart_id = medusaCartId;
    paymentIntentMetadata.medusa_cart_id = medusaCartId;
    console.log('[checkout][step 7/8] Stored medusa_cart_id in Stripe metadata');
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      // CRITICAL: Use embedded mode for shipping
      ui_mode: 'embedded',
      // Return URL for embedded checkout (customer stays on your site)
      return_url: `${baseUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      branding_settings: {
        background_color: '#0b0b0c',
        button_color: '#d11219',
        border_style: 'rounded',
        font_family: 'inter'
      },
      // Offer standard cards plus Affirm financing at checkout
      payment_method_types: ['card', 'affirm'],
      mode: 'payment',
      line_items: lineItems,
      metadata: metadataForSession,
      payment_intent_data: {
        metadata: paymentIntentMetadata
      },
      client_reference_id: metadataForSession.cart_id,
      tax_id_collection: { enabled: true },
      // Enable Stripe Tax for automatic sales tax calculation
      automatic_tax: { enabled: true },
      // Enable invoice creation for record keeping
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: { ...metadataForSession }
        }
      },
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      // CRITICAL: Explicit locale required for branded checkout domains
      locale: 'en',
      // Shipping address is required for Medusa/Shippo rate calculation
      shipping_address_collection: shippingAddressCollection,
      shipping_options: stripeShippingOptions,
      consent_collection: { promotions: 'auto' },
      custom_fields: [
        {
          key: 'phone',
          label: { type: 'custom', custom: 'Phone' },
          type: 'text',
          optional: false
        },
        {
          key: 'company',
          label: { type: 'custom', custom: 'Company' },
          type: 'text',
          optional: true
        }
      ]
    };

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

    // Final validation: Log shipping configuration for debugging
    console.log('[checkout] Final session configuration', {
      shippingRequired,
      hasShippingAddressCollection: !!sessionParams.shipping_address_collection,
      shippingAddressCollectionAllowedCountries:
        sessionParams.shipping_address_collection?.allowed_countries,
      invoiceCreationEnabled: sessionParams.invoice_creation?.enabled,
      lineItemCount: sessionParams.line_items?.length,
      hasMedusaShippingRates: true,
      automaticTaxEnabled: sessionParams.automatic_tax?.enabled,
      locale: sessionParams.locale,
      hasPermissions: !!(sessionParams as any).permissions,
      permissionsUpdateShipping: (sessionParams as any).permissions?.update_shipping_details
    });

    // Log detailed product information for shipping metadata debugging
    if (shippingRequired) {
      console.log('[checkout] Shipping product verification - checking Stripe products...');
      for (const lineItem of lineItems) {
        if (lineItem.price && typeof lineItem.price === 'string') {
          try {
            const price = await stripe.prices.retrieve(lineItem.price, { expand: ['product'] });
            const product = typeof price.product === 'string' ? undefined : price.product;
            if (product && !('deleted' in product)) {
              console.log('[checkout] Product details for shipping:', {
                productId: product.id,
                productName: product.name,
                productType: product.type,
                shippable: product.shippable,
                hasPackageWeight: !!product.metadata?.package_weight,
                hasPackageWeightUnit: !!product.metadata?.package_weight_unit,
                hasOriginCountry: !!product.metadata?.origin_country,
                hasShippingRequired: product.metadata?.shipping_required === 'true',
                hasPackageDimensions: !!product.package_dimensions,
                metadataKeys: Object.keys(product.metadata || {})
              });
            }
          } catch (err) {
            console.warn('[checkout] Could not retrieve product details:', err);
          }
        }
      }
    }

    // Log the actual shipping_address_collection object being sent
    if (sessionParams.shipping_address_collection) {
      console.log(
        '[checkout] Shipping address collection details',
        JSON.stringify(sessionParams.shipping_address_collection, null, 2)
      );
    } else {
      console.warn(
        '[checkout] ⚠️ WARNING: shipping_address_collection is NOT set in session params, but shippingRequired is:',
        shippingRequired
      );
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Log what Stripe actually created (after the API call)
    console.log('[checkout] ✅ Stripe Embedded Checkout session created:', {
      sessionId: session.id,
      locale: session.locale || '(not set)',
      hasShippingAddressCollection: !!session.shipping_address_collection,
      allowedCountries: session.shipping_address_collection?.allowed_countries,
      uiMode: session.ui_mode || '(not set)',
      hasClientSecret: !!session.client_secret,
      invoiceCreationEnabled: session.invoice_creation?.enabled,
      automaticTaxEnabled: session.automatic_tax?.enabled
    });
    console.log('[checkout] Stripe client_secret returned directly:', !!session.client_secret);

    // Final shipping diagnostic
    if (shippingRequired) {
      console.log('[checkout] 🔍 Shipping Diagnostic Summary:', {
        sessionId: session.id,
        uiMode: 'embedded',
        hasShippingAddressCollection: !!session.shipping_address_collection,
        invoiceCreationEnabled: session.invoice_creation?.enabled,
        lineItemCount: lineItems.length,
        shippableProductsCount: shippingLineItemMeta.filter(
          (item) => item.metadata?.shipping_required === 'true'
        ).length,
        allProductsHaveWeight: shippingLineItemMeta.every(
          (item) => item.metadata?.shipping_required !== 'true' || item.metadata?.package_weight
        ),
        allProductsHaveOriginCountry: shippingLineItemMeta.every(
          (item) => item.metadata?.shipping_required !== 'true' || item.metadata?.origin_country
        ),
        note: 'If shipping rates do not appear, verify Medusa shipping options are available.'
      });
    }

    if (!session.locale) {
      console.warn(
        '[checkout] ⚠️ WARNING: Stripe session does NOT have locale set! This may cause "Cannot find module ./en" errors on branded domains.'
      );
    }

    if (!session.client_secret) {
      console.error('[checkout] ❌ ERROR: Embedded checkout session missing client_secret!');
      return jsonResponse({ error: 'Session creation failed - missing client secret' }, 500);
    }

    // For embedded checkout, return the client_secret (NOT url)
    // Frontend uses this to initialize the Stripe Checkout component
    return jsonResponse(
      {
        clientSecret: session.client_secret,
        sessionId: session.id
      },
      200
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Stripe Checkout Session Error:', err);
    return jsonResponse({ error: message }, 500);
  }
}
