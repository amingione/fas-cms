import {
  normalizeSlugValue,
  resolveSanityImageUrl,
  type Product as SanityProduct
} from '@lib/sanity-utils';
import { addItem } from '@lib/cart';
import { emitAddToCartSuccess } from '@/lib/add-to-cart-toast';
import { resolveProductCartMeta } from '@/lib/product-flags';
import { formatPrice } from '@/components/storefront/Price';
import {
  resolveProductCalculatedPriceAmount,
  resolveProductCalculatedOriginalAmount
} from '@/lib/medusa-storefront-pricing';
import { isOnSale, getSaleBadgeText } from '@/lib/saleHelpers';
import './ProductCard.css';

type ProductCardProduct = {
  _id?: string;
  title?: string;
  displayTitle?: string;
  slug?: { current?: string } | string;
  images?: Array<{ asset?: { url?: string } }>;
  categories?: Array<{ _id?: string; title?: string; slug?: { current?: string } | string }>;
  inventory?: { inStock?: boolean; lowStock?: boolean };
  featured?: boolean | null;
  [key: string]: any;
};

export interface ProductCardProps {
  product: ProductCardProduct;
  productImage?: { asset?: { url?: string } } | string | null;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getImageUrl(product: ProductCardProduct, productImage?: ProductCardProps['productImage']) {
  const candidates: unknown[] = [
    productImage,
    product && typeof product === 'object' ? (product as any).image : undefined,
    product?.images
  ];
  const resolved = resolveSanityImageUrl(candidates);
  return resolved ?? null;
}

function getSlug(product: ProductCardProduct) {
  return normalizeSlugValue((product as any)?.slug);
}

/** Resolve badge text and variant class */
function resolveBadge(product: ProductCardProduct): { text: string; variant: string } | null {
  // 1. Custom CMS badge wins
  const custom = (product as any)?.marketing?.badgeText as string | undefined;
  if (custom?.trim()) return { text: custom.trim().toUpperCase(), variant: 'custom' };

  // 2. Sale badge from saleHelpers
  const saleBadge = getSaleBadgeText(product);
  if (saleBadge) return { text: saleBadge, variant: 'sale' };

  // 3. Featured / best seller
  if ((product as any)?.isBestSeller || (product as any)?.bestSeller)
    return { text: 'BEST SELLER', variant: 'bestseller' };
  if (product.featured) return { text: 'BEST SELLER', variant: 'bestseller' };

  // 4. New arrival
  if ((product as any)?.isNew || (product as any)?.newArrival)
    return { text: 'NEW', variant: 'new' };

  return null;
}

/** Resolve stock status */
function resolveStock(product: ProductCardProduct): { label: string; cls: string } {
  const inv = (product as any)?.inventory;
  if (!inv) return { label: 'IN STOCK', cls: 'pc-stock--instock' };
  if (inv.inStock === false) return { label: 'OUT OF STOCK', cls: 'pc-stock--outofstock' };
  if (inv.lowStock) return { label: 'LOW STOCK', cls: 'pc-stock--lowstock' };
  return { label: 'IN STOCK', cls: 'pc-stock--instock' };
}

/** Resolve fitment display string */
function resolveFitment(product: ProductCardProduct): string | null {
  const p = product as any;
  return (
    p.fitment ??
    p.seoFitment ??
    p.fitmentRange ??
    (Array.isArray(p.fitmentYears) ? p.fitmentYears.join(', ') : p.fitmentYears) ??
    null
  );
}

// ── addToCart (kept for compatibility — called from PDP / quick-add) ─────

function addToCart(product: ProductCardProduct) {
  try {
    const id = product._id;
    const name = product.title || 'Item';
    const medusaVariantId = (product as any)?.medusaVariantId;
    if (!medusaVariantId) {
      if (typeof window !== 'undefined') {
        window.alert('Please select a product variant before adding this item to your cart.');
      }
      return;
    }
    const price = resolveProductCalculatedPriceAmount(product);
    if (typeof price !== 'number') {
      if (typeof window !== 'undefined') {
        window.alert('Pricing is unavailable for this product. Please try again later.');
      }
      return;
    }
    const categories = Array.isArray(product.categories)
      ? product.categories.map((c: any) => c?._ref || c?._id || '').filter(Boolean)
      : [];
    const image = resolveSanityImageUrl([product?.images]) || '/logo/fas-logo500.webp';
    const slug = getSlug(product);
    const productUrl = slug ? `/shop/${slug}` : undefined;
    const { shippingClass, installOnly } = resolveProductCartMeta(product);
    const shippingConfig = (product as any)?.shippingConfig || (product as any)?.shipping_config;
    const shippingWeight =
      typeof shippingConfig?.weight === 'number' ? shippingConfig.weight : undefined;
    const shippingDimensions =
      shippingConfig?.dimensions && typeof shippingConfig.dimensions === 'object'
        ? {
            length:
              typeof shippingConfig.dimensions.length === 'number'
                ? shippingConfig.dimensions.length
                : undefined,
            width:
              typeof shippingConfig.dimensions.width === 'number'
                ? shippingConfig.dimensions.width
                : undefined,
            height:
              typeof shippingConfig.dimensions.height === 'number'
                ? shippingConfig.dimensions.height
                : undefined
          }
        : undefined;
    addItem({
      id,
      name,
      price,
      stripePriceId: (product as any)?.stripePriceId,
      medusaVariantId,
      quantity: 1,
      categories,
      image,
      productUrl,
      selectedOptions: [],
      selectedUpgrades: [],
      shippingWeight,
      shippingDimensions,
      ...(shippingClass ? { shippingClass } : {}),
      ...(installOnly ? { installOnly: true } : {})
    });
    emitAddToCartSuccess({ name });
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new Event('open-cart'));
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.error('addToCart failed', e);
    if (typeof window !== 'undefined') {
      window.alert('Unable to add this item. Please select a product variant and try again.');
    }
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function ProductCard({ product, productImage, className }: ProductCardProps) {
  const imageUrl = getImageUrl(product, productImage ?? null);
  const price = resolveProductCalculatedPriceAmount(product);
  // Compare-at is Medusa-authoritative (original_amount from calculated_price)
  const compareAt = resolveProductCalculatedOriginalAmount(product);
  const displayTitle = (product as any)?.displayTitle || product.title || 'Product';
  const brand =
    ((product as any)?.brand as string | undefined) ||
    ((product as any)?.categories?.[0]?.title as string | undefined) ||
    'F.A.S. Motorsports';
  const fitment = resolveFitment(product);
  const slug = getSlug(product);
  const productUrl = slug ? `/shop/${slug}` : '#';
  const badge = resolveBadge(product);
  const stock = resolveStock(product);

  const currentPriceFormatted =
    typeof price === 'number' ? formatPrice(price) : null;

  // compareAtPrice from Sanity is stored in cents (matches Medusa convention)
  const compareAtFormatted =
    typeof compareAt === 'number' && compareAt > 0 ? formatPrice(compareAt) : null;

  return (
    <a
      href={productUrl}
      className={`pc${className ? ` ${className}` : ''}`}
      aria-label={displayTitle}
    >
      {/* Badge */}
      {badge && (
        <div className="pc-badge-wrap">
          <span className={`pc-badge pc-badge--${badge.variant}`}>{badge.text}</span>
        </div>
      )}

      {/* Image */}
      <div className="pc-image">
        {imageUrl ? (
          <img src={imageUrl} alt={displayTitle} loading="lazy" decoding="async" />
        ) : (
          <div className="pc-image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Product Photo</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="pc-body">
        {brand && <span className="pc-brand">{brand}</span>}

        <h3 className="pc-title">{displayTitle}</h3>

        {fitment && <p className="pc-fitment">{fitment}</p>}

        <div className="pc-footer">
          <div className="pc-price">
            {compareAtFormatted && (
              <span className="pc-price-original">{compareAtFormatted}</span>
            )}
            {currentPriceFormatted ? (
              <span className="pc-price-current">{currentPriceFormatted}</span>
            ) : (
              <span className="pc-price-unavail">Contact for price</span>
            )}
          </div>

          <span className={`pc-stock ${stock.cls}`}>
            <span className="pc-stock-dot" />
            {stock.label}
          </span>
        </div>
      </div>
    </a>
  );
}

export default ProductCard;
