import React from 'react';
import { Button } from '@components/ui/button';

type CTA = { label: string; href: string; onClick?: () => void };

type Feature = {
  side: 'left' | 'right'; // where the product image sits
  image: { src: string; alt: string; className?: string };
  sticker?: { src: string; alt: string; className?: string }; // optional badge/logo
  stars?: number; // 0–5 (defaults 5)
  lines: [string, string?, string?]; // up to 3 headline lines
  pricePrefix?: string; // "ONLY FROM"
  price?: string; // "$899.99"
  cta: CTA;
};

export type ProductFeatureBannerProps = {
  features: [Feature, Feature]; // exactly two for this layout
  backgroundUrl?: string; // optional bg texture
  className?: string;
};

const StarRow = ({ count = 5 }: { count?: number }) => (
  <div className="flex gap-2" aria-label={`${count} stars`}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="inline-block text-yellow-400" aria-hidden="true">
        ★
      </span>
    ))}
  </div>
);

const FeatureBlock = ({ f, isSecond }: { f: Feature; isSecond?: boolean }) => {
  const isRight = f.side === 'right';

  return (
    <div
      className={
        `relative grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12 ` +
        (isSecond
          ? 'mt-12 border-t border-white/10 pt-12 md:mt-0 md:border-l md:border-t-0 md:pl-12 md:pt-0'
          : 'md:pr-12')
      }
    >
      {/* Product image */}
      <div className={`relative ${isRight ? 'md:order-2' : 'md:order-1'}`}>
        <img
          src={f.image.src}
          alt={f.image.alt}
          className={
            'mx-auto max-h-72 md:max-h-[15rem] object-contain drop-shadow-2xl shadow-white/10' +
            (f.image.className ?? '')
          }
          loading="eager"
        />
        {f.sticker && (
          <img
            src={f.sticker.src}
            alt={f.sticker.alt}
            className={
              'absolute -bottom-8 left-6 w-20 md:w-24 drop-shadow-lg ' + (f.sticker.className ?? '')
            }
            loading="lazy"
          />
        )}
      </div>

      {/* Copy */}
      <div className={`text-center ${isRight ? 'md:text-right md:order-1' : 'md:text-left md:order-2'}`}>
        <div
          className={`mb-4 md:mb-6 flex justify-center ${isRight ? 'md:justify-end' : 'md:justify-start'}`}
        >
          <StarRow count={f.stars ?? 5} />
        </div>

        <h2 className="font-ethno leading-tight tracking-wide text-white text-2xl md:text-3xl space-y-1">
          <div className="uppercase">{f.lines[0]}</div>
          {f.lines[1] && <div className="uppercase">{f.lines[1]}</div>}
          {f.lines[2] && <div className="uppercase">{f.lines[2]}</div>}
        </h2>

        {(f.pricePrefix || f.price) && (
          <p className="mt-4 text-base md:text-xl font-extrabold tracking-wide text-neutral-300">
            {(f.pricePrefix ?? '').toUpperCase()}{' '}
            {f.price && (
              <span className="text-red-500 italic font-ethno drop-shadow-sm">{f.price}</span>
            )}
          </p>
        )}

        <div
          className={`mt-8 flex w-full justify-center md:w-auto ${
            isRight ? 'md:justify-end' : 'md:justify-start'
          }`}
        >
          <Button asChild size="sm" className="font-ethno tracking-wider">
            <a href={f.cta.href} onClick={f.cta.onClick}>
              {f.cta.label}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProductFeatureBanner: React.FC<ProductFeatureBannerProps> = ({
  features,
  backgroundUrl,
  className = ''
}) => {
  return (
    <section
      className={
        'relative isolate overflow-hidden text-white ' +
        'bg-gradient-to-b from-black via-neutral-900 to-black ' +
        'py-12 md:py-20 ' +
        className
      }
      aria-label="Product features"
    >
      {/* Background image + vignette */}
      {backgroundUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            filter: 'brightness(0.5) blur(1px)'
          }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_100%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.75)_70%)]"
      />

      {/* Floor shadow for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent"
      />

      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-12 md:gap-16">
          {features.map((feature, idx) => (
            <FeatureBlock key={feature.image.src ?? idx} f={feature} isSecond={idx === 1} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductFeatureBanner;
