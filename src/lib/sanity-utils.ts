// src/lib/sanity-utils.ts
import { createClient } from '@sanity/client';

type SanityFetch = <T>(query: string, params?: Record<string, any>) => Promise<T>;
interface SanityClientLite {
  fetch: SanityFetch;
}

// Initialize Sanity client (support both PUBLIC_* and server-side SANITY_* envs)
const projectId =
  (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
  (import.meta.env.SANITY_PROJECT_ID as string | undefined);
const dataset =
  (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
  (import.meta.env.SANITY_DATASET as string | undefined) ||
  'production';
const apiVersion = '2023-01-01';
const token = import.meta.env.SANITY_API_TOKEN;

// Gracefully handle missing env vars in preview/editor environments
const hasSanityConfig = Boolean(projectId && dataset);
if (!hasSanityConfig) {
  console.warn(
    '[sanity-utils] Missing PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_DATASET; Sanity client disabled.'
  );
}

export const sanity: SanityClientLite | null = hasSanityConfig
  ? (createClient({ projectId, dataset, apiVersion, useCdn: false, token }) as unknown as SanityClientLite)
  : null;
// Back-compat aliases for callers expecting different names
export const sanityClient = sanity as any;
export const client = sanity as any;
export const getClient = () => sanity as any;
export const config = { projectId, dataset, apiVersion } as const;
export const clientConfig = config;
export const defaultClientConfig = config;

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

const normalizeProductPrice = <T extends { price?: unknown }>(product: T): T => {
  if (!product) return product;
  const normalizedPrice = coercePriceToNumber((product as any).price);
  const clone: Record<string, unknown> = { ...(product as any) };
  if (normalizedPrice === null) {
    delete clone.price;
  } else {
    clone.price = normalizedPrice;
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
    return await sanity!.fetch<Category[]>(query, {});
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
