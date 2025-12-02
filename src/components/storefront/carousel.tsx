'use client';

import type { Product } from '@/lib/sanity-utils';
import ProductCardLiteReact from '@/components/storefront/ProductCardLiteReact';

export interface CarouselProps {
  images: string[];
  className?: string;
  links?: (string | undefined)[];
  captions?: (string | undefined)[];
  /** Speed in seconds for one full loop (lower = faster) */
  speedSec?: number;
  /** When provided, renders ProductCardLite cards instead of raw images. */
  products?: Product[];
}

/**
 * Continuous, 5-up carousel that loops infinitely.
 * Keeps existing API (images/links/captions) so current usage works.
 */
export function Carousel({
  images,
  className = '',
  links,
  captions,
  speedSec = 45,
  products
}: CarouselProps) {
  const css = `
    .track { display:flex; gap:0.5rem; width:max-content; animation: scrollX linear infinite; }
    /* Target a compact card width close to the shop grid columns */
    .slide { position:relative; flex: 0 0 clamp(240px, 30vw, 320px); max-width: 340px; }
    .imgSlide { height: min(34vh, 340px); }
    @media (max-width:1023px){ .slide{ flex-basis: clamp(220px, 45vw, 300px);} }
    @media (max-width:640px){ .slide{ flex-basis: 82vw; } }
    .caption { position:absolute; left:8px; bottom:8px; background:rgba(0,0,0,0.6); color:rgba(255,255,255,0.9); font-size:12px; padding:2px 6px; border-radius:4px; pointer-events:none; }
    .mask-left, .mask-right { position:absolute; top:0; bottom:0; width:60px; pointer-events:none; z-index:1; }
    .mask-left { left:0; background:linear-gradient(to right, rgba(23,23,23,1), rgba(23,23,23,0)); }
    .mask-right { right:0; background:linear-gradient(to left, rgba(23,23,23,1), rgba(23,23,23,0)); }
    @keyframes scrollX { from { transform: translateX(0);} to { transform: translateX(-50%);} }
  `;

  // Product mode
  if (Array.isArray(products) && products.length) {
    const slides = products.map((p, i) => ({ p, key: `p${i}` }));
    const loopSlides = [...slides, ...slides.map((s, i) => ({ ...s, key: `pd${i}` }))];
    return (
      <section className={`relative w-full overflow-hidden ${className}`} aria-label="Products">
        <div className="mask-left" />
        <div className="mask-right" />
        <div className="track" style={{ animationDuration: `${Math.max(30, speedSec)}s` }}>
          {loopSlides.map((s) => (
            <div key={s.key} className="slide">
              <ProductCardLiteReact product={s.p} productImage={s.p?.images?.[0]} />
            </div>
          ))}
        </div>
        <style>{css}</style>
      </section>
    );
  }

  // Image mode (back-compat for existing usage)
  const items = (Array.isArray(images) ? images : []).filter(Boolean);
  if (!items.length) return null;
  const slides = items.map((src, i) => ({
    src,
    href: links?.[i],
    caption: captions?.[i],
    key: `s${i}`
  }));
  const loopSlides = [...slides, ...slides.map((s, i) => ({ ...s, key: `d${i}` }))];

  return (
    <section className={`relative w-full overflow-hidden ${className}`} aria-label="Carousel">
      <div className="mask-left" />
      <div className="mask-right" />
      <div className="track" style={{ animationDuration: `${Math.max(30, speedSec)}s` }}>
        {loopSlides.map((s) => (
          <div key={s.key} className="slide imgSlide">
            {s.href ? (
              <a href={s.href} aria-label={s.caption || 'Item'} className="block">
                <img
                  src={s.src}
                  alt={s.caption || 'Item'}
                  className="h-full w-full object-cover rounded-md"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ) : (
              <img
                src={s.src}
                alt={s.caption || 'Item'}
                className="h-full w-full object-cover rounded-md"
                loading="lazy"
                decoding="async"
              />
            )}
            {s.caption ? <div className="caption">{s.caption}</div> : null}
          </div>
        ))}
      </div>
      <style>{css}</style>
    </section>
  );
}
