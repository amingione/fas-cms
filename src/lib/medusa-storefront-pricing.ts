import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { toCentsStrict } from '@/lib/money';
import { normalizeSlugValue } from '@/lib/sanity-utils';

export type MedusaCalculatedPrice =
  | number
  | {
      amount?: number;
      calculated_amount?: number;
      original_amount?: number;
      currency_code?: string;
      calculated_price?: {
        amount?: number;
        calculated_amount?: number;
      };
      original_price?: {
        amount?: number;
      };
    }
  | null
  | undefined;

export type MedusaVariant = {
  id: string;
  title?: string;
  sku?: string;
  calculated_price?: MedusaCalculatedPrice;
};

export type MedusaStoreProduct = {
  id: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  handle?: string;
  thumbnail?: string | null;
  images?: Array<{ url?: string | null }>;
  categories?: Array<{
    id?: string;
    name?: string | null;
    handle?: string | null;
  }>;
  collection?: {
    id?: string;
    title?: string | null;
    handle?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  variants?: MedusaVariant[];
};

export function resolveMedusaProductSlug(medusa: MedusaStoreProduct | null | undefined): string | null {
  if (!medusa || typeof medusa !== 'object') return null;
  const handle = normalizeSlugValue(medusa.handle);
  return handle ? handle : null;
}

function resolvePreferredVariantId(product: any): string | null {
  const candidates = [
    product?.medusaVariantId,
    product?.medusa_variant_id,
    product?.variantId,
    product?.variant_id
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function resolvePreferredVariant(product: any): unknown | null {
  if (!product || typeof product !== 'object') return null;

  const medusaProduct = (product as any)?.medusa ?? product;
  const variants = Array.isArray((medusaProduct as any)?.variants)
    ? ((medusaProduct as any).variants as unknown[])
    : [];
  if (!variants.length) return null;

  const preferredVariantId = resolvePreferredVariantId(product);
  if (preferredVariantId) {
    const match = variants.find(
      (variant) => typeof (variant as any)?.id === 'string' && (variant as any).id === preferredVariantId
    );
    if (match) return match;
  }

  return variants[0] ?? null;
}

export function resolveVariantCalculatedPriceAmount(
  variant: unknown
): number | null {
  if (!variant || typeof variant !== 'object') return null;

  const calculated = (variant as any)?.calculated_price as MedusaCalculatedPrice;
  if (typeof calculated === 'number' && Number.isFinite(calculated)) {
    try {
      return toCentsStrict(calculated, 'calculated_price');
    } catch (error) {
      console.warn('[medusa-pricing] Invalid calculated_price (number)', error);
      return null;
    }
  }

  const amount = (calculated as any)?.amount;
  if (amount !== undefined && amount !== null) {
    try {
      return toCentsStrict(amount, 'calculated_price.amount');
    } catch (error) {
      console.warn('[medusa-pricing] Invalid calculated_price.amount', error);
      return null;
    }
  }

  const calculatedAmount = (calculated as any)?.calculated_amount;
  if (calculatedAmount !== undefined && calculatedAmount !== null) {
    try {
      return toCentsStrict(calculatedAmount, 'calculated_price.calculated_amount');
    } catch (error) {
      console.warn('[medusa-pricing] Invalid calculated_price.calculated_amount', error);
      return null;
    }
  }

  const nestedAmount = (calculated as any)?.calculated_price?.amount;
  if (nestedAmount !== undefined && nestedAmount !== null) {
    try {
      return toCentsStrict(nestedAmount, 'calculated_price.calculated_price.amount');
    } catch (error) {
      console.warn('[medusa-pricing] Invalid calculated_price.calculated_price.amount', error);
      return null;
    }
  }

  const nestedCalculatedAmount = (calculated as any)?.calculated_price?.calculated_amount;
  if (nestedCalculatedAmount !== undefined && nestedCalculatedAmount !== null) {
    try {
      return toCentsStrict(
        nestedCalculatedAmount,
        'calculated_price.calculated_price.calculated_amount'
      );
    } catch (error) {
      console.warn(
        '[medusa-pricing] Invalid calculated_price.calculated_price.calculated_amount',
        error
      );
      return null;
    }
  }

  return null;
}

export function resolveVariantCalculatedOriginalAmount(
  variant: unknown
): number | null {
  if (!variant || typeof variant !== 'object') return null;

  const calculated = (variant as any)?.calculated_price as MedusaCalculatedPrice;
  if (!calculated || typeof calculated !== 'object') return null;

  const originalAmount = (calculated as any)?.original_amount;
  if (originalAmount !== undefined && originalAmount !== null) {
    try {
      return toCentsStrict(originalAmount, 'calculated_price.original_amount');
    } catch (error) {
      console.warn('[medusa-pricing] Invalid calculated_price.original_amount', error);
      return null;
    }
  }

  const nestedOriginalAmount = (calculated as any)?.original_price?.amount;
  if (nestedOriginalAmount !== undefined && nestedOriginalAmount !== null) {
    try {
      return toCentsStrict(nestedOriginalAmount, 'calculated_price.original_price.amount');
    } catch (error) {
      console.warn('[medusa-pricing] Invalid calculated_price.original_price.amount', error);
      return null;
    }
  }

  return null;
}

export function resolveProductCalculatedPriceAmount(
  product: unknown
): number | null {
  const variant = resolvePreferredVariant(product as any);
  if (!variant) return null;
  return resolveVariantCalculatedPriceAmount(variant);
}

export function resolveProductCalculatedOriginalAmount(
  product: unknown
): number | null {
  const variant = resolvePreferredVariant(product as any);
  if (!variant) return null;
  return resolveVariantCalculatedOriginalAmount(variant);
}

export function resolveProductMedusaVariant(
  product: unknown
): unknown | null {
  return resolvePreferredVariant(product as any);
}

/**
 * Pricing authority guard.
 *
 * Returns `true` when the product has a Medusa variant attached with a resolved
 * calculated price — i.e. the product's displayed price is authoritative.
 *
 * Returns `false` when Medusa pricing is absent so callers can render
 * "Contact for price" or suppress price-dependent UI instead of falling back
 * to a Sanity-sourced value.
 *
 * ✅ CORRECT:
 *   if (hasMedusaAuthoritativePricing(product)) { renderPrice(...) }
 *   else { renderContactForPrice() }
 *
 * ❌ WRONG (never do this):
 *   const price = hasMedusaAuthoritativePricing(product)
 *     ? resolveProductCalculatedPriceAmount(product)
 *     : (product as any).price;  // `product.price` is a @deprecated Sanity field — NOT a valid fallback
 */
export function hasMedusaAuthoritativePricing(product: unknown): boolean {
  const amount = resolveProductCalculatedPriceAmount(product);
  return typeof amount === 'number' && Number.isFinite(amount);
}

export async function listStoreProductsForPricing(
  opts: { regionId?: string; limit?: number } = {}
): Promise<MedusaStoreProduct[]> {
  const config = getMedusaConfig();
  if (!config) return [];

  const regionId = opts.regionId ?? config.regionId;
  const limit = Math.max(1, Math.min(200, opts.limit ?? 200));

  const all: MedusaStoreProduct[] = [];
  let offset = 0;
  let total: number | null = null;

  while (total == null || offset < total) {
    const search = new URLSearchParams();
    search.set('limit', String(limit));
    search.set('offset', String(offset));
    search.set(
      'fields',
      '*variants.calculated_price,+metadata,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder'
    );
    if (regionId) search.set('region_id', regionId);

    const response = await medusaFetch(`/store/products?${search.toString()}`, {
      method: 'GET',
      next: { revalidate: 300 } // Cache for 5 minutes to prevent 504 timeouts
    });
    const data = await readJsonSafe<any>(response);
    if (!response.ok) {
      console.error('[medusa-storefront-pricing] Failed to list products', {
        status: response.status,
        error: data?.message
      });
      return all;
    }

    const products = Array.isArray(data?.products) ? (data.products as MedusaStoreProduct[]) : [];
    const count = typeof data?.count === 'number' ? data.count : null;

    all.push(...products);
    total = count ?? all.length;
    offset += products.length || limit;

    if (!products.length) break;
    if (offset > 5000) break; // hard guard; storefront should never have this many
  }

  return all;
}

function resolveSanityId(product: any): string | null {
  const id = product?._id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function resolveSanitySlug(product: any): string | null {
  const slug = normalizeSlugValue(product?.slug);
  return slug ? slug : null;
}

function resolveMedusaSanityId(medusa: MedusaStoreProduct): string | null {
  const metadata = (medusa as any)?.metadata;
  if (!metadata || typeof metadata !== 'object') return null;

  const sanityIdCandidates = [
    (metadata as any)?.sanity_id,
    (metadata as any)?.sanityId,
    (metadata as any)?.sanity_product_id,
    (metadata as any)?.sanityProductId
  ];
  for (const candidate of sanityIdCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function resolveMedusaSanitySlug(medusa: MedusaStoreProduct): string | null {
  const metadata = (medusa as any)?.metadata;
  if (!metadata || typeof metadata !== 'object') return null;

  const sanitySlugCandidates = [
    (metadata as any)?.sanity_slug,
    (metadata as any)?.sanitySlug,
    (metadata as any)?.sanity_product_slug,
    (metadata as any)?.sanityProductSlug
  ];
  for (const candidate of sanitySlugCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export function attachMedusaPricingBySanityIdentity<T extends Record<string, any>>(
  sanityProducts: T[],
  medusaProducts: MedusaStoreProduct[]
): Array<T & { medusa?: MedusaStoreProduct }> {
  const bySanityId = new Map<string, MedusaStoreProduct>();
  const bySanitySlug = new Map<string, MedusaStoreProduct>();
  const byHandle = new Map<string, MedusaStoreProduct>();

  for (const mp of medusaProducts) {
    const sid = resolveMedusaSanityId(mp);
    if (sid) bySanityId.set(sid, mp);

    const sslug = resolveMedusaSanitySlug(mp);
    if (sslug) bySanitySlug.set(sslug, mp);

    if (typeof mp?.handle === 'string' && mp.handle.trim()) {
      byHandle.set(mp.handle.trim(), mp);
    }
  }

  return (Array.isArray(sanityProducts) ? sanityProducts : []).map((sp) => {
    const sid = resolveSanityId(sp);
    const sslug = resolveSanitySlug(sp);

    const medusa =
      (sid ? bySanityId.get(sid) : undefined) ??
      (sslug ? bySanitySlug.get(sslug) : undefined) ??
      (sslug ? byHandle.get(sslug) : undefined);

    return medusa ? ({ ...sp, medusa } as any) : ({ ...sp } as any);
  });
}
