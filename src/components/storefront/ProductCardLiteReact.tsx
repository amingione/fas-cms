import React from 'react';
import Label from '@/components/storefront/label.tsx';
import ProductQuickViewButton from '@/components/storefront/ProductQuickViewButton';
import { portableTextToPlainText } from '@/lib/portableText';
import { resolveSanityImageUrl, type Product } from '@/lib/sanity-utils';

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
  const fallbackImage = '/logo/faslogochroma.png';
  const img = resolveSanityImageUrl([productImage, product?.images]) ?? fallbackImage;
  const title = product?.title || 'Untitled Product';
  const short =
    portableTextToPlainText(product?.shortDescription) ||
    portableTextToPlainText(product?.description) ||
    (typeof product?.excerpt === 'string' ? product.excerpt : '') ||
    (typeof product?.summary === 'string' ? product.summary : '') ||
    '';
  const shortText = typeof short === 'string' ? short : '';
  const price = typeof product?.price === 'number' ? product.price : undefined;

  return layout === 'list' ? (
    <article className="group relative">
      <a
        href={href}
        className="group block rounded-sm border border-[121212/40] bg-black transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary md:flex md:items-stretch"
      >
        <div className="relative flex aspect-square items-center justify-center bg-black/30 backdrop-blur-sm md:aspect-auto md:w-56 md:min-w-56 md:max-w-56">
          <img
            src={img}
            alt={title}
            className="max-h-[80%] max-w-[88%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex-1 px-4 py-4 text-left">
          <div className="line-clamp-2 text-[1rem] font-ethno leading-snug text-white">{title}</div>
          {shortText ? (
            <div className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/70">
              {shortText}
            </div>
          ) : null}
          <div className="mt-3 text-[1.15rem] font-mono text-accent">
            {price !== undefined
              ? `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </div>
        </div>
      </a>
      <div className="pointer-events-none absolute right-4 top-4 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <ProductQuickViewButton
          className="pointer-events-auto"
          product={{
            id: typeof product?._id === 'string' ? product._id : undefined,
            title,
            href,
            price,
            imageSrc: img,
            imageAlt: title,
            description: shortText
          }}
        />
      </div>
    </article>
  ) : (
    <article className="group relative">
      <a
        href={href}
        className="group block relative overflow-hidden rounded-sm border border-white/30 bg-black transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <div className="contain relative flex aspect-square justify-center pb-10 object-contain bg-black/30 backdrop-blur-sm">
          <img
            src={img}
            alt={title}
            className="max-h-[78%] max-w-[88%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className="absolute bottom-4 flex w-full items-center gap-1">
          <Label title={title} amount={price ?? 0} position="bottom" />
        </div>
      </a>
      <div className="pointer-events-none absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <ProductQuickViewButton
          className="pointer-events-auto"
          product={{
            id: typeof product?._id === 'string' ? product._id : undefined,
            title,
            href,
            price,
            imageSrc: img,
            imageAlt: title,
            description: shortText
          }}
        />
      </div>
    </article>
  );
}
