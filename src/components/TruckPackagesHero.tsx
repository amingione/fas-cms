import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Settings, Zap } from 'lucide-react';
import { inlineFieldAttrs } from '@lib/content';

type TruckPackagesHeroProps = {
  fieldPathBase?: string;
  badge?: string;
  titleTop?: string;
  titleMid?: string;
  titleBottom?: string;
  kicker?: string;
  ctaPrimaryText?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
};

export function TruckPackagesHero({
  fieldPathBase,
  badge,
  titleTop,
  titleMid,
  titleBottom,
  kicker,
  ctaPrimaryText,
  ctaPrimaryHref,
  ctaSecondaryText,
  ctaSecondaryHref
}: TruckPackagesHeroProps) {
  return (
    <section className="relative overflow-hidden bg-black/10 glass-layer-rounded back-layer rounded-md px-5 shadow-lg text-white mb-5">
      {/* subtle texture / vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_60%)] opacity-20" />

      {/* DIVIDER that appears behind content + truck */}
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-0">
        <div className="h-[1px] w-full bg-white/10" />
        <div className="h-px w-[80%] mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <div className="relative z-10 container px-13 lg:px-20 py-14 lg:py-24 mx-auto grid lg:grid-cols-2 items-center gap-10 lg:gap-16">
        {/* LEFT: Title + Subtitle + CTAs */}
        <div className="order-2 lg:order-1 space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="logo/faslogochroma.webp"
              alt="F.A.S. Motorsports"
              className="w-10 h-10 object-contain accent-image drop-shadow"
            />
            <Badge
              variant="outline"
              className="bg-primary/15 border-primary/40 text-white/80 font-ethno tracking-widest"
              {...(fieldPathBase ? inlineFieldAttrs(`${fieldPathBase}.badge`) : {})}
            >
              {badge ?? 'CUSTOM PERFORMANCE PACKAGES'}
            </Badge>
          </div>

          <h1 className="font-ethno leading-[0.95]">
            <span
              className="block text-white/60 text-4xl sm:text-5xl lg:text-6xl"
              {...(fieldPathBase ? inlineFieldAttrs(`${fieldPathBase}.titleTop`) : {})}
            >
              {titleTop ?? 'TRUCK'}
            </span>
            <span
              className="block text-white/80 text-4xl sm:text-5xl lg:text-6xl"
              {...(fieldPathBase ? inlineFieldAttrs(`${fieldPathBase}.titleMid`) : {})}
            >
              {titleMid ?? 'PACKAGES'}
            </span>
            <span
              className="block text-accent text-2xl sm:text-3xl lg:text-5xl mt-2 font-borg"
              {...(fieldPathBase ? inlineFieldAttrs(`${fieldPathBase}.titleBottom`) : {})}
            >
              {titleBottom ?? 'RAM TRX'}
            </span>
          </h1>

          <p className="text-primary font-borg text-base sm:text-lg lg:text-xl max-w-xl">
            <span {...(fieldPathBase ? inlineFieldAttrs(`${fieldPathBase}.kicker`) : {})}>
              {kicker ?? (
                <>
                  FROM MILD TO WILD —{' '}
                  <span className="font-ethno text-white">
                    OUR CUSTOM PACKAGES ARE BUILT TO DOMINATE
                  </span>
                </>
              )}
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button size="md" className="font-ethno" asChild>
              <a
                href={ctaPrimaryHref ?? '/shop?categorySlug=powerPackages&page=1'}
                {...(fieldPathBase ? inlineFieldAttrs(`${fieldPathBase}.cta.text`) : {})}
              >
                <Zap className="w-5 h-5 mr-2" />
                {ctaPrimaryText ?? 'SHOP PACKAGES'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="font-ethno" asChild>
              <a
                href={ctaSecondaryHref ?? '/customBuild'}
                {...(fieldPathBase ? inlineFieldAttrs(`${fieldPathBase}.ctaSecondary.text`) : {})}
              >
                <Settings className="w-5 h-5 mr-2" />
                {ctaSecondaryText ?? 'CUSTOM QUOTE'}
              </a>
            </Button>
          </div>
        </div>

        {/* RIGHT: BIG TRUCK IMAGE */}
        <div className="relative">
          <img
            src="/images/packages/850-ram.webp"
            alt="Custom RAM TRX Packages"
            className="w-full h-auto rounded-lg shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}

export default TruckPackagesHero;
