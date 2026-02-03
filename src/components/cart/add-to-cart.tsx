// 'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { addItem } from '@components/cart/actions';
import { prefersDesktopCart } from '@/lib/device';
import { emitAddToCartSuccess } from '@/lib/add-to-cart-toast';
import * as React from 'react';
import { resolveProductCartMeta } from '@/lib/product-flags';
import { getActivePrice, getCompareAtPrice, getSaleBadgeText, isOnSale } from '@/lib/saleHelpers';

/**
 * AddToCart — FAS + Sanity version
 *
 * Expects `product` shaped like your Sanity product with optional `variants` and `options`.
 * Reads selected options from URL (?opt_color=Red&opt_size=L) and tries to match a variant id.
 * Falls back to product id when no variants are defined.
 */

type Maybe<T> = T | undefined | null;

function readSelectedFromURL(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const url = new URL(window.location.href);
    url.searchParams.forEach((v, k) => {
      if (k.startsWith('opt_')) out[k.replace('opt_', '')] = v;
    });
  } catch (error) {
    void error;
  }
  return out;
}

function pickVariantId(product: any, selected: Record<string, string>): string | undefined {
  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];

  // If product has variants array, try to match selected options
  if (variants.length > 0) {
    const selEntries = Object.entries(selected);
    const match = variants.find((v) => {
      const opts = Array.isArray(v?.selectedOptions) ? v.selectedOptions : [];
      return selEntries.every(([k, val]) =>
        opts.some(
          (o: any) =>
            String(o?.name || '').toLowerCase() === String(k).toLowerCase() &&
            String(o?.value || '') === String(val)
        )
      );
    });

    if (match) {
      // Return variant's medusaVariantId or _id
      return match.medusaVariantId || match._id || match.id;
    }
  }

  // FALLBACK: Use product-level medusaVariantId (current schema)
  return product.medusaVariantId || undefined;
}

function isAvailable(product: any, variantId?: string): boolean {
  if (!variantId) return Boolean(product?.availableForSale ?? true);
  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];
  const v = variants.find((x) => x._id === variantId || x.id === variantId);
  return Boolean(v?.inStock ?? v?.availableForSale ?? true);
}

function SubmitButton({
  available,
  disabledReason
}: {
  available: boolean;
  disabledReason?: string;
}) {
  const buttonClasses =
    'relative flex w-full items-center justify-center rounded-full bg-primary p-4 tracking-wide text-accent font-semibold';
  const disabledClasses = 'cursor-not-allowed opacity-60 hover:opacity-60';

  if (!available) {
    return (
      <button disabled className={clsx(buttonClasses, disabledClasses)}>
        Out Of Stock
      </button>
    );
  }

  if (disabledReason) {
    return (
      <button aria-label={disabledReason} disabled className={clsx(buttonClasses, disabledClasses)}>
        <div className="absolute left-0 ml-4">
          <PlusIcon className="h-5" />
        </div>
        Add To Cart
      </button>
    );
  }

  return (
    <button aria-label="Add to cart" className={clsx(buttonClasses, { 'hover:opacity-90': true })}>
      <div className="absolute left-0 ml-4">
        <PlusIcon className="h-5" />
      </div>
      Add To Cart
    </button>
  );
}

export function AddToCart({ product }: { product: any }) {
  const [selected, setSelected] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelected(readSelectedFromURL());
  }, []);

  const variantId = pickVariantId(product, selected);
  const availableForSale = isAvailable(product, variantId);
  const productSlug = (() => {
    if (typeof product?.slug === 'string') return product.slug;
    if (product?.slug && typeof product.slug.current === 'string') return product.slug.current;
    if (typeof product?.href === 'string') return product.href;
    return undefined;
  })();
  const productUrl = productSlug
    ? productSlug.startsWith('/')
      ? productSlug
      : `/shop/${productSlug}`
    : undefined;
  const activePrice = getActivePrice(product);
  const comparePrice = getCompareAtPrice(product);
  const onSale = isOnSale(product);
  const saleLabel = getSaleBadgeText(product) || (product as any)?.saleLabel;

  const disabledReason =
    !variantId && Array.isArray(product?.variants) && product.variants.length > 1
      ? 'Please select an option'
      : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = (variantId || product?._id || product?.id) as Maybe<string>;
    if (!id) return;

    // ✅ MEDUSA-FIRST PRICING VALIDATION
    // Block cart additions if price is not a valid number from Medusa
    if (typeof activePrice !== 'number' || !Number.isFinite(activePrice) || activePrice <= 0) {
      setError(
        'This product is currently unavailable. Price information is missing or invalid.'
      );
      console.error('[add-to-cart] Blocked cart addition - invalid price', {
        productId: id,
        productTitle: product?.title,
        activePrice,
        priceType: typeof activePrice,
        medusaVariantId: variantId
      });
      return;
    }

    const { shippingClass, installOnly } = resolveProductCartMeta(product);
    const selectedOptionsList = Object.entries(selected).map(
      ([key, value]) => `${key}: ${value}`
    );
    const originalPrice =
      typeof (product as any)?.price === 'number'
        ? (product as any).price
        : typeof comparePrice === 'number'
          ? comparePrice
          : undefined;

    const result = await addItem(null as any, {
      id,
      name: product?.title,
      price: activePrice, // ✅ Guaranteed to be valid number > 0
      stripePriceId: (product as any)?.stripePriceId,
      medusaVariantId: variantId || (product as any)?.medusaVariantId,
      originalPrice,
      isOnSale: onSale,
      saleLabel: typeof saleLabel === 'string' ? saleLabel : undefined,
      image: product?.images?.[0]?.asset?.url || product?.images?.[0]?.url,
      options: selected,
      selectedOptions: selectedOptionsList,
      selectedUpgrades: [],
      quantity: 1,
      productUrl,
      ...(shippingClass ? { shippingClass } : {}),
      ...(installOnly ? { installOnly: true } : {})
    });
    if (typeof result === 'string') {
      setError(result);
      return;
    }

    emitAddToCartSuccess({ name: product?.title });

    try {
      if (!prefersDesktopCart()) {
        window.dispatchEvent(new Event('open-cart'));
      }
    } catch (error) {
      void error;
      try {
        window.dispatchEvent(new Event('open-cart'));
      } catch {
        // ignore
      }
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <SubmitButton available={availableForSale} disabledReason={disabledReason} />
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
