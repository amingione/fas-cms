import React from 'react';
import Label from '@/components/storefront/label.tsx';
import type { Product } from '@/lib/sanity-utils';

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
  const slug = typeof product?.slug === 'string' ? product.slug : product?.slug?.current || '';
  const href = slug ? `/shop/${encodeURIComponent(slug)}` : '#';
  const img = productImage?.asset?.url || product?.images?.[0]?.asset?.url || '/placeholder.png';
  const title = product?.title || 'Untitled Product';

  return layout === 'list' ? (
    <a
      href={href}
      className="group block rounded-sm border border-[171717/40] bg-black transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary md:flex md:items-stretch"
    >
      <div className="relative bg-black/30 backdrop-blur-sm md:w-56 md:min-w-56 md:max-w-56 aspect-square md:aspect-auto flex items-center justify-center">
        <img
          src={img}
          alt={title}
          className="max-h-[80%] max-w-[88%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex-1 px-4 py-4 text-left">
        <div className="text-white font-ethno text-[1rem] leading-snug line-clamp-2">{title}</div>
        <div className="mt-3 text-accent font-captain text-[1.15rem]">
          {typeof product?.price === 'number'
            ? `$${Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '—'}
        </div>
      </div>
    </a>
  ) : (
    <a
      href={href}
      className="group block relative overflow-hidden rounded-sm border border-white/20 bg-black transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="relative aspect-square object-contain contain flex pb-10 justify-center bg-black/30 backdrop-blur-sm">
        <img
          src={img}
          alt={title}
          className="max-h-[78%] max-w-[88%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="absolute w-full bottom-4 flex items-center gap-1">
        <Label title={title} amount={typeof product?.price === 'number' ? product.price : 0} position="bottom" />
      </div>
    </a>
  );
}

