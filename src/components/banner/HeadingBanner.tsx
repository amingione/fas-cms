import React from 'react';

type Cta = {
  label: string;
  href: string;
  onClick?: () => void;
};

export type HeadingBannerProps = {
  /** Small eyebrow above the headline */
  eyebrow?: string;
  /** Main headline; you can include <span className="text-red-600">…</span> for emphasis */
  headline: React.ReactNode;
  /** Optional subline under the headline */
  subline?: string;
  /** CTA button */
  cta?: Cta;
  /** Right-side product image(s) */
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }>;
  /** Optional background image (blurred/darkened automatically) */
  backgroundUrl?: string;
  /** If true, shows a thin divider line under the text block */
  showDivider?: boolean;
  /** Optional gradient tint (Tailwind bg-gradient-to-* utilities) */
  tintClassName?: string;
  /** Optional className pass-through */
  className?: string;
};

const HeadingBanner: React.FC<HeadingBannerProps> = ({
  eyebrow = 'F.A.S. PREDATOR PULLEY',
  headline,
  subline = 'PATENT PENDING INNOVATION – PRECISION-ENGINEERED FOR FLAWLESS PERFORMANCE.',
  cta = { label: 'Shop Now »', href: '/shop/fas-predator-lower-pulley' },
  images,
  backgroundUrl,
  showDivider = false,
  tintClassName = 'from-black/80 via-black/60 to-black/80',
  className = ''
}) => {
  return (
    <section
      className={
        'relative overflow-hidden isolate ' +
        'min-h-[70vh] md:min-h-[80vh] flex items-center ' +
        className
      }
      aria-label="Featured banner"
    >
      {/* Background image (soft, dark) */}
      {backgroundUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            filter: 'saturate(0.9) brightness(0.5) blur(2px)'
          }}
        />
      )}

      {/* Vignette / tint */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${tintClassName}`}
      />

      {/* Subtle radial spotlight toward the images */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 -z-10 h-[120vmin] w-[120vmin] bg-black/40 [mask-image:radial-gradient(60%_60%_at_60%_50%,#000_0%,transparent_70%)]"
      />

      <div className="container mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
        {/* Left text block */}
        <div className="flex flex-col justify-center">
          <p className="mb-4 font-semibold tracking-[0.25em] text-neutral-200/90">{eyebrow}</p>

          <h1 className="text-4xl leading-[1.05] font-black tracking-tight text-white md:text-6xl">
            {headline}
          </h1>

          {subline && (
            <p className="mt-6 max-w-xl text-sm md:text-base text-neutral-300/90">{subline}</p>
          )}

          {cta && (
            <div className="mt-10">
              <a
                href={cta.href}
                onClick={cta.onClick}
                className="inline-flex items-center rounded-xl bg-red-600 px-7 py-4 font-extrabold tracking-wider text-white transition hover:bg-red-500 focus:outline-none focus:ring-4 focus:ring-red-600/40"
              >
                {cta.label}
              </a>
            </div>
          )}

          {showDivider && (
            <div
              aria-hidden="true"
              className="mt-12 h-px w-full max-w-md bg-gradient-to-r from-white/20 to-transparent"
            />
          )}
        </div>

        {/* Right image cluster */}
        <div className="relative flex items-center justify-center">
          {/* Decorative faint ring/bokeh behind images */}
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div className="absolute right-6 top-10 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-10 left-0 h-44 w-44 rounded-full bg-white/7 blur-2xl" />
          </div>

          <div className="relative grid w-full max-w-2xl grid-cols-2 gap-6">
            {images.map((img, i) => (
              <img
                key={i}
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                className={
                  'object-contain transition-transform duration-300 group-hover:scale-105 ' +
                  'max-h-32 sm:max-h-40 md:max-h-56 lg:max-h-72 w-auto mx-auto ' +
                  (img.className ?? '')
                }
                loading="eager"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadingBanner;
