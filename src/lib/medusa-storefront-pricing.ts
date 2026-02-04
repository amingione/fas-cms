import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { normalizeSlugValue } from '@/lib/sanity-utils';

export type MedusaCalculatedPrice =
  | number
  | {
      amount?: number;
      calculated_amount?: number;
      original_amount?: number;
      currency_code?: string;
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
  handle?: string;
  thumbnail?: string | null;
  images?: Array<{ url?: string | null }>;
  metadata?: Record<string, unknown> | null;
  variants?: MedusaVariant[];
};

export function resolveVariantCalculatedPriceAmount(
  variant: unknown
): number | null {
  if (!variant || typeof variant !== 'object') return null;

  const calculated = (variant as any)?.calculated_price as MedusaCalculatedPrice;
  if (typeof calculated === 'number' && Number.isFinite(calculated)) return calculated;

  const amount = (calculated as any)?.amount;
  if (typeof amount === 'number' && Number.isFinite(amount)) return amount;

  const calculatedAmount = (calculated as any)?.calculated_amount;
  if (typeof calculatedAmount === 'number' && Number.isFinite(calculatedAmount)) return calculatedAmount;

  return null;
}

export function resolveProductCalculatedPriceAmount(
  product: unknown
): number | null {
  if (!product || typeof product !== 'object') return null;

  // Prefer explicitly-attached Medusa payload when the base product object is a Sanity doc.
  const medusaProduct = (product as any)?.medusa ?? product;

  const variants = (medusaProduct as any)?.variants;
  const firstVariant = Array.isArray(variants) ? variants[0] : null;
  if (!firstVariant) return null;

  return resolveVariantCalculatedPriceAmount(firstVariant);
}

export function resolveProductMedusaVariant(
  product: unknown
): unknown | null {
  if (!product || typeof product !== 'object') return null;
  const medusaProduct = (product as any)?.medusa ?? product;
  const variants = (medusaProduct as any)?.variants;
  return Array.isArray(variants) ? variants[0] : null;
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
    if (regionId) search.set('region_id', regionId);

    const response = await medusaFetch(`/store/products?${search.toString()}`, {
      method: 'GET',
      cache: 'no-store'
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
  const sanityId = (medusa as any)?.metadata?.sanity_id;
  return typeof sanityId === 'string' && sanityId.trim() ? sanityId.trim() : null;
}

function resolveMedusaSanitySlug(medusa: MedusaStoreProduct): string | null {
  const sanitySlug = (medusa as any)?.metadata?.sanity_slug;
  return typeof sanitySlug === 'string' && sanitySlug.trim() ? sanitySlug.trim() : null;
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

