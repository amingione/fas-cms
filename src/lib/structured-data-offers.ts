import {
  listStoreProductsForPricing,
  resolveMedusaProductSlug,
  resolveProductCalculatedPriceAmount,
  resolveProductMedusaVariant,
  type MedusaStoreProduct
} from '@/lib/medusa-storefront-pricing';
import { centsToDollars } from '@/lib/pricing';
import { normalizeSlugValue } from '@/lib/sanity-utils';

/**
 * Extract the Sanity product slug stored in Medusa product metadata.
 * Medusa's Sanity sync writes this under several possible keys depending on the
 * sync plugin version; check all of them.
 */
const resolveMedusaMetadataSanitySlug = (product: MedusaStoreProduct): string | null => {
  const metadata = (product as any)?.metadata;
  if (!metadata || typeof metadata !== 'object') return null;
  const candidates = [
    (metadata as any)?.sanity_slug,
    (metadata as any)?.sanitySlug,
    (metadata as any)?.sanity_product_slug,
    (metadata as any)?.sanityProductSlug
  ];
  for (const candidate of candidates) {
    const normalized = normalizeSlugValue(candidate);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Multi-tier slug match:
 *   1. Medusa handle  (authoritative for shop routes)
 *   2. Medusa metadata sanity_slug  (reconciles slug renames / import mismatches)
 * Returns true if the product matches the given Sanity CTA slug.
 */
const medusaProductMatchesSlug = (product: MedusaStoreProduct, slug: string): boolean =>
  resolveMedusaProductSlug(product) === slug ||
  resolveMedusaMetadataSanitySlug(product) === slug;

export type StructuredDataOffer = {
  '@type': 'Offer';
  priceCurrency: string;
  availability: string;
  url: string;
  // Always present. Real price in USD (e.g. "1299.00") when resolvable from
  // Medusa; "0" for call-for-price / unmatched products so Google's rich-result
  // validator never sees a missing-price error.
  price: string;
};

const SCHEMA_AVAILABILITY = {
  inStock: 'https://schema.org/InStock',
  outOfStock: 'https://schema.org/OutOfStock',
  backOrder: 'https://schema.org/BackOrder'
} as const;

let medusaProductsPromise: Promise<MedusaStoreProduct[]> | null = null;

const getMedusaProductsCached = async (): Promise<MedusaStoreProduct[]> => {
  if (!medusaProductsPromise) {
    medusaProductsPromise = listStoreProductsForPricing().catch((error) => {
      console.error('[structured-data-offers] Failed to load Medusa products for JSON-LD', error);
      return [];
    });
  }
  return medusaProductsPromise;
};

const resolveShopSlugFromHref = (href?: string | null): string | null => {
  if (!href || typeof href !== 'string') return null;
  if (!href.startsWith('/shop/')) return null;
  if (href.includes('?')) return null;
  // normalizeSlugValue strips leading/trailing slashes and URL-decodes, so
  // "/shop/some-product/" → "some-product" matches Medusa handles correctly
  // even when Astro's trailingSlash:'always' causes hrefs to end with "/".
  const slug = normalizeSlugValue(href.replace(/^\/shop\//, ''));
  return slug || null;
};

const resolveSchemaAvailabilityFromVariant = (variant: unknown): string => {
  const manageInventory = Boolean((variant as any)?.manage_inventory);
  const allowBackorder = Boolean((variant as any)?.allow_backorder);
  const quantity =
    typeof (variant as any)?.inventory_quantity === 'number'
      ? Number((variant as any).inventory_quantity)
      : null;

  if (!manageInventory) return SCHEMA_AVAILABILITY.inStock;
  if (typeof quantity === 'number' && quantity > 0) return SCHEMA_AVAILABILITY.inStock;
  if (allowBackorder) return SCHEMA_AVAILABILITY.backOrder;
  return SCHEMA_AVAILABILITY.outOfStock;
};

const resolvePriceCurrencyFromVariant = (variant: unknown): string => {
  const code = String((variant as any)?.calculated_price?.currency_code ?? '').trim();
  if (!code) return 'USD';
  return code.toUpperCase();
};

export async function buildOfferFromCtaHref(
  ctaHref: string | undefined,
  fallbackUrl: string
): Promise<StructuredDataOffer> {
  // "0" is used as the call-for-price / unresolvable sentinel so that Google's
  // rich-result validator always sees a price field. schema.org accepts 0 on an
  // Offer; it signals "free or call for pricing" rather than triggering a
  // missing-required-field error.
  const fallbackOffer: StructuredDataOffer = {
    '@type': 'Offer',
    priceCurrency: 'USD',
    availability: SCHEMA_AVAILABILITY.inStock,
    url: fallbackUrl,
    price: '0'
  };

  const slug = resolveShopSlugFromHref(ctaHref);
  if (!slug) return fallbackOffer;

  const products = await getMedusaProductsCached();
  // Two-tier lookup: Medusa handle first, then metadata.sanity_slug fallback.
  // This reconciles cases where a Sanity CTA href slug differs from the Medusa
  // handle (e.g., after slug renames or when the Medusa sync only set metadata).
  const medusaProduct = products.find((product) => medusaProductMatchesSlug(product, slug));

  if (!medusaProduct) {
    // Emit a diagnostic warn so server logs surface any remaining mismatches.
    // Run a deploy and grep for "[structured-data-offers] No Medusa product"
    // to enumerate remaining unresolvable slugs and fix them in Medusa or Sanity.
    console.warn(
      `[structured-data-offers] No Medusa product found for slug "${slug}" (ctaHref: ${ctaHref ?? 'undefined'}). ` +
        `Tried handle + metadata.sanity_slug. Emitting price:"0" fallback. ` +
        `Available handles: [${products.map((p) => resolveMedusaProductSlug(p)).filter(Boolean).join(', ')}]`
    );
    return fallbackOffer;
  }

  const variant = resolveProductMedusaVariant(medusaProduct);
  const priceCents = resolveProductCalculatedPriceAmount(medusaProduct);
  const priceDollars = centsToDollars(priceCents ?? undefined);

  return {
    '@type': 'Offer',
    priceCurrency: resolvePriceCurrencyFromVariant(variant),
    availability: resolveSchemaAvailabilityFromVariant(variant),
    url: fallbackUrl,
    // Fall back to "0" if Medusa returned no calculated price for this product
    // (e.g., no region pricing configured, variant has no price tier).
    price: typeof priceDollars === 'number' ? priceDollars.toFixed(2) : '0'
  };
}
