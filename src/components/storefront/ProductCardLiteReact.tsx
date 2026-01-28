import Label from '@/components/storefront/label.tsx';
import ProductQuickViewButton from '@/components/storefront/ProductQuickViewButton';
import { portableTextToPlainText } from '@/lib/portableText';
import { normalizeSlugValue, resolveSanityImageUrl, type Product } from '@/lib/sanity-utils';
import { getQuickViewOptionGroups } from '@/lib/quick-view-options';
import {
  formatPrice,
  getActivePrice,
  getCompareAtPrice,
  getSaleBadgeText,
  isOnSale
} from '@/lib/saleHelpers';

type ImgAsset = { url?: string };
type Img = { asset?: ImgAsset; alt?: string };

export default function ProductCardLiteReact({
  product,
  productImage,
  layout = 'grid'
}: {
  product: Product | any;
  productImage?: Img | null;
  layout?: 'grid' | 'list';
}) {
  const slug = normalizeSlugValue((product as any)?.slug);
  const href = slug ? `/shop/${encodeURIComponent(slug)}` : '#';
  const fallbackImage = '/logo/faslogochroma.webp';
  const img = resolveSanityImageUrl([productImage, product?.images]) ?? fallbackImage;
  const displayTitle = product?.displayTitle || product?.title || 'Untitled Product';
  const anchorText =
    typeof product?.seoAnchorText === 'string' && product.seoAnchorText.trim().length > 0
      ? product.seoAnchorText.trim()
      : displayTitle;
  const short =
    portableTextToPlainText(product?.shortDescription) ||
    portableTextToPlainText(product?.description) ||
    (typeof product?.excerpt === 'string' ? product.excerpt : '') ||
    (typeof product?.summary === 'string' ? product.summary : '') ||
    '';
  const shortText = typeof short === 'string' ? short : '';
  const quickViewOptions = getQuickViewOptionGroups(product);
  const activePrice = getActivePrice(product);
  const comparePrice = getCompareAtPrice(product);
  const onSale = isOnSale(product);
  const saleBadge = getSaleBadgeText(product);
  const price = typeof activePrice === 'number' ? activePrice : undefined;
  const analyticsParams = JSON.stringify(
    Object.fromEntries(
      Object.entries({
        product_id: typeof product?._id === 'string' ? product._id : undefined,
        product_name: displayTitle,
        product_slug: slug || undefined,
        price,
        tile_layout: layout
      }).filter(([, value]) => value !== undefined && value !== null && value !== '')
    )
  );

  return layout === 'list' ? (
    <article className="group relative">
      <a
        href={href}
        className="group block rounded-sm border border-[121212/40] bg-dark transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary md:flex md:items-stretch"
        data-analytics-event="product_tile_click"
        data-analytics-category="ecommerce"
        data-analytics-label={anchorText}
        data-analytics-params={analyticsParams}
      >
        {saleBadge && (
          <span className="absolute left-3 top-3 z-10 rounded-full border border-red-500/60 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-200">
            {saleBadge}
          </span>
        )}
        <div className="relative flex aspect-square items-center justify-center bg-dark/30 backdrop-blur-sm md:aspect-auto md:w-56 md:min-w-56 md:max-w-56">
          <img
            src={img}
            alt={anchorText}
            className="max-h-[80%] max-w-[88%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex-1 min-w-0 px-4 py-4 text-left">
          <div className="line-clamp-2 text-[1rem] font-ethno leading-snug text-white">
            {anchorText}
          </div>
          {shortText ? (
            <div className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/70">
              {shortText}
            </div>
          ) : null}
          <div className="mt-3 text-[1.15rem] font-mono text-accent">
            {price !== undefined ? (
              onSale ? (
                <>
                  <span className="text-red-400">{formatPrice(price)}</span>
                  {comparePrice && (
                    <span className="ml-2 text-white/60 line-through">
                      {formatPrice(comparePrice)}
                    </span>
                  )}
                </>
              ) : (
                <span>{formatPrice(price)}</span>
              )
            ) : (
              '—'
            )}
          </div>
        </div>
      </a>
      <div className="pointer-events-none absolute right-4 top-4 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <ProductQuickViewButton
          className="pointer-events-auto"
          product={{
            id: typeof product?._id === 'string' ? product._id : undefined,
            title: displayTitle,
            href,
            price,
            stripePriceId: (product as any)?.stripePriceId,
            medusaVariantId: (product as any)?.medusaVariantId,
            imageSrc: img,
            imageAlt: anchorText,
            description: shortText,
            shortDescriptionPortable: (product as any)?.shortDescription,
            optionGroups: quickViewOptions,
            shippingClass: (product as any)?.shippingClass,
            filters: (product as any)?.filters,
            installOnly: (product as any)?.installOnly
          }}
        />
      </div>
    </article>
  ) : (
    <article className="group relative">
      <a
        href={href}
        className="group block relative overflow-hidden rounded-sm border border-white/30 bg-dark transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
        data-analytics-event="product_tile_click"
        data-analytics-category="ecommerce"
        data-analytics-label={anchorText}
        data-analytics-params={analyticsParams}
      >
        {saleBadge && (
          <span className="absolute left-3 top-3 z-10 rounded-full border border-red-500/60 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-200">
            {saleBadge}
          </span>
        )}
        <div className="contain relative flex aspect-square justify-center pb-10 object-contain bg-dark/30 backdrop-blur-sm">
          <img
            src={img}
            alt={anchorText}
            className="max-h-[78%] max-w-[88%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className="absolute bottom-4 flex w-full items-center gap-1">
          <Label
            title={anchorText}
            amount={price ?? 0}
            originalAmount={comparePrice ?? undefined}
            onSale={onSale}
            position="bottom"
          />
        </div>
      </a>
      <div className="pointer-events-none absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <ProductQuickViewButton
          className="pointer-events-auto"
          product={{
            id: typeof product?._id === 'string' ? product._id : undefined,
            title: displayTitle,
            href,
            price,
            stripePriceId: (product as any)?.stripePriceId,
            medusaVariantId: (product as any)?.medusaVariantId,
            imageSrc: img,
            imageAlt: anchorText,
            description: shortText,
            shortDescriptionPortable: (product as any)?.shortDescription,
            optionGroups: quickViewOptions,
            shippingClass: (product as any)?.shippingClass,
            filters: (product as any)?.filters,
            installOnly: (product as any)?.installOnly
          }}
        />
      </div>
    </article>
  );
}
