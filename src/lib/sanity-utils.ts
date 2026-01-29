// src/lib/sanity-utils.ts
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

type SanityFetch = <T>(query: string, params?: Record<string, any>) => Promise<T>;
interface SanityClientLite {
  fetch: SanityFetch;
}

const toBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['true', '1', 'yes', 'on', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', 'disabled'].includes(normalized)) return false;
  }
  return false;
};

// Initialize Sanity client (support both PUBLIC_* and server-side SANITY_* envs)
const projectId =
  (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
  (import.meta.env.SANITY_PROJECT_ID as string | undefined);
const dataset =
  (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
  (import.meta.env.SANITY_DATASET as string | undefined) ||
  'production';
const apiVersion = '2024-01-01';

const imageBuilder = projectId && dataset ? imageUrlBuilder({ projectId, dataset }) : null;

const SANITY_CDN_HOSTS = new Set(['cdn.sanity.io', 'cdn.sanityusercontent.com']);
const BASE_PUBLISHED_PRODUCT_FILTER = '!(_id in path("drafts.**")) && status == "active"';
const PRODUCT_TYPE_OR_FEATURED_FILTER =
  '(productType == "service" || productType == "bundle" || productType == "physical" || featured == true)';
export const ACTIVE_PRODUCT_FILTER = `${BASE_PUBLISHED_PRODUCT_FILTER} && ${PRODUCT_TYPE_OR_FEATURED_FILTER}`;
export const ACTIVE_PRODUCT_WITH_SLUG_FILTER = `${ACTIVE_PRODUCT_FILTER} && defined(slug.current)`;
export const SERVICE_PRODUCT_FILTER = `${BASE_PUBLISHED_PRODUCT_FILTER} && productType == "service"`;
export const SERVICE_PRODUCT_WITH_SLUG_FILTER = `${SERVICE_PRODUCT_FILTER} && defined(slug.current)`;
const STORE_PRODUCT_WITH_SLUG_FILTER = `${ACTIVE_PRODUCT_WITH_SLUG_FILTER}`;
const SERVICE_STORE_PRODUCT_WITH_SLUG_FILTER = `${BASE_PUBLISHED_PRODUCT_FILTER} && productType == "service" && defined(slug.current)`;
const FINAL_PRICE_EXPRESSION = `coalesce(
  select(
    coalesce(onSale, pricing.onSale) && defined(coalesce(salePrice, pricing.salePrice)) => coalesce(salePrice, pricing.salePrice),
    coalesce(price, pricing.price)
  ),
  coalesce(price, pricing.price),
  0
)`;
const FEATURED_PRODUCT_FILTER = 'string(featured) == "true"';
const GROQ_OPTION_VALUES_FRAGMENT = `array::compact(
        coalesce(values, []) +
        coalesce(items, []) +
        coalesce(options, []) +
        coalesce(optionItems, []) +
        coalesce(optionValues, []) +
        coalesce(optionChoices, []) +
        coalesce(choices, []) +
        coalesce(entries, []) +
        coalesce(entryOptions, []) +
        coalesce(variants, []) +
        coalesce(variantOptions, []) +
        coalesce(variationOptions, []) +
        coalesce(valueOptions, []) +
        coalesce(valueChoices, []) +
        coalesce(variations, []) +
        coalesce(colors, []) +
        coalesce(colorValues, []) +
        coalesce(sizes, []) +
        coalesce(sizeValues, []) +
        coalesce(custom.values, []) +
        coalesce(custom.options, []) +
        coalesce(custom.items, []) +
        coalesce(custom.choices, []) +
        coalesce(custom.entries, []) +
        coalesce(custom.variants, []) +
        coalesce(custom.variantOptions, []) +
        coalesce(custom.variationOptions, []) +
        coalesce(custom.valueOptions, []) +
        coalesce(custom.valueChoices, []) +
        coalesce(custom.colors, []) +
        coalesce(custom.sizes, []) +
        coalesce(custom.colorValues, []) +
        coalesce(custom.sizeValues, []) +
        coalesce(color.values, []) +
        coalesce(color.options, []) +
        coalesce(color.items, []) +
        coalesce(color.colors, []) +
        coalesce(size.values, []) +
        coalesce(size.options, []) +
        coalesce(size.items, []) +
        coalesce(size.sizes, []) +
        coalesce(customOption.values, []) +
        coalesce(customOption.options, []) +
        coalesce(customOption.items, []) +
        coalesce(customOption.choices, []) +
        coalesce(customOption.colors, []) +
        coalesce(customOption.sizes, []) +
        coalesce(customOptions.values, []) +
        coalesce(customOptions.options, []) +
        coalesce(customOptions.items, []) +
        coalesce(customOptions.choices, []) +
        coalesce(customOptions.colors, []) +
        coalesce(customOptions.sizes, []) +
        []
      )`;
const GROQ_OPTION_OBJECT_PROJECTION = `[]{
        ...,
        _type,
        "required": coalesce(
          required,
          custom.required,
          color.required,
          size.required,
          customOption.required,
          customOptions.required,
          false
        ),
        "values": ${GROQ_OPTION_VALUES_FRAGMENT}
      }`;

export interface SanityImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'jpeg' | 'png' | 'auto';
  fit?: 'clip' | 'crop' | 'fill' | 'max' | 'min' | 'scale';
  dpr?: number;
  blur?: number;
  sharpen?: number;
}

const DEFAULT_SANITY_IMAGE_PARAMS: Required<
  Pick<SanityImageTransformOptions, 'quality' | 'fit'>
> & {
  auto: 'format';
} = Object.freeze({
  auto: 'format',
  fit: 'max',
  quality: 82
});

export const optimizeSanityImageUrl = (
  rawUrl: string | null | undefined,
  overrides: SanityImageTransformOptions = {}
): string | undefined => {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (!SANITY_CDN_HOSTS.has(url.hostname) || !url.pathname.includes('/images/')) {
      return url.toString();
    }

    const params = url.searchParams;

    if (overrides.format && overrides.format !== 'auto') {
      params.set('fm', overrides.format);
      params.delete('auto');
    } else if (!params.has('auto')) {
      params.set('auto', DEFAULT_SANITY_IMAGE_PARAMS.auto);
    }

    if (overrides.fit) {
      params.set('fit', overrides.fit);
    } else if (!params.has('fit')) {
      params.set('fit', DEFAULT_SANITY_IMAGE_PARAMS.fit);
    }

    if (overrides.width) {
      params.set('w', String(Math.max(1, Math.round(overrides.width))));
    }
    if (overrides.height) {
      params.set('h', String(Math.max(1, Math.round(overrides.height))));
    }

    if (overrides.quality) {
      params.set('q', String(Math.min(100, Math.max(1, Math.round(overrides.quality)))));
    } else if (!params.has('q')) {
      params.set('q', String(DEFAULT_SANITY_IMAGE_PARAMS.quality));
    }

    if (overrides.dpr) {
      params.set('dpr', String(Math.max(1, Math.round(overrides.dpr))));
    }
    if (overrides.blur) {
      params.set('blur', String(Math.max(0, Math.round(overrides.blur))));
    }
    if (overrides.sharpen) {
      params.set('sharpen', String(Math.max(0, Math.round(overrides.sharpen))));
    }

    url.search = params.toString();
    return url.toString();
  } catch {
    return trimmed;
  }
};

const studioUrlRaw =
  (import.meta.env.PUBLIC_SANITY_STUDIO_URL as string | undefined) ||
  (import.meta.env.PUBLIC_STUDIO_URL as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_URL as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_NETLIFY_BASE as string | undefined) ||
  undefined;
const studioUrl =
  typeof studioUrlRaw === 'string' && studioUrlRaw.trim() ? studioUrlRaw : undefined;

const previewDraftsRequested = toBooleanFlag(
  (import.meta.env.PUBLIC_SANITY_PREVIEW_DRAFTS as string | undefined) ?? 'false'
);

const isServer = Boolean(import.meta.env.SSR);
const apiToken = isServer
  ? (import.meta.env.SANITY_API_READ_TOKEN as string | undefined) ||
    (import.meta.env.SANITY_API_TOKEN as string | undefined) ||
    (import.meta.env.SANITY_WRITE_TOKEN as string | undefined) ||
    undefined
  : undefined;

let previewDraftsEnabled = Boolean(previewDraftsRequested);
if (previewDraftsEnabled && !apiToken) {
  console.warn(
    '[sanity-utils] Preview drafts requested but no SANITY_API_READ_TOKEN (or SANITY_API_TOKEN) was found; falling back to published content.'
  );
  previewDraftsEnabled = false;
}

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const numeric = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return fallback;
};

const manualCacheDisableFlag =
  toBooleanFlag((import.meta.env.SANITY_DISABLE_CACHE as string | undefined) ?? 'false') ||
  toBooleanFlag((import.meta.env.PUBLIC_SANITY_DISABLE_CACHE as string | undefined) ?? 'false');
const manualCacheEnableFlagRaw =
  (import.meta.env.SANITY_ENABLE_CACHE as string | undefined) ||
  (import.meta.env.PUBLIC_SANITY_ENABLE_CACHE as string | undefined);
const manualCacheEnableFlag =
  manualCacheEnableFlagRaw === undefined ? true : toBooleanFlag(manualCacheEnableFlagRaw);

export const sanityCacheEnabled =
  !manualCacheDisableFlag && manualCacheEnableFlag && !import.meta.env.DEV && !previewDraftsEnabled;

const DEFAULT_SANITY_CACHE_TTL_SECONDS = parsePositiveInt(
  (import.meta.env.SANITY_CACHE_TTL_SECONDS as string | undefined) ||
    (import.meta.env.PUBLIC_SANITY_CACHE_TTL_SECONDS as string | undefined) ||
    0,
  300
);

type SanityCacheEntry = {
  value?: unknown;
  expiresAt: number;
  promise?: Promise<unknown>;
};

type SanityCacheStore = Map<string, SanityCacheEntry>;

const SANITY_CACHE_SYMBOL = Symbol.for('__fasSanityCacheStore__');

const getSanityCacheStore = (): SanityCacheStore => {
  const globalTarget = globalThis as typeof globalThis & {
    [SANITY_CACHE_SYMBOL]?: SanityCacheStore;
  };
  if (!globalTarget[SANITY_CACHE_SYMBOL]) {
    globalTarget[SANITY_CACHE_SYMBOL] = new Map<string, SanityCacheEntry>();
  }
  return globalTarget[SANITY_CACHE_SYMBOL]!;
};

const stableStringify = (value: unknown): string => {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'undefined':
      return 'undefined';
    case 'number':
    case 'boolean':
      return JSON.stringify(value);
    case 'string':
      return JSON.stringify(value);
    case 'bigint':
      return `"${(value as bigint).toString()}"`;
    case 'symbol':
    case 'function':
      return `"${String(value)}"`;
    default:
      break;
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const entries = Object.entries(objectValue)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
};

export interface SanityCacheOptions {
  ttlSeconds?: number;
  forceRefresh?: boolean;
}

export const cachedSanityFetch = async <T>(
  keyParts: unknown[],
  fetcher: () => Promise<T>,
  options: SanityCacheOptions = {}
): Promise<T> => {
  const shouldUseCache = sanityCacheEnabled && !options.forceRefresh;
  const cacheStore = shouldUseCache ? getSanityCacheStore() : null;
  const ttlSeconds =
    options.ttlSeconds !== undefined
      ? Math.max(0, Math.floor(options.ttlSeconds))
      : DEFAULT_SANITY_CACHE_TTL_SECONDS;

  const cacheKey = shouldUseCache ? keyParts.map((part) => stableStringify(part)).join('|') : null;

  if (shouldUseCache && cacheStore && cacheKey) {
    const entry = cacheStore.get(cacheKey);
    const now = Date.now();
    if (entry) {
      if (entry.value !== undefined && entry.expiresAt > now) {
        return entry.value as T;
      }
      if (entry.promise) {
        return entry.promise as Promise<T>;
      }
    }

    if (ttlSeconds <= 0) {
      return fetcher();
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        cacheStore.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + ttlSeconds * 1000
        });
        return result;
      } catch (err) {
        if (entry && entry.value !== undefined && entry.expiresAt > now) {
          cacheStore.set(cacheKey, entry);
        } else {
          cacheStore.delete(cacheKey);
        }
        throw err;
      }
    })();

    cacheStore.set(cacheKey, {
      value: entry?.value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      promise
    });

    return promise;
  }

  return fetcher();
};

const perspective = previewDraftsEnabled ? 'drafts' : 'published';

// Gracefully handle missing env vars in preview/editor environments
const hasSanityConfig = Boolean(projectId && dataset);
if (!hasSanityConfig) {
  console.warn(
    '[sanity-utils] Missing PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_DATASET; Sanity client disabled.'
  );
}

const clientOptions: Parameters<typeof createClient>[0] = {
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective
};

// Always attach a token when available so private datasets work in production,
// and still honor preview draft rendering when requested.
if (apiToken) {
  clientOptions.token = apiToken;
}

export const sanity: SanityClientLite | null = hasSanityConfig
  ? (createClient(clientOptions) as unknown as SanityClientLite)
  : null;

// Back-compat aliases for callers expecting different names
export const sanityClient = sanity as any;
export const client = sanity as any;
export const getClient = () => sanity as any;

export const config = {
  projectId,
  dataset,
  apiVersion,
  perspective,
  studioUrl
} as const;
export const clientConfig = config;
export const defaultClientConfig = config;
export const previewDraftsActive = previewDraftsEnabled;

// Define interfaces
export interface Product {
  _id: string;
  title: string;
  displayTitle?: string | null;
  slug: { current: string };
  price?: number | null;
  stripePriceId?: string | null;
  medusaVariantId?: string | null;
  onSale?: boolean | null;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  discountPercentage?: number | null;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  saleLabel?: string | null;
  saleActive?: boolean | null;
  pricing?: {
    price?: number | null;
    salePrice?: number | null;
    compareAtPrice?: number | null;
    discountPercentage?: number | null;
    discountPercent?: number | null;
    saleStartDate?: string | null;
    saleEndDate?: string | null;
    saleLabel?: string | null;
    saleActive?: boolean | null;
    onSale?: boolean | null;
  };
  sku?: string;
  description?: string;
  shortDescription?: any;
  fitmentYears?: string | string[];
  fitment?: string;
  fitmentRange?: string;
  primaryKeyword?: string;
  seo?: {
    fitmentYears?: string | string[];
    fitment?: string;
    fitmentText?: string;
    primaryKeyword?: string;
    keyword?: string;
    keyphrase?: string;
    targetKeyword?: string;
    benefits?: string;
    highlights?: string;
    valueProps?: string;
    callToAction?: string;
    cta?: string;
    ctaText?: string;
  };
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  brand?: string;
  gtin?: string;
  mpn?: string;
  shippingClass?: string;
  shippingWeight?: number;
  images: {
    asset: {
      _id: string;
      url: string;
    };
    alt?: string;
  }[];
  categories: {
    _id: string;
    title: string;
    slug: { current: string };
  }[];
  tune?: {
    title: string;
    slug: { current: string };
  };
  compatibleVehicles?: {
    make: string;
    model: string;
    trim?: string;
    slug: { current: string };
  }[];
  filters?: string[];
  specifications?: { key: string; value: string }[];
  attributes?: { key: string; value: string }[];
  productType?: string;
  requiresPaintCode?: boolean;
  importantNotes?: any;
  socialImage?: { asset: { _id: string; url: string }; alt?: string };
  addOns?: Array<{
    label?: string;
    priceDelta?: number;
    description?: string;
    skuSuffix?: string;
    defaultSelected?: boolean;
    group?: string;
    key?: string;
    name?: string;
    title?: string;
    value?: string;
    price?: number;
    delta?: number;
  }>;
  customPaint?: {
    enabled?: boolean;
    additionalPrice?: number;
    paintCodeRequired?: boolean;
    codeLabel?: string;
    instructions?: string;
  };
  variationOptions?: any[];
  optionGroups?: any[];
  variations?: any[];
  options?: any[];
}

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
  imageUrl?: string;
  description?: string;
}

export interface Tune {
  _id: string;
  title: string;
  slug: { current: string };
}

export interface Vehicle {
  _id: string;
  title: string;
  slug: { current: string };
}

type QueryParamValue = string | number | boolean | string[] | number[] | null;
type QueryParams = Record<string, QueryParamValue>;

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// normalizeSlugValue is exported for reuse across pages/components
export const normalizeSlugValue = (value: unknown): string => {
  const raw =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && typeof (value as any).current === 'string'
        ? (value as any).current
        : '';
  if (!raw) return '';
  const trimmed = raw.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return '';

  const decodedOnce = safeDecodeURIComponent(trimmed);
  const decodedTwice = safeDecodeURIComponent(decodedOnce);
  const finalValue = decodedTwice || decodedOnce || trimmed;

  return finalValue.trim();
};

const normalizeUrlString = (value: string | undefined | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('//')) {
    const httpsUrl = `https:${trimmed}`;
    return optimizeSanityImageUrl(httpsUrl) ?? httpsUrl;
  }
  if (/^https:\/\//i.test(trimmed)) {
    return optimizeSanityImageUrl(trimmed) ?? trimmed;
  }
  if (/^http:\/\//i.test(trimmed)) {
    const httpsUrl = `https://${trimmed.slice('http://'.length)}`;
    return optimizeSanityImageUrl(httpsUrl) ?? httpsUrl;
  }
  if (/^image-/i.test(trimmed) && imageBuilder) {
    try {
      const built = imageBuilder
        .image(trimmed)
        .auto('format')
        .fit('max')
        .quality(DEFAULT_SANITY_IMAGE_PARAMS.quality)
        .url();
      return optimizeSanityImageUrl(built) ?? built;
    } catch {
      return undefined;
    }
  }
  return trimmed;
};

const DIRECT_IMAGE_KEYS = [
  'url',
  'imageUrl',
  'imageURL',
  'image_url',
  'src',
  'href',
  'assetUrl',
  'assetURL',
  'downloadUrl',
  'downloadURL',
  'thumbUrl',
  'thumbnail',
  'thumbnailUrl',
  'thumb',
  'photo',
  'value',
  'current',
  'path'
] as const;

export const resolveSanityImageUrl = (
  candidate: unknown,
  seen = new Set<unknown>()
): string | undefined => {
  if (candidate == null) return undefined;
  if (typeof candidate === 'string') {
    return normalizeUrlString(candidate);
  }

  if (seen.has(candidate)) return undefined;

  if (Array.isArray(candidate)) {
    seen.add(candidate);
    for (const entry of candidate) {
      const resolved = resolveSanityImageUrl(entry, seen);
      if (resolved) return resolved;
    }
    return undefined;
  }

  if (typeof candidate !== 'object') return undefined;

  seen.add(candidate);

  const obj = candidate as Record<string, unknown>;

  for (const key of DIRECT_IMAGE_KEYS) {
    if (key in obj) {
      const resolved = resolveSanityImageUrl(obj[key], seen);
      if (resolved) return resolved;
    }
  }

  if ('asset' in obj) {
    const resolved = resolveSanityImageUrl(obj.asset, seen);
    if (resolved) return resolved;
  }

  if (typeof obj._ref === 'string') {
    const built = normalizeUrlString(obj._ref);
    if (built && /^https?:/i.test(built)) {
      return built;
    }
  }

  if (typeof obj._id === 'string') {
    const built = normalizeUrlString(obj._id);
    if (built && /^https?:/i.test(built)) {
      return built;
    }
  }

  return undefined;
};

export const normalizeSanityImageUrl = (candidate: unknown): string | undefined =>
  resolveSanityImageUrl(candidate);

const normalizeImageEntry = (value: unknown): unknown => {
  if (value == null) return value;
  if (typeof value === 'string') {
    return normalizeUrlString(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeImageEntry(entry));
  }

  if (typeof value === 'object') {
    const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of DIRECT_IMAGE_KEYS) {
      if (typeof clone[key] === 'string') {
        const normalized = normalizeUrlString(clone[key] as string);
        if (normalized && normalized !== clone[key]) {
          clone[key] = normalized;
        }
      }
    }

    if (clone.asset && typeof clone.asset === 'object') {
      const assetClone: Record<string, unknown> = { ...(clone.asset as Record<string, unknown>) };
      const assetUrl = resolveSanityImageUrl(assetClone);
      if (assetUrl) {
        assetClone.url = assetUrl;
        if (!clone.url || typeof clone.url !== 'string') {
          clone.url = assetUrl;
        }
      }
      clone.asset = assetClone;
    } else {
      const resolved = resolveSanityImageUrl(clone);
      if (resolved) {
        clone.url = resolved;
      }
    }

    return clone;
  }

  return value;
};

export const coercePriceToNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.,-]+/g, '').replace(/,/g, '');
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeProductPrice = <
  T extends { price?: unknown; images?: unknown; socialImage?: unknown }
>(
  product: T
): T => {
  if (!product) return product;
  const normalizedPrice = coercePriceToNumber(
    (product as any).price ?? (product as any)?.pricing?.price
  );
  const normalizedSalePrice = coercePriceToNumber(
    (product as any).salePrice ?? (product as any)?.pricing?.salePrice
  );
  const normalizedCompareAt = coercePriceToNumber(
    (product as any).compareAtPrice ?? (product as any)?.pricing?.compareAtPrice
  );
  const clone: Record<string, unknown> = { ...(product as any) };
  if (normalizedPrice === null) {
    delete clone.price;
  } else {
    clone.price = normalizedPrice;
  }

  if (normalizedSalePrice === null) {
    if ('salePrice' in clone) delete clone.salePrice;
  } else {
    clone.salePrice = normalizedSalePrice;
  }

  if (normalizedCompareAt === null) {
    if ('compareAtPrice' in clone) delete clone.compareAtPrice;
  } else {
    clone.compareAtPrice = normalizedCompareAt;
  }

  if ('pricing' in clone && clone.pricing && typeof clone.pricing === 'object') {
    const pricing = { ...(clone.pricing as Record<string, unknown>) };
    if (normalizedPrice !== null) pricing.price = normalizedPrice;
    if (normalizedSalePrice !== null) pricing.salePrice = normalizedSalePrice;
    if (normalizedCompareAt !== null) pricing.compareAtPrice = normalizedCompareAt;
    clone.pricing = pricing;
  }

  if ('images' in clone) {
    const value = clone.images;
    clone.images = Array.isArray(value)
      ? value.map((entry: unknown) => normalizeImageEntry(entry))
      : normalizeImageEntry(value);
  }

  if ('socialImage' in clone && clone.socialImage !== undefined) {
    clone.socialImage = normalizeImageEntry(clone.socialImage);
  }

  if ('includedInKit' in clone && Array.isArray(clone.includedInKit)) {
    clone.includedInKit = (clone.includedInKit as unknown[]).map((item) => {
      if (!item || typeof item !== 'object') return item;
      const entry = { ...(item as Record<string, unknown>) };
      if ('image' in entry) {
        entry.image = normalizeImageEntry(entry.image);
      }
      if ('imageUrl' in entry) {
        const normalizedUrl = normalizeSanityImageUrl(entry.imageUrl);
        if (normalizedUrl) {
          entry.imageUrl = normalizedUrl;
        }
      }
      return entry;
    });
  }

  return clone as T;
};

const normalizeCategoryEntry = <T extends { imageUrl?: unknown }>(category: T): T => {
  if (!category) return category;
  const clone: Record<string, unknown> = { ...(category as any) };
  const normalized = normalizeSanityImageUrl(clone.imageUrl);
  if (normalized) {
    clone.imageUrl = normalized;
  }
  return clone as T;
};

const PRODUCT_LISTING_PROJECTION = `{
  _id,
  title,
  displayTitle,
  slug,
  metaTitle,
  metaDescription,
  price,
  stripePriceId,
  "medusaVariantId": coalesce(medusaVariantId, medusaVariantID),
  "onSale": coalesce(onSale, pricing.onSale),
  "salePrice": coalesce(salePrice, pricing.salePrice),
  "compareAtPrice": coalesce(compareAtPrice, pricing.compareAtPrice),
  "discountPercent": coalesce(discountPercent, discountPercentage, pricing.discountPercentage),
  "discountPercentage": coalesce(discountPercentage, discountPercent, pricing.discountPercentage),
  "saleStartDate": coalesce(saleStartDate, pricing.saleStartDate),
  "saleEndDate": coalesce(saleEndDate, pricing.saleEndDate),
  "saleLabel": coalesce(saleLabel, pricing.saleLabel),
  "saleActive": pricing.saleActive,
  "finalPrice": ${FINAL_PRICE_EXPRESSION},
  description,
  shortDescription,
  importantNotes,
  brand,
  gtin,
  mpn,
  canonicalUrl,
  noindex,
  socialImage{ asset->{ _id, url }, alt },
  specifications,
  attributes,
  includedInKit[]{ item, quantity, notes },
  productType,
  requiresPaintCode,
  featured,
  status,
  images[]{
    asset->{
      _id,
      url,
      metadata{
        dimensions{
          width,
          height,
          aspectRatio
        }
      }
    },
    alt
  },
  tune->{ title, slug },
  compatibleVehicles[]->{ make, model, slug },
  tags,
  // include free-form filter tags from schema
  filters[]->{
    _id,
    title,
    slug
  },
  // surface selection data for quick view (normalize nested choice arrays)
  options${GROQ_OPTION_OBJECT_PROJECTION},
  optionGroups${GROQ_OPTION_OBJECT_PROJECTION},
  variationOptions${GROQ_OPTION_OBJECT_PROJECTION},
  variations[],
  addOns[]{
    label,
    priceDelta,
    description,
    skuSuffix,
    defaultSelected,
    group,
    key,
    name,
    title,
    value,
    price,
    delta
  },
  customPaint{
    enabled,
    additionalPrice,
    paintCodeRequired,
    codeLabel,
    instructions
  },
  // support either field name: "categories" or "category"
  "categories": select(
    defined(categories) => categories[]->{ _id, title, slug },
    defined(category) => category[]->{ _id, title, slug }
  )
}`;

// Fetch all products
export async function fetchProductsFromSanity({
  categorySlug,
  tuneSlug,
  vehicleSlug,
  vehicleSlugs
}: {
  categorySlug?: string;
  tuneSlug?: string;
  vehicleSlug?: string;
  vehicleSlugs?: string[];
}): Promise<Product[]> {
  try {
    if (!hasSanityConfig) return [];
    const conditions: string[] = [ACTIVE_PRODUCT_WITH_SLUG_FILTER];
    const params: QueryParams = {};

    if (categorySlug) {
      conditions.push(`references(*[_type == "category" && slug.current == $categorySlug]._id)`);
      params.categorySlug = categorySlug;
    }
    // Do not restrict by category when none is selected; show all products
    if (tuneSlug) {
      conditions.push(`tune->slug.current == $tuneSlug`);
      params.tuneSlug = tuneSlug;
    }
    const normalizedVehicleSlugs =
      Array.isArray(vehicleSlugs) && vehicleSlugs.length
        ? Array.from(
            new Set(
              vehicleSlugs
                .map((slug) => (typeof slug === 'string' ? slug.trim().toLowerCase() : ''))
                .filter(Boolean)
            )
          )
        : null;

    if (normalizedVehicleSlugs && normalizedVehicleSlugs.length) {
      conditions.push(`count((compatibleVehicles[]->slug.current)[@ in $vehicleSlugs]) > 0`);
      params.vehicleSlugs = normalizedVehicleSlugs;
    } else if (vehicleSlug) {
      const normalizedSlug =
        typeof vehicleSlug === 'string' ? vehicleSlug.trim().toLowerCase() : '';
      if (normalizedSlug) {
        conditions.push(`$vehicleSlug in compatibleVehicles[]->slug.current`);
        params.vehicleSlug = normalizedSlug;
      }
    }
    const query = `*[_type == "product"${conditions.length ? ` && ${conditions.join(' && ')}` : ''}]${PRODUCT_LISTING_PROJECTION}`;

    if (!sanity) return [];

    const executeQuery = async () => {
      const results = await sanity!.fetch<Product[]>(query, params);
      return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
    };

    return cachedSanityFetch(
      [
        'fetchProductsFromSanity',
        config.projectId,
        config.dataset,
        perspective,
        conditions,
        params
      ],
      executeQuery
    );
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return [];
  }
}

export interface StorefrontProductFilters {
  categorySlug?: string;
  filterSlugs?: string[];
  vehicleSlug?: string;
  vehicleSlugs?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  searchTerm?: string | null;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'featured' | 'name';
  page?: number;
  pageSize?: number;
  saleOnly?: boolean;
}

// Internal lowercase-normalizer for filter params; keep name distinct to avoid symbol collisions
const normalizeFilterSlug = (value?: string | null) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeSlugList = (values?: string | string[] | null) => {
  if (!values) return null;
  const arr = Array.isArray(values) ? values : String(values).split(',');
  const normalized = Array.from(
    new Set(arr.map((entry) => normalizeFilterSlug(entry)).filter(Boolean))
  );
  return normalized.length ? normalized : null;
};

export async function fetchFilteredProducts(
  filters: StorefrontProductFilters = {},
  options: { includeServices?: boolean } = {}
): Promise<Product[]> {
  try {
    if (!hasSanityConfig || !sanity) return [];

    const {
      categorySlug = null,
      filterSlugs,
      vehicleSlug,
      vehicleSlugs,
      minPrice = null,
      maxPrice = null,
      searchTerm = null,
      sortBy = 'featured',
      page = 1,
      pageSize = 12,
      saleOnly = false
    } = filters;
    const { includeServices = false } = options;

    let orderExpression = 'featured desc, _createdAt desc';
    switch (sortBy) {
      case 'price-asc':
        orderExpression = 'finalPrice asc';
        break;
      case 'price-desc':
        orderExpression = 'finalPrice desc';
        break;
      case 'newest':
        orderExpression = '_createdAt desc';
        break;
      case 'name':
        orderExpression = 'lower(title) asc';
        break;
      case 'featured':
      default:
        orderExpression = 'featured desc, _createdAt desc';
        break;
    }

    const normalizedCategorySlug = categorySlug ? normalizeFilterSlug(categorySlug) : null;
    const normalizedFilterSlugs = normalizeSlugList(filterSlugs);
    const normalizedVehicleSlugs =
      normalizeSlugList(vehicleSlugs) ??
      (vehicleSlug && normalizeFilterSlug(vehicleSlug) ? [normalizeFilterSlug(vehicleSlug)] : null);

    const start = Math.max(0, (Math.max(1, page) - 1) * Math.max(1, pageSize));
    const end = start + Math.max(1, pageSize);
    const productFilter = includeServices
      ? SERVICE_STORE_PRODUCT_WITH_SLUG_FILTER
      : STORE_PRODUCT_WITH_SLUG_FILTER;

    const query = `
      *[_type == "product" 
        && ${productFilter}
        && ($categorySlug == null || $categorySlug in category[]->slug.current || $categorySlug in categories[]->slug.current)
        && ($filterSlugs == null || count((filters[]->slug.current)[@ in $filterSlugs]) > 0 || count((filters[])[@ in $filterSlugs]) > 0 || count((filterTitles[])[@ in $filterSlugs]) > 0)
        && ($vehicleSlugs == null || count((compatibleVehicles[]->slug.current)[@ in $vehicleSlugs]) > 0)
        && ($minPrice == null || ${FINAL_PRICE_EXPRESSION} >= $minPrice)
        && ($maxPrice == null || ${FINAL_PRICE_EXPRESSION} <= $maxPrice)
        && ($saleOnly == false || (coalesce(onSale, pricing.onSale) == true && defined(coalesce(salePrice, pricing.salePrice))))
        && ($searchTerm == null || 
            lower(title) match lower("*" + $searchTerm + "*") || 
            lower(tags[]) match lower("*" + $searchTerm + "*"))
      ] ${PRODUCT_LISTING_PROJECTION} | order(${orderExpression})[$start...$end]
    `;

    const params: QueryParams = {
      categorySlug: normalizedCategorySlug,
      filterSlugs: normalizedFilterSlugs,
      vehicleSlugs: normalizedVehicleSlugs,
      minPrice: typeof minPrice === 'number' && Number.isFinite(minPrice) ? minPrice : null,
      maxPrice: typeof maxPrice === 'number' && Number.isFinite(maxPrice) ? maxPrice : null,
      searchTerm: typeof searchTerm === 'string' && searchTerm.trim() ? searchTerm.trim() : null,
      sortBy,
      start,
      end,
      saleOnly: Boolean(saleOnly)
    };

    const executeQuery = async () => {
      const results = await sanity.fetch<Product[]>(query, params);
      return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
    };

    return cachedSanityFetch(
      [
        'fetchFilteredProducts',
        config.projectId,
        config.dataset,
        perspective,
        params,
        productFilter
      ],
      executeQuery
    );
  } catch (err) {
    console.error('Failed to fetch filtered products:', err);
    return [];
  }
}

export async function getProductCount(
  filters: StorefrontProductFilters = {},
  options: { includeServices?: boolean } = {}
): Promise<number> {
  try {
    if (!hasSanityConfig || !sanity) return 0;

    const {
      categorySlug = null,
      filterSlugs,
      vehicleSlug,
      vehicleSlugs,
      minPrice = null,
      maxPrice = null,
      searchTerm = null,
      saleOnly = false
    } = filters;
    const { includeServices = false } = options;

    const normalizedFilterSlugs = normalizeSlugList(filterSlugs);
    const normalizedVehicleSlugs =
      normalizeSlugList(vehicleSlugs) ??
      (vehicleSlug && normalizeSlugValue(vehicleSlug) ? [normalizeSlugValue(vehicleSlug)] : null);
    const productFilter = includeServices
      ? SERVICE_STORE_PRODUCT_WITH_SLUG_FILTER
      : STORE_PRODUCT_WITH_SLUG_FILTER;

    const query = `
      count(*[_type == "product" 
        && ${productFilter}
        && ($categorySlug == null || $categorySlug in category[]->slug.current || $categorySlug in categories[]->slug.current)
        && ($filterSlugs == null || count((filters[]->slug.current)[@ in $filterSlugs]) > 0 || count((filters[])[@ in $filterSlugs]) > 0 || count((filterTitles[])[@ in $filterSlugs]) > 0)
        && ($vehicleSlugs == null || count((compatibleVehicles[]->slug.current)[@ in $vehicleSlugs]) > 0)
        && ($minPrice == null || ${FINAL_PRICE_EXPRESSION} >= $minPrice)
        && ($maxPrice == null || ${FINAL_PRICE_EXPRESSION} <= $maxPrice)
        && ($saleOnly == false || (coalesce(onSale, pricing.onSale) == true && defined(coalesce(salePrice, pricing.salePrice))))
        && ($searchTerm == null || 
            lower(title) match lower("*" + $searchTerm + "*") || 
            lower(tags[]) match lower("*" + $searchTerm + "*"))
      ])
    `;

    const params: QueryParams = {
      categorySlug: categorySlug ? normalizeSlugValue(categorySlug) : null,
      filterSlugs: normalizedFilterSlugs,
      vehicleSlugs: normalizedVehicleSlugs,
      minPrice: typeof minPrice === 'number' && Number.isFinite(minPrice) ? minPrice : null,
      maxPrice: typeof maxPrice === 'number' && Number.isFinite(maxPrice) ? maxPrice : null,
      searchTerm: typeof searchTerm === 'string' && searchTerm.trim() ? searchTerm.trim() : null,
      saleOnly: Boolean(saleOnly)
    };

    const executeQuery = async () => {
      const result = await sanity.fetch<number>(query, params);
      return typeof result === 'number' && Number.isFinite(result) ? result : 0;
    };

    return cachedSanityFetch(
      ['getProductCount', config.projectId, config.dataset, perspective, params, productFilter],
      executeQuery
    );
  } catch (err) {
    console.error('Failed to fetch product count:', err);
    return 0;
  }
}

export async function fetchStorefrontFilterFacets(
  filters: StorefrontProductFilters = {},
  options: { includeServices?: boolean } = {}
) {
  try {
    if (!hasSanityConfig || !sanity) return [];
    const {
      categorySlug = null,
      vehicleSlug,
      vehicleSlugs,
      minPrice = null,
      maxPrice = null,
      searchTerm = null,
      saleOnly = false
    } = filters;
    const { includeServices = false } = options;

    const normalizedVehicleSlugs =
      normalizeSlugList(vehicleSlugs) ??
      (vehicleSlug && normalizeSlugValue(vehicleSlug) ? [normalizeSlugValue(vehicleSlug)] : null);
    const productFilter = includeServices
      ? SERVICE_STORE_PRODUCT_WITH_SLUG_FILTER
      : STORE_PRODUCT_WITH_SLUG_FILTER;
    const params: QueryParams = {
      categorySlug: categorySlug ? normalizeSlugValue(categorySlug) : null,
      vehicleSlugs: normalizedVehicleSlugs,
      minPrice: typeof minPrice === 'number' && Number.isFinite(minPrice) ? minPrice : null,
      maxPrice: typeof maxPrice === 'number' && Number.isFinite(maxPrice) ? maxPrice : null,
      searchTerm: typeof searchTerm === 'string' && searchTerm.trim() ? searchTerm.trim() : null,
      saleOnly: Boolean(saleOnly)
    };

    const query = `
      *[_type == "product" 
        && ${productFilter}
        && ($categorySlug == null || $categorySlug in category[]->slug.current || $categorySlug in categories[]->slug.current)
        && ($vehicleSlugs == null || count((compatibleVehicles[]->slug.current)[@ in $vehicleSlugs]) > 0)
        && ($minPrice == null || ${FINAL_PRICE_EXPRESSION} >= $minPrice)
        && ($maxPrice == null || ${FINAL_PRICE_EXPRESSION} <= $maxPrice)
        && ($saleOnly == false || (coalesce(onSale, pricing.onSale) == true && defined(coalesce(salePrice, pricing.salePrice))))
        && ($searchTerm == null || 
            lower(title) match lower("*" + $searchTerm + "*") || 
            lower(tags[]) match lower("*" + $searchTerm + "*"))
      ]{
        "filters": coalesce(filters[]->{ _id, title, slug }, filters, []),
        filterTitles,
        "onSale": coalesce(onSale, pricing.onSale),
        "salePrice": coalesce(salePrice, pricing.salePrice),
        "saleActive": coalesce(saleActive, pricing.saleActive),
        "saleStartDate": coalesce(saleStartDate, pricing.saleStartDate),
        "saleEndDate": coalesce(saleEndDate, pricing.saleEndDate)
      }
    `;

    return cachedSanityFetch(
      [
        'fetchStorefrontFilterFacets',
        config.projectId,
        config.dataset,
        perspective,
        params,
        productFilter
      ],
      () => sanity.fetch(query, params)
    );
  } catch (err) {
    console.error('Failed to fetch storefront filter facets:', err);
    return [];
  }
}

export async function fetchActiveSaleProducts(
  options: {
    limit?: number;
    ttlSeconds?: number;
  } = {}
): Promise<Product[]> {
  try {
    if (!hasSanityConfig || !sanity) return [];

    const limit = Math.max(1, Math.min(50, options.limit ?? 12));
    const query = `
      *[_type == "product" && ${ACTIVE_PRODUCT_WITH_SLUG_FILTER}
        && coalesce(onSale, pricing.onSale) == true
        && defined(coalesce(salePrice, pricing.salePrice))
        && coalesce(salePrice, pricing.salePrice) < coalesce(compareAtPrice, pricing.compareAtPrice, price, pricing.price)
        && (!defined(coalesce(saleStartDate, pricing.saleStartDate)) || coalesce(saleStartDate, pricing.saleStartDate) <= now())
        && (!defined(coalesce(saleEndDate, pricing.saleEndDate)) || coalesce(saleEndDate, pricing.saleEndDate) >= now())
      ] | order(
        coalesce(
          discountPercent,
          discountPercentage,
          pricing.discountPercentage,
          round(
            100 * (
              coalesce(compareAtPrice, pricing.compareAtPrice, price, pricing.price) -
              coalesce(salePrice, pricing.salePrice)
            ) / coalesce(compareAtPrice, pricing.compareAtPrice, price, pricing.price, 1)
          ),
          0
        ) desc
      )[0...$limit] ${PRODUCT_LISTING_PROJECTION}
    `;

    const executeQuery = async () => {
      const results = await sanity.fetch<Product[]>(query, { limit });
      if (!Array.isArray(results)) return [];

      return results.map((item) => {
        const normalized = normalizeProductPrice(item);
        const salePrice =
          (normalized as any)?.salePrice ?? (normalized as any)?.pricing?.salePrice ?? null;
        const basePrice =
          (normalized as any)?.compareAtPrice ??
          (normalized as any)?.pricing?.compareAtPrice ??
          (normalized as any)?.price ??
          (normalized as any)?.pricing?.price ??
          null;

        const savings =
          typeof salePrice === 'number' && typeof basePrice === 'number'
            ? Math.max(0, basePrice - salePrice)
            : null;

        const computedDiscount =
          typeof salePrice === 'number' && typeof basePrice === 'number' && basePrice > 0
            ? Math.round(((basePrice - salePrice) / basePrice) * 100)
            : null;

        const existingDiscount =
          typeof (normalized as any)?.discountPercent === 'number'
            ? (normalized as any)?.discountPercent
            : typeof (normalized as any)?.discountPercentage === 'number'
              ? (normalized as any)?.discountPercentage
              : null;

        const discountPercent = existingDiscount ?? computedDiscount ?? null;

        return {
          ...normalized,
          onSale: true,
          discountPercent: discountPercent ?? undefined,
          discountPercentage:
            (normalized as any)?.discountPercentage ?? discountPercent ?? undefined,
          savings: savings ?? undefined
        };
      });
    };

    return cachedSanityFetch(
      ['fetchActiveSaleProducts', config.projectId, config.dataset, perspective, limit],
      executeQuery,
      { ttlSeconds: options.ttlSeconds ?? 60 }
    );
  } catch (err) {
    console.error('Failed to fetch active sale products:', err);
    return [];
  }
}

export async function fetchServiceCatalogProducts(): Promise<Product[]> {
  try {
    if (!hasSanityConfig || !sanity) return [];
    const query = `*[_type == "product" && ${SERVICE_PRODUCT_WITH_SLUG_FILTER}]${PRODUCT_LISTING_PROJECTION}`;
    const executeQuery = async () => {
      const results = await sanity!.fetch<Product[]>(query, {});
      return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
    };
    return cachedSanityFetch(
      ['fetchServiceCatalogProducts', config.projectId, config.dataset, perspective],
      executeQuery
    );
  } catch (err) {
    console.error('Failed to fetch service catalog products:', err);
    return [];
  }
}

export interface FeaturedProductSummary {
  _id: string;
  title?: string;
  displayTitle?: string;
  name?: string;
  slug?: string;
  price?: number | null;
  featured?: boolean;
  primaryKeyword?: string;
  fitmentYears?: string;
  fitment?: string;
  seoPrimaryKeyword?: string;
  seoFitmentYears?: string;
  seoFitment?: string;
  images?: any;
  imageUrl?: string;
  categories?: any[];
  filters?: any[];
}

export async function fetchFeaturedProducts(
  options: {
    limit?: number;
    ttlSeconds?: number;
  } = {}
): Promise<FeaturedProductSummary[]> {
  try {
    if (!hasSanityConfig || !sanity) return [];
    const limit = Math.max(1, Math.min(50, options.limit ?? 8));
    const query = `
      *[_type == "product" && ${ACTIVE_PRODUCT_WITH_SLUG_FILTER} && ${FEATURED_PRODUCT_FILTER} && status == "active"][0...$limit]{
        _id,
        name,
        title,
        displayTitle,
        "slug": slug.current,
        price,
        "onSale": coalesce(onSale, pricing.onSale),
        "salePrice": coalesce(salePrice, pricing.salePrice),
        "compareAtPrice": coalesce(compareAtPrice, pricing.compareAtPrice),
        "discountPercent": coalesce(discountPercent, discountPercentage, pricing.discountPercentage),
        "discountPercentage": coalesce(discountPercentage, discountPercent, pricing.discountPercentage),
        "saleStartDate": coalesce(saleStartDate, pricing.saleStartDate),
        "saleEndDate": coalesce(saleEndDate, pricing.saleEndDate),
        "saleLabel": coalesce(saleLabel, pricing.saleLabel),
        "saleActive": pricing.saleActive,
        featured,
        primaryKeyword,
        fitmentYears,
        fitment,
        seo{
          primaryKeyword,
          keyphrase,
          keyword,
          targetKeyword,
          fitmentYears,
          fitmentText,
          fitment
        },
        images[]{
          asset->{ _id, url },
          alt
        },
        "imageUrl": coalesce(
          image.asset->url,
          mainImage.asset->url,
          images[0].asset->url,
          thumbnail.asset->url,
          thumb.asset->url
        ),
        "categories": select(
          defined(categories) => categories[]->{ _id, title, slug },
          defined(category) => category[]->{ _id, title, slug }
        ),
        filters[]->{
          _id,
          title,
          slug
        }
      }
    `;
    const executeQuery = async () => {
      const results = await sanity.fetch<FeaturedProductSummary[]>(query, { limit });
      if (!Array.isArray(results)) return [];
      return results.map((item) => {
        const normalized = normalizeProductPrice(item);
        const seoBlock = (normalized as any).seo ?? {};
        const imageUrl =
          normalizeSanityImageUrl((normalized as any).imageUrl) ??
          (Array.isArray((normalized as any).images)
            ? normalizeSanityImageUrl((normalized as any).images?.[0])
            : undefined);
        return {
          ...normalized,
          imageUrl,
          seoPrimaryKeyword:
            seoBlock.primaryKeyword ??
            seoBlock.keyphrase ??
            seoBlock.keyword ??
            seoBlock.targetKeyword ??
            normalized.primaryKeyword,
          seoFitmentYears: seoBlock.fitmentYears ?? normalized.fitmentYears,
          seoFitment: seoBlock.fitmentText ?? seoBlock.fitment ?? normalized.fitment
        };
      });
    };
    return cachedSanityFetch(
      ['fetchFeaturedProducts', config.projectId, config.dataset, perspective, limit],
      executeQuery,
      { ttlSeconds: options.ttlSeconds }
    );
  } catch (err) {
    console.error('Failed to fetch featured products:', err);
    return [];
  }
}

// Fetch all categories
export async function fetchCategories(): Promise<Category[]> {
  try {
    if (!hasSanityConfig) return [];
    const query = `*[_type == "category" && defined(slug.current)] {
      _id,
      title,
      slug,
      "imageUrl": coalesce(image.asset->url, mainImage.asset->url, images[0].asset->url),
      description
    }`;
    if (!sanity) return [];
    const executeQuery = async () => {
      const results = await sanity!.fetch<Category[]>(query, {});
      return Array.isArray(results) ? results.map((item) => normalizeCategoryEntry(item)) : [];
    };
    return cachedSanityFetch(
      ['fetchCategories', config.projectId, config.dataset, perspective],
      executeQuery
    );
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return [];
  }
}

// Fetch all tunes
export async function fetchTunes(): Promise<Tune[]> {
  try {
    if (!hasSanityConfig) return [];
    const query = `*[_type == "tune" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    if (!sanity) return [];
    const executeQuery = async () => sanity!.fetch<Tune[]>(query, {});
    return cachedSanityFetch(
      ['fetchTunes', config.projectId, config.dataset, perspective],
      executeQuery
    );
  } catch (err) {
    console.error('Failed to fetch tunes:', err);
    return [];
  }
}

// Fetch all vehicles
export async function fetchVehicles(): Promise<Vehicle[]> {
  try {
    if (!hasSanityConfig) return [];
    const query = `*[_type == "vehicleModel" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    if (!sanity) return [];
    const executeQuery = async () => sanity!.fetch<Vehicle[]>(query, {});
    return cachedSanityFetch(
      ['fetchVehicles', config.projectId, config.dataset, perspective],
      executeQuery
    );
  } catch (err) {
    console.error('Failed to fetch vehicles:', err);
    return [];
  }
}

// Fetch product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    if (!hasSanityConfig) return null;
    const normalizedSlug = normalizeSlugValue(slug);
    if (!normalizedSlug) return null;
    const slugCandidates = Array.from(
      new Set(
        [normalizedSlug, normalizedSlug.replace(/\s+/g, '-')]
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
    const slugLowerValues = slugCandidates.map((value) => value.toLowerCase());
    const buildQuery = (filter: string) => `*[_type == "product" && ${filter} && defined(slug.current) && (
      slug.current in $slugValues ||
      lower(slug.current) in $slugLowerValues
    )][0]{
      _id,
      title,
      displayTitle,
      slug,
      price,
      stripePriceId,
      "medusaVariantId": coalesce(medusaVariantId, medusaVariantID),
      "onSale": coalesce(onSale, pricing.onSale),
      "salePrice": coalesce(salePrice, pricing.salePrice),
      "compareAtPrice": coalesce(compareAtPrice, pricing.compareAtPrice),
      "discountPercent": coalesce(discountPercent, discountPercentage, pricing.discountPercentage),
      "discountPercentage": coalesce(discountPercentage, discountPercent, pricing.discountPercentage),
      "saleStartDate": coalesce(saleStartDate, pricing.saleStartDate),
      "saleEndDate": coalesce(saleEndDate, pricing.saleEndDate),
      "saleLabel": coalesce(saleLabel, pricing.saleLabel),
      "saleActive": pricing.saleActive,
      sku,
      // rich text fields may be arrays
      shortDescription,
      description,
      importantNotes,
      fitmentYears,
      fitment,
      fitmentRange,
      primaryKeyword,
      seo{
        fitmentYears,
        fitment,
        fitmentText,
        primaryKeyword,
        keyword,
        keyphrase,
        targetKeyword,
        benefits,
        highlights,
        valueProps,
        callToAction,
        cta,
        ctaText
      },
      specifications,
      attributes,
      includedInKit[]{ item, quantity, notes },
      productType,
      images[]{
        asset->{
          _id,
          url,
          metadata{
            dimensions{
              width,
              height,
              aspectRatio
            }
          }
        },
        alt
      },
      filters[]->{
        _id,
        title,
        slug
      },
      tune->{ title, slug },
      compatibleVehicles[]->{ make, model, trim, slug },
      shippingClass,
      shippingWeight,
      brand,
      gtin,
      mpn,
      metaTitle,
      metaDescription,
      canonicalUrl,
      noindex,
      socialImage{ asset->{ _id, url }, alt },

      // --- Variants/Options (support multiple shapes w/ normalized value arrays)
      options${GROQ_OPTION_OBJECT_PROJECTION},
      optionGroups${GROQ_OPTION_OBJECT_PROJECTION},
      variationOptions${GROQ_OPTION_OBJECT_PROJECTION},
      variations[],

      // --- Upgrades & Custom Paint ---
      addOns[]{
        label,
        priceDelta,
        description,
        skuSuffix,
        defaultSelected,
        group, key, name, title, value, price, delta
      },
      customPaint{
        enabled,
        additionalPrice,
        paintCodeRequired,
        codeLabel,
        instructions
      },

      // --- Categories (support either field name) ---
      "categories": select(
        defined(categories) => categories[]->{ _id, title, slug },
        defined(category) => category[]->{ _id, title, slug }
      )
    }`;
    const query = buildQuery(ACTIVE_PRODUCT_FILTER);
    const serviceQuery = buildQuery(SERVICE_PRODUCT_FILTER);
    if (!sanity) return null;
    const params = { slugValues: slugCandidates, slugLowerValues };
    const executeQuery = async () => {
      const productResult = await sanity!.fetch<Product | null>(query, params);
      if (productResult) return normalizeProductPrice(productResult);
      const serviceResult = await sanity!.fetch<Product | null>(serviceQuery, params);
      return serviceResult ? normalizeProductPrice(serviceResult) : null;
    };
    return cachedSanityFetch(
      ['getProductBySlug', config.projectId, config.dataset, perspective, slugCandidates.join('|')],
      executeQuery
    );
  } catch (err) {
    console.error(`Failed to fetch product with slug "${slug}":`, err);
    return null;
  }
}

// Auto-related products based on overlapping categories/filters (computed at query time)
export async function getRelatedProducts(
  slug: string,
  categoryIds: string[] = [],
  filters: string[] = [],
  limit = 4
) {
  if (!hasSanityConfig) return [];
  const normalizedSlug = normalizeSlugValue(slug);
  const ids = Array.isArray(categoryIds) ? categoryIds : [];
  const flt = Array.isArray(filters) ? filters : [];
  const slugParam = normalizedSlug || (typeof slug === 'string' ? slug : '');
  if (!slugParam) return [];
  const query = `
    *[_type == "product" && slug.current != $slug && ${ACTIVE_PRODUCT_WITH_SLUG_FILTER}]{
      _id,
      title,
      displayTitle,
      slug,
      price,
      "onSale": coalesce(onSale, pricing.onSale),
      "salePrice": coalesce(salePrice, pricing.salePrice),
      "compareAtPrice": coalesce(compareAtPrice, pricing.compareAtPrice),
      "discountPercent": coalesce(discountPercent, discountPercentage, pricing.discountPercentage),
      "discountPercentage": coalesce(discountPercentage, discountPercent, pricing.discountPercentage),
      "saleStartDate": coalesce(saleStartDate, pricing.saleStartDate),
      "saleEndDate": coalesce(saleEndDate, pricing.saleEndDate),
      "saleLabel": coalesce(saleLabel, pricing.saleLabel),
      "saleActive": pricing.saleActive,
      shortDescription,
      description,
      excerpt,
      images[]{asset->{url}, alt},
      "categories": select(
        defined(categories) => categories[]->{ _id, title, slug },
        defined(category) => category[]->{ _id, title, slug }
      ),
      // relevance: category overlap (supports either field name) + filter overlap
      "rel": count(coalesce(category[]._ref, categories[]._ref, [])[ @ in $catIds ]) + count(coalesce(filters, [])[ @ in $filters ])
    } | order(rel desc, onSale desc, coalesce(salePrice, price, 9e9) asc, _createdAt desc)[0...$limit]
  `;
  const params = { slug: slugParam, catIds: ids, filters: flt, limit } as Record<string, any>;
  if (!sanity) return [];
  const executeQuery = async () => {
    const results = await sanity!.fetch<Product[]>(query, params);
    return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
  };
  return cachedSanityFetch(
    [
      'getRelatedProducts',
      config.projectId,
      config.dataset,
      perspective,
      slugParam,
      ids,
      flt,
      limit
    ],
    executeQuery
  );
}

// Auto-upsell: same category, higher (or equal) price than current item
export async function getUpsellProducts(
  slug: string,
  categoryIds: string[] = [],
  basePrice?: number,
  limit = 4
) {
  if (!hasSanityConfig) return [];
  const normalizedSlug = normalizeSlugValue(slug);
  const ids = Array.isArray(categoryIds) ? categoryIds : [];
  const hasPrice = typeof basePrice === 'number' && !Number.isNaN(basePrice);
  const slugParam = normalizedSlug || (typeof slug === 'string' ? slug : '');
  if (!slugParam) return [];
  const query = `
    *[_type == "product" && slug.current != $slug && ${ACTIVE_PRODUCT_WITH_SLUG_FILTER}
      && count(coalesce(category[]._ref, categories[]._ref, [])[ @ in $catIds ]) > 0
      ${hasPrice ? '&& defined(price) && price >= $price' : ''}]{
      _id,
      title,
      displayTitle,
      slug,
      price,
      "onSale": coalesce(onSale, pricing.onSale),
      "salePrice": coalesce(salePrice, pricing.salePrice),
      "compareAtPrice": coalesce(compareAtPrice, pricing.compareAtPrice),
      "discountPercent": coalesce(discountPercent, discountPercentage, pricing.discountPercentage),
      "discountPercentage": coalesce(discountPercentage, discountPercent, pricing.discountPercentage),
      "saleStartDate": coalesce(saleStartDate, pricing.saleStartDate),
      "saleEndDate": coalesce(saleEndDate, pricing.saleEndDate),
      "saleLabel": coalesce(saleLabel, pricing.saleLabel),
      "saleActive": pricing.saleActive,
      shortDescription,
      description,
      excerpt,
      images[]{asset->{url}, alt},
      "categories": select(
        defined(categories) => categories[]->{ _id, title, slug },
        defined(category) => category[]->{ _id, title, slug }
      )
    } | order(price asc, _createdAt desc)[0...$limit]
  `;
  const params: Record<string, any> = { slug: slugParam, catIds: ids, limit };
  if (hasPrice) params.price = basePrice;
  if (!sanity) return [];
  const executeQuery = async () => {
    const results = await sanity!.fetch<Product[]>(query, params);
    return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
  };
  return cachedSanityFetch(
    [
      'getUpsellProducts',
      config.projectId,
      config.dataset,
      perspective,
      slugParam,
      ids,
      hasPrice ? basePrice : null,
      limit
    ],
    executeQuery
  );
}

// Backwards-compatible alias to old name
export async function getSimilarProducts(
  categories: { slug?: { current?: string } }[] = [],
  currentSlug: string,
  limit = 4
): Promise<Product[]> {
  const catIds = (categories || []).map((c: any) => c?._id || c?._ref).filter(Boolean);
  return getRelatedProducts(currentSlug, catIds, [], limit);
}
