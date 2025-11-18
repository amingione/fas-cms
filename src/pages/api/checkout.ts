import Stripe from 'stripe';
import { readSession } from '../../server/auth/session';
import { sanity } from '../../server/sanity-client';
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
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

function parseList(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split(/[,|\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

type AllowedCountryCodes =
  Stripe.Checkout.SessionCreateParams.ShippingAddressCollection['allowed_countries'];

function resolveAllowedCountries(): AllowedCountryCodes {
  const envValue =
    import.meta.env.STRIPE_SHIPPING_ALLOWED_COUNTRIES ||
    import.meta.env.PUBLIC_STRIPE_SHIPPING_ALLOWED_COUNTRIES ||
    import.meta.env.PUBLIC_SHIPPING_ALLOWED_COUNTRIES ||
    '';

  const parsed = parseList(envValue)
    .map((code) => code.toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code)) as AllowedCountryCodes;

  if (parsed.length) {
    return parsed;
  }

  return ['US', 'CA'];
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
  shippingWeight?: number | null;
  boxDimensions?: string | null;
  shippingClass?: string | null;
  shipsAlone?: boolean | null;
};

type ShippingQuoteResult = {
  requiresShipping: boolean;
  installOnlyCart: boolean;
  amount: number;
  label: string;
  delivery: { min: number; max: number } | null;
  freight: boolean;
  oversize: boolean;
  totalWeight: number;
  chargeableWeight: number;
  packageCount: number;
  summary: string;
};

type PackageCandidate = {
  weight: number;
  dims: ShippingDimensions;
  chargeCustomer: boolean;
  hazardous: boolean;
  longestSide: number;
};

const DEFAULT_DIMENSIONS: ShippingDimensions = {
  length: Number(import.meta.env.DEFAULT_BOX_LENGTH_IN || import.meta.env.DEFAULT_BOX_LENGTH || 12),
  width: Number(import.meta.env.DEFAULT_BOX_WIDTH_IN || import.meta.env.DEFAULT_BOX_WIDTH || 9),
  height: Number(import.meta.env.DEFAULT_BOX_HEIGHT_IN || import.meta.env.DEFAULT_BOX_HEIGHT || 4)
};
const DEFAULT_WEIGHT_LB = Number(
  import.meta.env.DEFAULT_BOX_WEIGHT_LB || import.meta.env.DEFAULT_PACKAGE_WEIGHT_LBS || 5
);
const DIM_DIVISOR = Number(import.meta.env.SHIPPING_DIM_DIVISOR || 139);
const SINGLE_PIECE_LIMIT = Number(import.meta.env.SHIPPING_SINGLE_PIECE_LIMIT_LB || 70);
const FREIGHT_DIM_THRESHOLD = Number(import.meta.env.SHIPPING_FREIGHT_LONGEST_IN || 60);
const FREIGHT_WEIGHT_THRESHOLD = Number(import.meta.env.SHIPPING_FREIGHT_WEIGHT_LB || 150);
const GROUND_BASE_CENTS = Number(import.meta.env.SHIPPING_GROUND_BASE_CENTS || 995);
const GROUND_PER_LB_CENTS = Number(import.meta.env.SHIPPING_GROUND_PER_LB_CENTS || 85);
const GROUND_BASE_WEIGHT = Number(import.meta.env.SHIPPING_GROUND_BASE_WEIGHT_LBS || 3);
const OVERSIZE_SURCHARGE_CENTS = Number(import.meta.env.SHIPPING_OVERSIZE_SURCHARGE_CENTS || 2500);
const HAZMAT_SURCHARGE_CENTS = Number(import.meta.env.SHIPPING_HAZMAT_SURCHARGE_CENTS || 3500);
const FREIGHT_BASE_CENTS = Number(import.meta.env.SHIPPING_FREIGHT_BASE_CENTS || 25000);
const FREIGHT_PER_LB_CENTS = Number(import.meta.env.SHIPPING_FREIGHT_PER_LB_CENTS || 150);

const normalizeCartId = (rawId?: string | null): string => {
  if (!rawId) return '';
  const trimmed = String(rawId).trim();
  if (!trimmed) return '';
  const [id] = trimmed.split('::');
  return id || trimmed;
};

const parseDimensions = (input?: string | null): ShippingDimensions | null => {
  if (!input) return null;
  const text = String(input).trim();
  if (!text) return null;
  const match = text.match(/([\d.]+)\s*[xX]\s*([\d.]+)\s*[xX]\s*([\d.]+)/);
  if (!match) return null;
  const [, l, w, h] = match;
  const dims = {
    length: Number(l),
    width: Number(w),
    height: Number(h)
  };
  if ([dims.length, dims.width, dims.height].some((value) => !Number.isFinite(value) || value <= 0)) {
    return null;
  }
  return dims;
};

const normalizeShippingClass = (value?: string | null): string => {
  if (!value) return '';
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
};

const toPositiveNumber = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const clampQuantity = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.min(99, Math.floor(numeric)));
};

const buildShippingSummary = (quote: ShippingQuoteResult | null): string | null => {
  if (!quote) return null;
  return [
    `requires=${quote.requiresShipping}`,
    `freight=${quote.freight}`,
    `packages=${quote.packageCount}`,
    `total=${quote.totalWeight.toFixed(2)}lb`,
    `chargeable=${quote.chargeableWeight.toFixed(2)}lb`
  ].join(';');
};

const makeDeliveryEstimate = (
  min: number,
  max: number
): Stripe.Checkout.SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate => ({
  minimum: { unit: 'business_day', value: Math.max(1, Math.round(min)) },
  maximum: { unit: 'business_day', value: Math.max(1, Math.round(max)) }
});

async function fetchShippingProductsForCart(cart: CheckoutCartItem[]): Promise<Record<string, ShippingProduct>> {
  const ids = Array.from(
    new Set(
      cart
        .map((item) => normalizeCartId(typeof item?.id === 'string' ? item.id : undefined))
        .filter(Boolean)
    )
  );
  const skus = Array.from(
    new Set(
      cart
        .map((item) => (item?.sku ? String(item.sku).trim() : ''))
        .filter(Boolean)
    )
  );
  if (!ids.length && !skus.length) return {};
  try {
    const query = `*[_type == "product" && !(_id in path('drafts.**')) && (status == "active" || !defined(status)) && coalesce(productType, "") != "service" && (
      ${ids.length ? '_id in $ids' : 'false'}
      ${ids.length && skus.length ? '||' : ''}
      ${skus.length ? 'sku in $skus' : 'false'}
    )]{ _id, title, sku, shippingWeight, boxDimensions, shippingClass, shipsAlone }`;
    const products = await sanity.fetch<ShippingProduct[]>(query, { ids, skus });
    const lookup: Record<string, ShippingProduct> = {};
    if (Array.isArray(products)) {
      products.forEach((product) => {
        if (product?._id) lookup[product._id] = product;
      });
    }
    return lookup;
  } catch (error) {
    console.warn('[checkout] Failed to fetch shipping products', error);
    return {};
  }
}

function buildShippingQuote(
  cart: CheckoutCartItem[],
  productLookup: Record<string, ShippingProduct>
): ShippingQuoteResult | null {
  const packages: PackageCandidate[] = [];
  let installOnlyCount = 0;
  let freight = false;
  let oversize = false;
  let hasHazmat = false;

  cart.forEach((item) => {
    const qty = clampQuantity(item?.quantity);
    const normalizedId = normalizeCartId(typeof item?.id === 'string' ? item.id : undefined);
    const product = normalizedId ? productLookup[normalizedId] : undefined;
    const shippingClassRaw = item?.shippingClass || product?.shippingClass || '';
    const normalizedClass = normalizeShippingClass(shippingClassRaw);
    const installOnly = Boolean(
      item?.installOnly || normalizedClass.includes('installonly')
    );
    if (installOnly) {
      installOnlyCount += qty;
      return;
    }

    const dims = parseDimensions(product?.boxDimensions) || DEFAULT_DIMENSIONS;
    const physicalWeight = toPositiveNumber(product?.shippingWeight, DEFAULT_WEIGHT_LB);
    const volumetricWeight =
      (dims.length * dims.width * dims.height) / (DIM_DIVISOR || 1);
    const billableWeight = Math.max(physicalWeight, volumetricWeight);
    const shipsAlone = Boolean(product?.shipsAlone);
    const freeShipping = normalizedClass === 'freeshipping';
    const hazardous = normalizedClass === 'hazardous';
    const longestSide = Math.max(dims.length, dims.width, dims.height);

    if (normalizedClass === 'freight') freight = true;
    if (longestSide >= FREIGHT_DIM_THRESHOLD) freight = true;
    if (billableWeight >= SINGLE_PIECE_LIMIT) freight = true;
    if (billableWeight * qty >= FREIGHT_WEIGHT_THRESHOLD) freight = true;
    if (longestSide >= 40) oversize = true;
    if (hazardous) hasHazmat = true;

    const candidate: PackageCandidate = {
      weight: billableWeight,
      dims,
      chargeCustomer: !freeShipping,
      hazardous,
      longestSide
    };

    const iterations = shipsAlone ? qty : qty;
    for (let i = 0; i < iterations; i += 1) {
      packages.push(candidate);
    }
  });

  if (!packages.length) {
    return {
      requiresShipping: false,
      installOnlyCart: installOnlyCount > 0,
      amount: 0,
      label: 'Install Service',
      delivery: null,
      freight: false,
      oversize: false,
      totalWeight: 0,
      chargeableWeight: 0,
      packageCount: 0,
      summary: 'no_packages'
    };
  }

  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
  const chargeableWeight = packages
    .filter((pkg) => pkg.chargeCustomer)
    .reduce((sum, pkg) => sum + pkg.weight, 0);
  const requiresShipping = totalWeight > 0;

  let amount = 0;
  let label = 'Standard Shipping';
  let delivery: ShippingQuoteResult['delivery'] = { min: 3, max: 5 };

  if (freight) {
    label = chargeableWeight > 0 ? 'Freight Shipping' : 'Freight Shipping (Included)';
    delivery = { min: 5, max: 10 };
    amount =
      chargeableWeight > 0
        ? Math.max(
            FREIGHT_BASE_CENTS,
            Math.round(chargeableWeight * (FREIGHT_PER_LB_CENTS || 0))
          )
        : 0;
  } else if (chargeableWeight <= 0) {
    label = 'Free Shipping';
    amount = 0;
  } else {
    const extraWeight = Math.max(chargeableWeight - GROUND_BASE_WEIGHT, 0);
    amount =
      GROUND_BASE_CENTS + Math.round(extraWeight * Math.max(GROUND_PER_LB_CENTS, 0));
    if (oversize) amount += OVERSIZE_SURCHARGE_CENTS;
    if (hasHazmat) amount += HAZMAT_SURCHARGE_CENTS;
  }

  const quote: ShippingQuoteResult = {
    requiresShipping,
    installOnlyCart: false,
    amount: Math.max(0, Math.round(amount)),
    label,
    delivery,
    freight,
    oversize,
    totalWeight,
    chargeableWeight: Math.max(0, chargeableWeight),
    packageCount: packages.length,
    summary: 'packages_calculated'
  };

  const summary = buildShippingSummary(quote);
  if (summary) quote.summary = summary;
  return quote;
}

async function estimateShippingForCart(cart: CheckoutCartItem[]): Promise<ShippingQuoteResult | null> {
  if (!Array.isArray(cart) || !cart.length) return null;
  const productsById = await fetchShippingProductsForCart(cart);
  return buildShippingQuote(cart, productsById);
}

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
    return jsonResponse({ error: 'Unable to determine site base URL for checkout redirects.' }, 500);
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

  const { cart } = body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return jsonResponse({ error: 'Cart is empty or invalid' }, 400);
  }

  const clamp = (value: string, max = 500) =>
    value.length > max ? value.slice(0, max) : value;

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
        ? (Array.isArray((selectionsRaw as any)?.selections)
            ? (selectionsRaw as any).selections
            : Object.entries(selectionsRaw as Record<string, unknown>).flatMap(([key, value]) =>
                Array.isArray(value) ? value.map((entry) => ({ group: key, label: entry })) : []
              ))
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

  const lineItems = (cart as CheckoutCartItem[]).map((item) => {
    const rawId = typeof item.id === 'string' ? item.id : undefined;
    const sanityProductId = normalizeCartId(rawId);
    const unitAmount = Number.isFinite(item.price)
      ? Math.max(0, Math.round(Number(item.price) * 100))
      : 0;
    if (unitAmount <= 0) {
      console.warn('[checkout] Cart item missing price, defaulting to $0.00', item);
    }
    const quantity = Math.max(1, Number.isFinite(item.quantity) ? Number(item.quantity) : 1);
    const optionDetails = formatSelectedOptions(
      item.options as Record<string, unknown> | null,
      item.selections
    );
    const upgradeValues = collectUpgrades(item.upgrades ?? item.addOns, item.selections);
    const metadata: Record<string, string> = {
      ...(item.sku ? { sku: String(item.sku) } : {}),
      ...(sanityProductId ? { sanity_product_id: sanityProductId } : {})
    };
    if (item?.name) metadata.product_name = clamp(String(item.name), 200);
    if (item?.productUrl) metadata.product_url = clamp(String(item.productUrl), 300);
    if (item?.image) metadata.product_image = clamp(String(item.image), 400);
    metadata.unit_price = Number(item.price ?? unitAmount / 100).toFixed(2);
    metadata.quantity = String(quantity);
    if (item?.signature) metadata.configuration_signature = clamp(String(item.signature), 120);

    if (optionDetails?.summary) {
      metadata.selected_options = clamp(optionDetails.summary);
      metadata.option_summary = clamp(optionDetails.summary);
    }
    if (optionDetails?.entries?.length) {
      const detailed = optionDetails.entries.map(([label, value]) => `${label}: ${value}`).join(' | ');
      metadata.options_readable = clamp(detailed);
    }
    if (optionDetails?.json) {
      metadata.selected_options_json = clamp(optionDetails.json);
      metadata.option_details_json = clamp(optionDetails.json);
    }
    if (optionDetails?.entries?.length) {
      optionDetails.entries.forEach(([label, value], idx) => {
        const index = idx + 1;
        metadata[`option${index}_name`] = clamp(label, 100);
        metadata[`option${index}_value`] = clamp(value, 200);
        const normalizedKey = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
        if (normalizedKey) {
          const keyName = `option_${normalizedKey}`;
          if (!(keyName in metadata)) metadata[keyName] = clamp(value, 200);
          if (!metadata.option_vehicle && (normalizedKey.includes('vehicle') || normalizedKey.includes('platform'))) {
            metadata.option_vehicle = clamp(value, 200);
          }
          if (normalizedKey.includes('upgrade') && !upgradeValues.includes(value)) {
            upgradeValues.push(value);
          }
        }
      });
    }
    if (upgradeValues.length) {
      const upgradeSummary = upgradeValues.join(', ');
      metadata.upgrades = clamp(upgradeSummary);
      const upgradePipe = upgradeValues.join('|');
      metadata.upgrade_list = clamp(upgradePipe);
      metadata.upgrade_titles = clamp(upgradePipe);
      upgradeValues.forEach((value, idx) => {
        metadata[`upgrade_${idx + 1}`] = clamp(value, 200);
      });
      metadata.upgrades_readable = clamp(upgradeSummary);
    }
    if (typeof item.basePrice === 'number' && Number.isFinite(item.basePrice)) {
      metadata.base_price = Number(item.basePrice).toFixed(2);
      metadata.base_price_display = `$${Number(item.basePrice).toFixed(2)}`;
    }
    if (typeof item.extra === 'number' && Number.isFinite(item.extra)) {
      metadata.option_upcharge = Number(item.extra).toFixed(2);
      metadata.option_upcharge_display = `$${Number(item.extra).toFixed(2)}`;
    }
    const descriptionParts: string[] = [];
    if (optionDetails?.summary) descriptionParts.push(optionDetails.summary);
    if (upgradeValues.length) descriptionParts.push(`Upgrades: ${upgradeValues.join(', ')}`);
    const description = descriptionParts.length ? clamp(descriptionParts.join(' • '), 250) : undefined;

    return {
      price_data: {
        currency: 'usd',
        tax_behavior: 'exclusive',
        product_data: {
          name: item.name || 'Item',
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

  let shippingQuote: ShippingQuoteResult | null = null;
  try {
    shippingQuote = await estimateShippingForCart(cart as CheckoutCartItem[]);
  } catch (error) {
    console.warn('[checkout] shipping estimation failed; falling back to flat rate', error);
  }

  const extractSlugFromUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    try {
      const trimmed = url.trim();
      if (!trimmed) return undefined;
      const noOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, '');
      const withoutQuery = noOrigin.split(/[?#]/)[0];
      const segments = withoutQuery.replace(/^\/+/, '').split('/').filter(Boolean);
      if (!segments.length) return undefined;
      const slug = segments[segments.length - 1];
      return slug || undefined;
    } catch {
      return undefined;
    }
  };

  // Persist compact cart metadata (Stripe metadata fields are strings and size-limited)
  let metaCart = '';
  let cartSummary = '';
  try {
    const summaryParts: string[] = [];
    let compact = (cart as CheckoutCartItem[]).map((i) => {
      const optionDetails = formatSelectedOptions(
        (i?.options as Record<string, unknown>) || undefined,
        i?.selections
      );
      const opts = optionDetails?.summary;
      const upgrades = collectUpgrades(i?.upgrades ?? i?.addOns, i?.selections);
      const normalizedId = normalizeCartId(typeof i?.id === 'string' ? i.id : undefined);
      const imageUrl = typeof i?.image === 'string' ? i.image : undefined;
      const productUrl = typeof i?.productUrl === 'string' ? i.productUrl : undefined;
      const slug = extractSlugFromUrl(productUrl);
      const sku = typeof i?.sku === 'string' ? i.sku : undefined;
      const meta: Record<string, string> = {};
      if (optionDetails?.summary) meta['Options'] = optionDetails.summary;
      if (optionDetails?.entries?.length) {
        meta['Options Detail'] = optionDetails.entries
          .map(([label, value]) => `${label}: ${value}`)
          .join(' | ');
      }
      if (upgrades.length) meta['Upgrades'] = upgrades.join(', ');
      if (typeof i?.basePrice === 'number' && Number.isFinite(i.basePrice)) {
        meta['Base Price'] = `$${Number(i.basePrice).toFixed(2)}`;
      }
      if (typeof i?.extra === 'number' && Number.isFinite(i.extra)) {
        meta['Option Upcharge'] = `$${Number(i.extra).toFixed(2)}`;
      }
      if (typeof i?.price === 'number' && Number.isFinite(i.price)) {
        meta['Unit Price'] = `$${Number(i.price).toFixed(2)}`;
      }
      if (typeof i?.quantity === 'number' && Number.isFinite(i.quantity)) {
        meta['Quantity'] = String(i.quantity);
      }
      if (i?.signature) meta['Configuration Signature'] = String(i.signature);
      if (productUrl) meta['Product URL'] = productUrl;
      if (imageUrl) meta['Image URL'] = imageUrl;
      if (slug) meta['Product Slug'] = slug;
      Object.keys(meta).forEach((key) => {
        const value = meta[key];
        if (typeof value === 'string' && value.length > 200) {
          meta[key] = value.slice(0, 200);
        }
      });

      const summaryBits: string[] = [];
      if (i?.name) summaryBits.push(String(i.name));
      if (opts) summaryBits.push(`Options: ${opts}`);
      if (upgrades.length) summaryBits.push(`Upgrades: ${upgrades.join(', ')}`);
      if (typeof i?.quantity === 'number' && Number.isFinite(i.quantity)) {
        summaryBits.push(`Qty: ${i.quantity}`);
      }
      if (summaryBits.length) summaryParts.push(summaryBits.join(' — '));

      const entry: Record<string, unknown> = {
        ...(normalizedId ? { i: normalizedId } : {}),
        ...(sku ? { sku } : {}),
        ...(imageUrl ? { img: imageUrl } : {}),
        ...(productUrl ? { url: productUrl } : {}),
        ...(slug ? { slug } : {}),
        n: i?.name,
        q: i?.quantity,
        p: i?.price,
        ...(opts ? { o: opts.slice(0, 160) } : {}),
        ...(upgrades.length ? { u: upgrades.join(', ').slice(0, 160) } : {})
      };
      if (Object.keys(meta).length) entry.meta = meta;
      return entry;
    });
    let serialized = JSON.stringify(compact);
    if (serialized.length > 460) {
      compact = compact.map((entry) => {
        if (entry && typeof entry === 'object' && 'meta' in entry) {
          const { meta: _meta, ...rest } = entry as Record<string, unknown>;
          return rest;
        }
        return entry;
      });
      serialized = JSON.stringify(compact);
    }
    if (serialized.length > 460) serialized = serialized.slice(0, 460);
    metaCart = serialized;
    if (summaryParts.length) {
      const joined = summaryParts.join(' | ');
      cartSummary = joined.length > 480 ? joined.slice(0, 480) : joined;
    }
  } catch (error) {
    void error;
  }

  // Derive optional user identity for reliable joins in webhook
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { session } = await readSession(request);
    if (session?.user) {
      userId = String(session.user.id || '');
      userEmail = String(session.user.email || '');
    }
  } catch (error) {
    void error;
  }

  const allowedCountries = resolveAllowedCountries();
  try {
    const shippingAddressCollection: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection = {
      allowed_countries: allowedCountries
    };

    const customerEmail = userEmail || undefined;

    const baseMetadata: Record<string, string> = {
      ...(userId ? { userId } : {}),
      ...(userEmail ? { userEmail } : {}),
      site: baseUrl
    };

    const metadataForSession: Record<string, string> = {
      ...baseMetadata,
      ...(cartSummary ? { cart_summary: cartSummary } : {}),
      ...(metaCart ? { cart: metaCart } : {})
    };

    const paymentIntentMetadata = { ...metadataForSession };

    const defaultShippingOption: Stripe.Checkout.SessionCreateParams.ShippingOption = {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 995, currency: 'usd' },
        display_name: 'Standard Shipping',
        delivery_estimate: makeDeliveryEstimate(3, 5)
      }
    };

    let shippingMode = 'fallback_flat_rate';
    let shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] | null =
      [defaultShippingOption];

    if (shippingQuote) {
      if (shippingQuote.requiresShipping) {
        const deliveryEstimate = shippingQuote.delivery
          ? makeDeliveryEstimate(shippingQuote.delivery.min, shippingQuote.delivery.max)
          : undefined;
        shippingOptions = [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: shippingQuote.amount, currency: 'usd' },
              display_name: shippingQuote.label || (shippingQuote.freight ? 'Freight Shipping' : 'Standard Shipping'),
              ...(deliveryEstimate ? { delivery_estimate: deliveryEstimate } : {})
            }
          }
        ];
      } else {
        shippingOptions = null;
      }

      shippingMode = shippingQuote.requiresShipping
        ? shippingQuote.amount === 0
          ? shippingQuote.freight
            ? 'freight_included'
            : 'free_shipping'
          : shippingQuote.freight
            ? 'freight'
            : 'standard'
        : shippingQuote.installOnlyCart
          ? 'install_only'
          : 'no_shipping';
    }

    const shippingSummaryValue =
      shippingQuote?.summary ||
      (shippingOptions ? 'flat_rate_995' : 'no_shipping_required');
    if (shippingSummaryValue) {
      const summaryClamped = clamp(shippingSummaryValue, 480);
      metadataForSession.shipping_summary = summaryClamped;
      paymentIntentMetadata.shipping_summary = summaryClamped;
    }
    metadataForSession.shipping_mode = shippingMode;
    paymentIntentMetadata.shipping_mode = shippingMode;
    if (shippingQuote) {
      metadataForSession.shipping_total_weight_lbs = shippingQuote.totalWeight.toFixed(2);
      metadataForSession.shipping_chargeable_lbs = shippingQuote.chargeableWeight.toFixed(2);
      paymentIntentMetadata.shipping_total_weight_lbs =
        metadataForSession.shipping_total_weight_lbs;
      paymentIntentMetadata.shipping_chargeable_lbs =
        metadataForSession.shipping_chargeable_lbs;
    }

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
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      shipping_address_collection: shippingAddressCollection,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`
    };

    if (shippingOptions) {
      sessionParams.shipping_options = shippingOptions;
    }

    // Guard rail: Stripe rejects automatic tax when payment_intent_data.shipping is present.
    if (sessionParams.payment_intent_data && 'shipping' in sessionParams.payment_intent_data) {
      delete (sessionParams.payment_intent_data as { shipping?: unknown }).shipping;
    }

    sessionParams.customer_creation = 'if_required';
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
