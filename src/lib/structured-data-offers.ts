import {
  listStoreProductsForPricing,
  resolveMedusaProductSlug,
  resolveProductCalculatedPriceAmount,
  resolveProductMedusaVariant,
  type MedusaStoreProduct
} from '@/lib/medusa-storefront-pricing';
import { centsToDollars } from '@/lib/pricing';

export type StructuredDataOffer = {
  '@type': 'Offer';
  priceCurrency: string;
  availability: string;
  url: string;
  price?: string;
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
  const slug = href.replace(/^\/shop\//, '').trim();
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
  const fallbackOffer: StructuredDataOffer = {
    '@type': 'Offer',
    priceCurrency: 'USD',
    availability: SCHEMA_AVAILABILITY.inStock,
    url: fallbackUrl
  };

  const slug = resolveShopSlugFromHref(ctaHref);
  if (!slug) return fallbackOffer;

  const products = await getMedusaProductsCached();
  const medusaProduct = products.find((product) => resolveMedusaProductSlug(product) === slug);
  if (!medusaProduct) return fallbackOffer;

  const variant = resolveProductMedusaVariant(medusaProduct);
  const priceCents = resolveProductCalculatedPriceAmount(medusaProduct);
  const priceDollars = centsToDollars(priceCents ?? undefined);

  return {
    '@type': 'Offer',
    priceCurrency: resolvePriceCurrencyFromVariant(variant),
    availability: resolveSchemaAvailabilityFromVariant(variant),
    url: fallbackUrl,
    ...(typeof priceDollars === 'number' ? { price: priceDollars.toFixed(2) } : {})
  };
}
