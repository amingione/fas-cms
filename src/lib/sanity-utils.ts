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
const apiVersion = '2023-01-01';

const imageBuilder = projectId && dataset ? imageUrlBuilder({ projectId, dataset }) : null;

const studioUrlRaw =
  (import.meta.env.PUBLIC_SANITY_STUDIO_URL as string | undefined) ||
  (import.meta.env.PUBLIC_STUDIO_URL as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_URL as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_NETLIFY_BASE as string | undefined) ||
  undefined;
const studioUrl = typeof studioUrlRaw === 'string' && studioUrlRaw.trim() ? studioUrlRaw : undefined;

const visualEditingFlag = toBooleanFlag(
  import.meta.env.PUBLIC_SANITY_ENABLE_VISUAL_EDITING as string | undefined
);
if (visualEditingFlag && !studioUrl) {
  console.warn(
    '[sanity-utils] Visual editing enabled but no PUBLIC_SANITY_STUDIO_URL (or SANITY_STUDIO_URL) configured.'
  );
}

const previewDraftsRequested =
  visualEditingFlag ||
  toBooleanFlag((import.meta.env.PUBLIC_SANITY_PREVIEW_DRAFTS as string | undefined) ?? 'false');

const liveSubscriptionsFlag = toBooleanFlag(
  import.meta.env.PUBLIC_SANITY_ENABLE_LIVE_SUBSCRIPTIONS as string | undefined
);

const apiToken =
  (import.meta.env.SANITY_API_TOKEN as string | undefined) ||
  (import.meta.env.SANITY_WRITE_TOKEN as string | undefined) ||
  (import.meta.env.PUBLIC_SANITY_API_TOKEN as string | undefined) ||
  undefined;

let previewDraftsEnabled = Boolean(previewDraftsRequested);
if (previewDraftsEnabled && !apiToken) {
  console.warn(
    '[sanity-utils] Preview drafts requested but no SANITY_API_TOKEN (or PUBLIC_SANITY_API_TOKEN) was found; falling back to published content.'
  );
  previewDraftsEnabled = false;
}

const perspective = previewDraftsEnabled ? 'previewDrafts' : 'published';
const stegaEnabled = visualEditingFlag && Boolean(studioUrl);

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
  perspective,
};

if (previewDraftsEnabled && apiToken) {
  clientOptions.token = apiToken;
}

if (stegaEnabled && studioUrl) {
  clientOptions.stega = { enabled: true, studioUrl } as const;
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
  studioUrl: stegaEnabled ? studioUrl : undefined,
} as const;
export const clientConfig = config;
export const defaultClientConfig = config;

export const visualEditingEnabled = stegaEnabled;
export const previewDraftsActive = previewDraftsEnabled;
export const liveSubscriptionsEnabled = stegaEnabled && liveSubscriptionsFlag;

// Define interfaces
export interface Product {
  _id: string;
  title: string;
  slug: { current: string };
  price?: number | null;
  sku?: string;
  description?: string;
  shortDescription?: any;
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
    slug: { current: string };
  }[];
  averageHorsepower?: number;
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

type QueryParamValue = string | number | boolean | string[] | number[];
type QueryParams = Record<string, QueryParamValue>;

const normalizeUrlString = (value: string | undefined | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) {
    return `https://${trimmed.slice('http://'.length)}`;
  }
  if (/^image-/i.test(trimmed) && imageBuilder) {
    try {
      return imageBuilder.image(trimmed).auto('format').fit('max').url();
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
  'path',
] as const;

export const resolveSanityImageUrl = (candidate: unknown, seen = new Set<unknown>()): string | undefined => {
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

const normalizeProductPrice = <T extends { price?: unknown; images?: unknown; socialImage?: unknown }>(product: T): T => {
  if (!product) return product;
  const normalizedPrice = coercePriceToNumber((product as any).price);
  const clone: Record<string, unknown> = { ...(product as any) };
  if (normalizedPrice === null) {
    delete clone.price;
  } else {
    clone.price = normalizedPrice;
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

// Fetch all products
export async function fetchProductsFromSanity({
  categorySlug,
  tuneSlug,
  vehicleSlug,
  vehicleSlugs,
  minHp
}: {
  categorySlug?: string;
  tuneSlug?: string;
  vehicleSlug?: string;
  vehicleSlugs?: string[];
  minHp?: number;
}): Promise<Product[]> {
  try {
    if (!hasSanityConfig) return [];
    const conditions: string[] = [];
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
      const normalizedSlug = typeof vehicleSlug === 'string' ? vehicleSlug.trim().toLowerCase() : '';
      if (normalizedSlug) {
        conditions.push(`$vehicleSlug in compatibleVehicles[]->slug.current`);
        params.vehicleSlug = normalizedSlug;
      }
    }
    if (typeof minHp === 'number' && !isNaN(minHp)) {
      conditions.push(`averageHorsepower >= $minHp`);
      params.minHp = minHp;
    }

    const query = `*[_type == "product"${conditions.length ? ` && ${conditions.join(' && ')}` : ''}]{
      _id,
      title,
      slug,
      metaTitle,
      metaDescription,
      price,
      averageHorsepower,
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
      images[]{ asset->{ _id, url }, alt },
      tune->{ title, slug },
      compatibleVehicles[]->{ make, model, slug },
      // include free-form filter tags from schema
      filters[]->{
        _id,
        title,
        slug
      },
      // support either field name: "categories" or "category"
      "categories": select(
        defined(categories) => categories[]->{ _id, title, slug },
        defined(category) => category[]->{ _id, title, slug }
      )
    }`;

    const results = await sanity!.fetch<Product[]>(query, params);
    return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
  } catch (err) {
    console.error('Failed to fetch products:', err);
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
    const results = await sanity!.fetch<Category[]>(query, {});
    return Array.isArray(results) ? results.map((item) => normalizeCategoryEntry(item)) : [];
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
    return await sanity!.fetch<Tune[]>(query, {});
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
    return await sanity!.fetch<Vehicle[]>(query, {});
  } catch (err) {
    console.error('Failed to fetch vehicles:', err);
    return [];
  }
}

// Fetch product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    if (!hasSanityConfig) return null;
    const query = `*[_type == "product" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      price,
      sku,
      // rich text fields may be arrays
      shortDescription,
      description,
      importantNotes,
      specifications,
      attributes,
      includedInKit[]{ item, quantity, notes },
      productType,
      images[]{ asset->{ _id, url }, alt },
      filters[]->{
        _id,
        title,
        slug
      },
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

      // --- Variants/Options (support multiple shapes)
      // Keep inline option objects intact (avoid projecting away custom fields like 'sizes')
      options[],
      optionGroups[],
      variationOptions[],
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
    const productResult = await sanity!.fetch<Product | null>(query, { slug });
    return productResult ? normalizeProductPrice(productResult) : null;
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
  limit = 6
) {
  if (!hasSanityConfig) return [];
  const ids = Array.isArray(categoryIds) ? categoryIds : [];
  const flt = Array.isArray(filters) ? filters : [];
  const query = `
    *[_type == "product" && slug.current != $slug]{
      _id,
      title,
      slug,
      price,
      images[]{asset->{url}, alt},
      "categories": select(
        defined(categories) => categories[]->{ _id, title, slug },
        defined(category) => category[]->{ _id, title, slug }
      ),
      // relevance: category overlap (supports either field name) + filter overlap
      "rel": count(coalesce(category[]._ref, categories[]._ref, [])[ @ in $catIds ]) + count(coalesce(filters, [])[ @ in $filters ])
    } | order(rel desc, onSale desc, coalesce(salePrice, price, 9e9) asc, _createdAt desc)[0...$limit]
  `;
  const params = { slug, catIds: ids, filters: flt, limit } as Record<string, any>;
  const results = await sanity!.fetch<Product[]>(query, params);
  return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
}

// Auto-upsell: same category, higher (or equal) price than current item
export async function getUpsellProducts(
  slug: string,
  categoryIds: string[] = [],
  basePrice?: number,
  limit = 6
) {
  if (!hasSanityConfig) return [];
  const ids = Array.isArray(categoryIds) ? categoryIds : [];
  const hasPrice = typeof basePrice === 'number' && !Number.isNaN(basePrice);
  const query = `
    *[_type == "product" && slug.current != $slug
      && count(coalesce(category[]._ref, categories[]._ref, [])[ @ in $catIds ]) > 0
      ${hasPrice ? '&& defined(price) && price >= $price' : ''}]{
      _id,
      title,
      slug,
      price,
      images[]{asset->{url}, alt},
      "categories": select(
        defined(categories) => categories[]->{ _id, title, slug },
        defined(category) => category[]->{ _id, title, slug }
      )
    } | order(price asc, _createdAt desc)[0...$limit]
  `;
  const params: Record<string, any> = { slug, catIds: ids, limit };
  if (hasPrice) params.price = basePrice;
  const results = await sanity!.fetch<Product[]>(query, params);
  return Array.isArray(results) ? results.map((item) => normalizeProductPrice(item)) : [];
}

// Backwards-compatible alias to old name
export async function getSimilarProducts(
  categories: { slug?: { current?: string } }[] = [],
  currentSlug: string,
  limit = 6
): Promise<Product[]> {
  const catIds = (categories || []).map((c: any) => c?._id || c?._ref).filter(Boolean);
  return getRelatedProducts(currentSlug, catIds, [], limit);
}
