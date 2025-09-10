// 'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { addItem } from '@components/cart/actions';
import * as React from 'react';

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
  } catch {}
  return out;
}

function pickVariantId(product: any, selected: Record<string, string>): string | undefined {
  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return undefined;
  // Normalize into { name, value } pairs and compare
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
  return match?._id || match?.id; // support either _id or id
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

  React.useEffect(() => {
    setSelected(readSelectedFromURL());
  }, []);

  const variantId = pickVariantId(product, selected);
  const availableForSale = isAvailable(product, variantId);

  const disabledReason =
    !variantId && Array.isArray(product?.variants) && product.variants.length > 1
      ? 'Please select an option'
      : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = (variantId || product?._id || product?.id) as Maybe<string>;
    if (!id) return;

    await addItem(null as any, {
      id,
      name: product?.title,
      price:
        typeof product?.salePrice === 'number'
          ? product.salePrice
          : typeof product?.price === 'number'
            ? product.price
            : undefined,
      image: product?.images?.[0]?.asset?.url || product?.images?.[0]?.url,
      options: selected,
      quantity: 1
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <SubmitButton available={availableForSale} disabledReason={disabledReason} />
    </form>
  );
}
