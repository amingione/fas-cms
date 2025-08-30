import type { Product as SanityProduct } from '@lib/sanity-utils';
import { cn } from '@components/ui/utils';
import { addItem } from '@lib/cart';
import React from 'react';
import '../styles/global.css';

export interface ProductCardProps {
  product: SanityProduct;
  productImage?: { asset?: { url?: string } } | string | null;
  className?: string;
}

function toPriceString(v: number | undefined) {
  if (typeof v !== 'number' || !isFinite(v)) return '—';
  try {
    return `$${parseFloat(String(v)).toFixed(2)}`;
  } catch {
    return `$${Number(v).toFixed(2)}`;
  }
}

function getImageUrl(product: SanityProduct, productImage?: ProductCardProps['productImage']) {
  if (typeof productImage === 'string' && productImage) return productImage;
  if (productImage && typeof productImage === 'object' && productImage.asset?.url)
    return productImage.asset.url;
  return product.images?.[0]?.asset?.url || '/placeholder.png';
}

function getSlug(product: SanityProduct) {
  const s = (product as any).slug;
  return typeof s === 'string' ? s : s?.current || '';
}

function addToCart(product: SanityProduct) {
  try {
    const id = product._id;
    const name = product.title || 'Item';
    const price = Number(product.price ?? 0) || 0;
    const categories = Array.isArray(product.categories)
      ? product.categories.map((c: any) => c?._ref || c?._id || '').filter(Boolean)
      : [];
    addItem({ id, name, price, quantity: 1, categories });
  } catch (e) {
    console.error('addToCart failed', e);
  }
}

export function ProductCard({ product, productImage, className }: ProductCardProps) {
  const imageUrl = getImageUrl(product, productImage ?? null);
  const priceLabel = toPriceString(product.price);
  const name = product.title || 'Product';
  const subtitle = 'F.a.S.';

  return (
    <div
      className={cn(
        'w-full luxury-particles luxury-hover-scale racing-strip h-auto bg-black/40 backdrop-blur-sm rounded-[24px] md:rounded-[32px] lg:rounded-[40px] relative overflow-hidden',
        'shadow-card-outer border border-[rgba(154,154,154,0)] transition-shadow',
        // Subtle default glow + drop (barely noticeable), stronger on hover (offset to upper-left)
        'shadow-[-1px_-1px_4px_rgba(234,29,38,0.08),_-1px_-2px_6px_rgba(0,0,0,0.12)] hover:shadow-[-1px_-1px_2px_rgba(234,29,38,0.35),_-2px_-2px_3px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      {/* Product image (uniform square, flows naturally) */}
      <div className="px-6 md:px-8 lg:px-10 pt-12 md:pt-16">
        <div className="relative mx-auto w-full aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Product details section */}
      <div className="luxury-carbon-effect rounded-t-[20px] md:rounded-t-[28px] lg:rounded-t-[32px] p-5 md:p-6 lg:p-7 shadow-card-inner border-black/30 mt-4 flex flex-col min-h-[170px] md:min-h-[190px] lg:min-h-[200px]">
        {/* Product info */}
        <div className="">
          <h2 className="relative text-white font-ethno text-[12px] md:text-sm lg:text-base font-semibold leading-snug line-clamp-3">
            {name}
          </h2>
          <div>
            <p className="relative mt-2 text-accent font-borg text-[12px] md:text-base font-medium line-clamp-2">
              {subtitle}
            </p>
            <div className="mt-4">
              <button className="text-primary btn-glass font-cyber text-[10px] md:text-xs font-medium line-clamp-2">
                <a href={getSlug(product) ? `/product/${getSlug(product)}` : '#'}>View Details</a>
              </button>
            </div>
          </div>
        </div>

        {/* Price and Add to Cart */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <span className="text-white font-montserrat text-sm md:text-base lg:text-lg font-bold whitespace-nowrap">
            {priceLabel}
          </span>
          {product._id && (
            <button
              className="btn-glass flex items-center gap-1.5 bg-black/60 text-white px-3 py-1.5 md:px-3.5 md:py-1.5 rounded-[12px] md:rounded-[14px] font-montserrat text-[10px] md:text-[11px] shadow-button border border-[rgba(255,255,255,0.65)] whitespace-nowrap"
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
                className="transform -rotate-90"
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
