'use client';

import { CheckIcon } from '@heroicons/react/20/solid';
import { useEffect, useMemo, useState } from 'react';

import { formatCents } from '@/lib/pricing';

const products = [
  {
    id: 'prod1',
    name: 'Billet Hellcat Supercharger Lid',
    sale: true,
    handle: 'fas-motorsports-billet-hellcat-supercharger-lid',
    image: '/images/billetParts/fas-new-billet-lid-tilt.webp',
    highlights: ['CNC‑machined billet', 'Dyno‑tested', 'Direct bolt‑on'],
    featured: false,
    href: '/shop/fas-motorsports-billet-hellcat-supercharger-lid'
  },
  {
    id: 'prod2',
    name: 'Predator Pulley',
    sale: true,
    handle: 'fas-predator-lower-pulley-no-tune-required',
    image: '/images/pulleys/FASpredator-lower-pulley.webp',
    highlights: ['Billet F.A.S. Pulley', 'Patent pending design', ' complete kit'],
    featured: true,
    href: '/shop/fas-predator-lower-pulley-no-tune-required'
  },
  {
    id: 'prod3',
    name: '6.7L Powerstroke piping kits',
    sale: true,
    handle: '2020-6-7l-powerstroke-piping-kit',
    image: '/images/fabrication/6.7LpowerstrokePipingKit.webp',
    highlights: ['TIG-Welded Stainless Steel', 'Optimized Airflow', 'Direct Bolt-On Fit'],
    featured: false,
    href: '/shop/2020-6-7l-powerstroke-piping-kit'
  }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function PricingCards() {
  const [priceVisibility, setPriceVisibility] = useState<Record<string, boolean>>({});
  const [visibilityStatus, setVisibilityStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [priceByHandle, setPriceByHandle] = useState<
    Record<string, { priceCents?: number; variantId?: string }>
  >({});
  const [pricingStatus, setPricingStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const allHandles = useMemo(
    () => products.map((product) => product.handle).filter(Boolean),
    []
  );

  const pricedHandles = useMemo(
    () => allHandles.filter((handle) => priceVisibility[handle] === true),
    [allHandles, priceVisibility]
  );

  useEffect(() => {
    if (!allHandles.length) return;
    let isActive = true;
    const fetchVisibility = async () => {
      setVisibilityStatus('loading');
      try {
        const response = await fetch('/api/promotions/promo-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handles: allHandles })
        });
        if (!response.ok) throw new Error('Failed to load promo card visibility');
        const data = (await response.json()) as { visibility?: Record<string, boolean> };
        if (!isActive) return;
        setPriceVisibility(data?.visibility ?? {});
        setVisibilityStatus('ready');
      } catch {
        if (!isActive) return;
        setVisibilityStatus('error');
      }
    };

    void fetchVisibility();

    return () => {
      isActive = false;
    };
  }, [allHandles]);

  useEffect(() => {
    if (!pricedHandles.length) return;
    let isActive = true;

    const fetchPricing = async () => {
      setPricingStatus('loading');
      try {
        const response = await fetch('/api/medusa/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handles: pricedHandles })
        });

        if (!response.ok) throw new Error('Failed to load pricing');
        const data = (await response.json()) as { prices?: Record<string, { priceCents?: number }> };
        if (!isActive) return;
        setPriceByHandle(data?.prices ?? {});
        setPricingStatus('ready');
      } catch {
        if (!isActive) return;
        setPricingStatus('error');
      }
    };

    void fetchPricing();

    return () => {
      isActive = false;
    };
  }, [pricedHandles]);

  return (
    <section className="relative isolate overflow-hidden bg-dark py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-5xl font-semibold font-ethno tracking-tight text-white sm:text-6xl">
            CYBER MONDAY <span className="text-glow-primary text-black font-borg">DEALS</span>
          </h2>
          <p className="mt-6 text-lg text-gray-400">Limited time Cyber Monday deals!</p>
          <p>Save on our most popular products while supplies last.</p>
        </div>

        {/* CARD GRID */}
        <div className="relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 lg:mx-0 lg:-mb-14 lg:max-w-none lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              data-featured={product.featured ? 'true' : undefined}
              className={classNames(
                product.featured
                  ? 'z-10 bg-primary/20 backdrop-blur-xl shadow-primary/30 shadow-card-outter shadow-inner border border-primary/40 scale-105 lg:scale-110'
                  : 'bg-white/5 border border-white/10 backdrop-blur-md outline-1 -outline-offset-1 pb-14px',
                'relative rounded-md border-t border-white/10 shadow-card-outter shadow-inner shadow-white/20 transition-transform hover:-translate-y-1 pb-14px'
              )}
            >
              <div className="p-8 lg:pt-12 xl:p-10 xl:pt-14">
                <h3 className="text-sm font-semibold text-white">{product.name}</h3>

                {product.sale && (
                  <div className="mb-3 inline-block rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">
                    SALE
                  </div>
                )}

                {priceVisibility[product.handle] === true && (
                  <div className="mb-4 text-xl font-semibold text-white">
                    {product.handle && priceByHandle[product.handle]?.priceCents != null
                      ? formatCents(priceByHandle[product.handle]?.priceCents)
                      : pricingStatus === 'loading' || visibilityStatus === 'loading'
                        ? 'Loading price...'
                        : 'Pricing unavailable'}
                  </div>
                )}

                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-40 object-contain rounded-lg mb-4"
                />

                <div className="mt-6 flex gap-3">
                  <a
                    href={product.href}
                    className={classNames(
                      product.featured
                        ? 'btn-plain bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40'
                        : 'btn-plain bg-[#1a1a1a] hover:bg-primary/10 border border-white/10 shadow-md',
                      'btn-plain w-full rounded-md px-3 py-2 text-sm font-semibold text-center text-white transition-colors'
                    )}
                  >
                    View Product
                  </a>
                </div>

                <ul className="mt-8 space-y-3 text-sm text-white border-t border-white/10 pt-4">
                  {product.highlights.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon className="h-6 w-5 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
