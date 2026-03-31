import * as React from 'react';

/**
 * ProductMediaCarousel — FAS theme (Astro + Sanity friendly)
 *
 * Replaces the Next.js/Shopify version with a lightweight, dependency-free
 * carousel that works as a client component in Astro. No Next.js imports.
 *
 * Props:
 *  - images: Array of Sanity images ({ asset: { url }, alt }) or plain URLs (string)
 *  - className: optional wrapper class
 *
 * Behavior:
 *  - Scroll-snap carousel with keyboard, touch, and button controls
 *  - Thumbnails beneath for quick navigation
 *  - Object-contain so product photos sit cleanly on dark background
 */

export type SanityImage = { asset?: { url?: string }; alt?: string } | string;

export interface ProductMediaCarouselProps {
  images: SanityImage[];
  className?: string;
  /**
   * Optional per-image links (e.g., categories). If provided, each slide becomes clickable.
   * Length should match `images` length.
   */
  links?: (string | undefined)[];
  /**
   * Optional per-image captions (shown in lower-left overlay).
   * Length should match `images` length.
   */
  captions?: (string | undefined)[];
  /**
   * Optional autoplay in milliseconds. Example: 5000 for 5s.
   * Set to 0 or undefined to disable.
   */
  autoplayMs?: number;
  /**
   * If true, keep advancing from last slide back to first.
   */
  loop?: boolean;
}

function getUrl(img: SanityImage): string {
  if (typeof img === 'string') return img;
  return img?.asset?.url || '';
}

function getAlt(img: SanityImage, fallbackIndex: number): string {
  if (typeof img === 'string') return `Product image ${fallbackIndex + 1}`;
  return img?.alt || `Product image ${fallbackIndex + 1}`;
}

export default function ProductMediaCarousel({
  images,
  className = '',
  links,
  captions,
  autoplayMs,
  loop = true
}: ProductMediaCarouselProps) {
  const clean = (Array.isArray(images) ? images : []).filter(Boolean);
  const seenKeys = new Set<string>();
  const slides = clean.filter((img) => {
    const url = getUrl(img);
    const alt = typeof img === 'string' ? '' : img?.alt || '';
    const key = `${url}|${alt}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  const containerRef = React.useRef<HTMLUListElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = React.useState(0);
  const [isInteractionPaused, setIsInteractionPaused] = React.useState(false);
  const [isUserPaused, setIsUserPaused] = React.useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = React.useState(false);
  const autoplayEnabled = typeof autoplayMs === 'number' && autoplayMs > 0;
  const isAutoplayPaused = isInteractionPaused || isUserPaused || isDocumentHidden;

  // Optional autoplay
  React.useEffect(() => {
    if (!autoplayEnabled || isAutoplayPaused) return;
    const id = window.setInterval(() => {
      if (!containerRef.current || slides.length === 0) return;
      const nextIdx = index + 1;
      if (nextIdx < slides.length) {
        scrollToIdx(nextIdx);
      } else if (loop) {
        scrollToIdx(0);
      }
    }, autoplayMs as number);
    return () => window.clearInterval(id);
  }, [autoplayEnabled, autoplayMs, index, isAutoplayPaused, loop, slides.length]);

  React.useEffect(() => {
    const onVisibilityChange = () => setIsDocumentHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== index && i >= 0 && i < slides.length) setIndex(i);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [index, slides.length]);

  function scrollToIdx(i: number) {
    const el = containerRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(i, slides.length - 1));
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
    setIndex(target);
  }

  function next() {
    if (index + 1 < slides.length) {
      scrollToIdx(index + 1);
    } else if (loop) {
      scrollToIdx(0);
    }
  }
  function prev() {
    scrollToIdx(index - 1);
  }

  function handleWrapperKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!wrapperRef.current?.contains(document.activeElement)) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  }

  if (!slides.length) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* Main media carousel */}
      <div
        className="relative"
        ref={wrapperRef}
        onKeyDown={handleWrapperKeyDown}
        onMouseEnter={() => setIsInteractionPaused(true)}
        onMouseLeave={() => setIsInteractionPaused(false)}
        onFocusCapture={() => setIsInteractionPaused(true)}
        onBlurCapture={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
            setIsInteractionPaused(false);
          }
        }}
      >
        <button
          type="button"
          onClick={prev}
          aria-label="View previous product image in gallery"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-[#1a1a1a] hover:bg-black/80 p-2 text-white border border-white/20"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="View next product image in gallery"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-[#1a1a1a] hover:bg-black/80 p-2 text-white border border-white/20"
        >
          ›
        </button>
        {autoplayEnabled && (
          <button
            type="button"
            onClick={() => setIsUserPaused((prevPaused) => !prevPaused)}
            aria-label={isUserPaused ? 'Resume image slideshow' : 'Pause image slideshow'}
            className="absolute left-1/2 top-2 -translate-x-1/2 z-10 rounded-full bg-[#1a1a1a] hover:bg-black/80 px-3 py-1 text-xs text-white border border-white/20"
          >
            {isUserPaused ? 'Resume' : 'Pause'}
          </button>
        )}

        <ul
          ref={containerRef}
          className="relative flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar rounded-xl border border-white/20 bg-[#1a1a1a]"
          style={{ scrollBehavior: 'smooth' }}
        >
          {slides.map((img, i) => {
            const href = Array.isArray(links) ? links[i] : undefined;
            const alt = getAlt(img, i);
            const slideCaption = captions?.[i] || alt;
            const content = (
              <>
                <img
                  src={getUrl(img)}
                  alt={alt}
                  className="max-h-[75vh] h-full w-full object-contain select-none"
                  draggable={false}
                />
                <span className="sr-only">{`Slide ${i + 1} of ${slides.length}: ${alt}`}</span>
                {/* index badge */}
                <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-[#1a1a1a] px-2 py-0.5 text-xs text-white/80">
                  {i + 1}/{slides.length}
                </div>
                {/* optional caption */}
                <div className="pointer-events-none absolute left-2 bottom-2 mr-16 rounded bg-[#1a1a1a] px-2 py-0.5 text-xs text-white/90">
                  {slideCaption}
                </div>
              </>
            );
            return (
              <li
                key={getUrl(img) + i}
                className="relative min-w-full snap-start aspect-square flex items-center justify-center bg-dark"
              >
                {href ? (
                  <a href={href} aria-label={alt} className="block h-full w-full">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Thumbnails */}
      {slides.length > 1 && (
        <div className="mt-3 overflow-x-auto">
          <div className="flex gap-2">
            {slides.map((img, i) => (
              <button
                key={'thumb-' + i}
                type="button"
                onClick={() => scrollToIdx(i)}
                title={links?.[i] ? `Open: ${links[i]}` : `Image ${i + 1}`}
                className={`relative h-16 w-16 flex-none overflow-hidden rounded border ${
                  index === i
                    ? 'border-primary ring-2 ring-primary/60'
                    : 'border-white/20 hover:border-white/20'
                }`}
                aria-label={`Go to image ${i + 1}`}
                aria-pressed={index === i}
              >
                <img
                  src={getUrl(img)}
                  alt={getAlt(img, i)}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
