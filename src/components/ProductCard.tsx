import {
  normalizeSlugValue,
  resolveSanityImageUrl,
  type Product as SanityProduct
} from '@lib/sanity-utils';
import { cn } from '@components/ui/utils';
import { addItem } from '@lib/cart';
import { prefersDesktopCart } from '@/lib/device';
import { emitAddToCartSuccess } from '@/lib/add-to-cart-toast';
import { resolveProductCartMeta } from '@/lib/product-flags';
import {
  formatPrice,
  getActivePrice,
  getCompareAtPrice,
  getSaleBadgeText,
  isOnSale
} from '@/lib/saleHelpers';
import '../styles/global.css';

export interface ProductCardProps {
  product: SanityProduct;
  productImage?: { asset?: { url?: string } } | string | null;
  className?: string;
}

function getImageUrl(product: SanityProduct, productImage?: ProductCardProps['productImage']) {
  const fallback = '/logo/faslogochroma.webp';
  const candidates: unknown[] = [
    productImage,
    product && typeof product === 'object' ? (product as any).image : undefined,
    product?.images
  ];
  const resolved = resolveSanityImageUrl(candidates);
  return resolved ?? fallback;
}

function getSlug(product: SanityProduct) {
  return normalizeSlugValue((product as any)?.slug);
}

function addToCart(product: SanityProduct) {
  try {
    const id = product._id;
    const name = product.title || 'Item';
    const activePrice = getActivePrice(product);
    const price = Number(activePrice ?? 0) || 0;
    const comparePrice = getCompareAtPrice(product);
    const originalPrice =
      typeof comparePrice === 'number' &&
      (typeof activePrice !== 'number' || comparePrice > activePrice)
        ? comparePrice
        : typeof (product as any)?.price === 'number'
          ? (product as any).price
          : undefined;
    const onSale = isOnSale(product);
    const saleLabel = getSaleBadgeText(product) || (product as any)?.saleLabel;
    const categories = Array.isArray(product.categories)
      ? product.categories.map((c: any) => c?._ref || c?._id || '').filter(Boolean)
      : [];
    const image = resolveSanityImageUrl([product?.images]) || '/logo/faslogochroma.webp';
    const slug = getSlug(product);
    const productUrl = slug ? `/shop/${slug}` : undefined;
    const { shippingClass, installOnly } = resolveProductCartMeta(product);
    addItem({
      id,
      name,
      price,
      originalPrice,
      isOnSale: onSale,
      saleLabel: typeof saleLabel === 'string' ? saleLabel : undefined,
      quantity: 1,
      categories,
      image,
      productUrl,
      selectedOptions: [],
      selectedUpgrades: [],
      ...(shippingClass ? { shippingClass } : {}),
      ...(installOnly ? { installOnly: true } : {})
    });

    emitAddToCartSuccess({ name });

    if (typeof window !== 'undefined') {
      try {
        if (!prefersDesktopCart()) {
          window.dispatchEvent(new Event('open-cart'));
        }
      } catch (err) {
        void err;
        try {
          window.dispatchEvent(new Event('open-cart'));
        } catch {
          // ignore
        }
      }
    }
  } catch (e) {
    console.error('addToCart failed', e);
  }
}

export function ProductCard({ product, productImage, className }: ProductCardProps) {
  const imageUrl = getImageUrl(product, productImage ?? null);
  const activePrice = getActivePrice(product);
  const comparePrice = getCompareAtPrice(product);
  const onSale = isOnSale(product);
  const saleBadge = getSaleBadgeText(product);
  const priceLabel = formatPrice(activePrice);
  const name = product.title || 'Product';
  const subtitle = 'F.a.S.';
  const slug = getSlug(product);
  const productUrl = slug ? `/shop/${slug}` : '#';

  return (
    <div
      className={cn(
        'w-full luxury-hover-scale racing-stripe h-auto bg-dark/40 backdrop-blur-sm rounded-[5px] md:rounded-[10px] lg:rounded-[20px] relative overflow-hidden',
        'shadow-card-outer border border-[rgba(154,154,154,0)] transition-shadow',
        // Subtle default glow + drop (barely noticeable), stronger on hover (offset to upper-left)
        'shadow-[-1px_-1px_4px_rgba(234,29,38,0.08),_-1px_-2px_6px_rgba(0,0,0,0.12)] hover:shadow-[-1px_-1px_2px_rgba(234,29,38,0.35),_-2px_-2px_3px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      {/* Product image (uniform square, flows naturally) */}
      <div className="px-3 package-card md:px-4 lg:px-5 pt-12 md:pt-8">
        <div className="relative mx-auto w-full aspect-square">
          <a href={productUrl} className="inline-flex items-center justify-between gap-1">
            {saleBadge && (
              <span className="absolute left-0 top-0 rounded-full border border-red-500/60 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200">
                {saleBadge}
              </span>
            )}
            <img
              src={imageUrl}
              alt={name}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </a>
        </div>
      </div>

      {/* Product details section */}
      <div className="luxury-carbon-effect rounded p-5 md:p-6 lg:p-7 shadow-card-outer border-black/30 -mt-4 flex flex-col min-h-[200px] md:min-h-[210px] lg:min-h-[220px]">
        {/* Product info */}
        <div className="">
          <h2 className="relative text-white font-ethno text-[12px] md:text-sm lg:text-base font-semibold leading-snug line-clamp-3">
            {name}
          </h2>
          <div>
            <p className="relative chrome-text mt-2 text-accent font-borg text-[15px] md:text-base font-base line-clamp-2">
              {subtitle}
            </p>
            <div className="mt-4 relative">
              <button
                className="text-white btn-glass luxury-btn font-ethno text-[10px] md:text-xs font-medium inline-flex items-center gap-1 px-3 py-1 rounded-full"
                style={{ width: 'auto', minWidth: 0 }}
              >
                <a
                  href={getSlug(product) ? `/shop/${getSlug(product)}` : '#'}
                  className="inline-flex items-center justify-between gap-1"
                >
                  View Details
                </a>
              </button>
            </div>
          </div>
        </div>

        {/* Price and Add to Cart */}
        <div className="mt-2 inline-flex items-center justify-between gap-1">
          <span className="text-accent flex items-center font-ethno text-[12px] md:text-[13px] lg:text-[13px] font-bold whitespace-nowrap">
            {onSale && comparePrice ? (
              <>
                <span className="text-red-400">{formatPrice(activePrice)}</span>
                <span className="ml-2 text-white/60 line-through">{formatPrice(comparePrice)}</span>
              </>
            ) : (
              priceLabel
            )}
          </span>
          {product._id && (
            <button
              className="btn-glass flex items-center gap-1.5 bg-dark/30 text-white px-1 py-2 md:px-3.5 md:py-1.5 rounded-full md:rounded-full font-cyber text-[9px] shadow-button border border-[rgba(86,86,86,0.49)] whitespace-nowrap w-auto"
              style={{ width: 'auto', minWidth: 0 }}
              onClick={(e) => {
                e.preventDefault();
                addToCart(product);
              }}
            >
              Add to cart
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transform -rotate-60"
              >
                <path
                  d="M5.66675 3.33332L10.3334 7.99999L5.66675 12.6667"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
