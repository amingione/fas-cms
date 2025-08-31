// src/lib/sanity-utils.ts
import { createClient } from '@sanity/client';

// Initialize Sanity client
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
const apiVersion = '2023-01-01';
const token = import.meta.env.SANITY_API_TOKEN;

if (!projectId || !dataset) {
  throw new Error(
    'Missing PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_DATASET in environment variables.'
  );
}

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token
});
// Back-compat aliases for callers expecting different names
export const sanityClient = sanity;
export const client = sanity;
export const getClient = () => sanity;
export const config = { projectId, dataset, apiVersion } as const;
export const clientConfig = config;
export const defaultClientConfig = config;

// Define interfaces
export interface Product {
  _id: string;
  title: string;
  slug: { current: string };
  price: number;
  description?: string;
  shortDescription?: any;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  brand?: string;
  gtin?: string;
  mpn?: string;
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

type QueryParams = Record<string, string | number | boolean>;

// Fetch all products
export async function fetchProductsFromSanity({
  categorySlug,
  tuneSlug,
  vehicleSlug,
  minHp
}: {
  categorySlug?: string;
  tuneSlug?: string;
  vehicleSlug?: string;
  minHp?: number;
}): Promise<Product[]> {
  try {
    const conditions: string[] = [];
    const params: QueryParams = {};

    if (categorySlug) {
      conditions.push(`references(*[_type == "category" && slug.current == $categorySlug]._id)`);
      params.categorySlug = categorySlug;
    }
    if (tuneSlug) {
      conditions.push(`tune->slug.current == $tuneSlug`);
      params.tuneSlug = tuneSlug;
    }
    if (vehicleSlug) {
      conditions.push(`$vehicleSlug in compatibleVehicles[]->slug.current`);
      params.vehicleSlug = vehicleSlug;
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
      filters[],
      // support either field name: "categories" or "category"
      "categories": select(
        defined(categories) => categories[]->{ _id, title, slug },
        defined(category) => category[]->{ _id, title, slug }
      )
    }`;

    return await sanity.fetch<Product[]>(query, params);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return [];
  }
}

// Fetch all categories
export async function fetchCategories(): Promise<Category[]> {
  try {
    const query = `*[_type == "category" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    return await sanity.fetch<Category[]>(query, {});
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return [];
  }
}

// Fetch all tunes
export async function fetchTunes(): Promise<Tune[]> {
  try {
    const query = `*[_type == "tune" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    return await sanity.fetch<Tune[]>(query, {});
  } catch (err) {
    console.error('Failed to fetch tunes:', err);
    return [];
  }
}

// Fetch all vehicles
export async function fetchVehicles(): Promise<Vehicle[]> {
  try {
    const query = `*[_type == "vehicleModel" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    return await sanity.fetch<Vehicle[]>(query, {});
  } catch (err) {
    console.error('Failed to fetch vehicles:', err);
    return [];
  }
}

// Fetch product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const query = `*[_type == "product" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      price,
      // rich text fields may be arrays
      shortDescription,
      description,
      importantNotes,
      specifications,
      attributes,
      includedInKit[]{ item, quantity, notes },
      productType,
      images[]{ asset->{ _id, url }, alt },
      filters[],
      brand,
      gtin,
      mpn,
      metaTitle,
      metaDescription,
      canonicalUrl,
      noindex,
      socialImage{ asset->{ _id, url }, alt },

      // --- Variants/Options (support multiple shapes)
      options[]->{ title, name, key, values, items },
      optionGroups[]->{ title, name, key, values, items },
      variationOptions[]{ title, name, key, values, items },
      variations[]->{ title, name, key, values, items },

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
    return await sanity.fetch<Product | null>(query, { slug });
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
  return sanity.fetch<Product[]>(query, params);
}

// Auto-upsell: same category, higher (or equal) price than current item
export async function getUpsellProducts(
  slug: string,
  categoryIds: string[] = [],
  basePrice?: number,
  limit = 6
) {
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
  return sanity.fetch<Product[]>(query, params);
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
