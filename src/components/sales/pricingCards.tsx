'use client';

import { CheckIcon } from '@heroicons/react/20/solid';

const products = [
  {
    id: 'prod1',
    price: '$1709.99',
    sale: true,
    compareAt: '$1899.99',
    image: '/images/billetParts/fas-new-billet-lid-tilt.webp',
    highlights: ['CNC‑machined billet', 'Dyno‑tested', 'Direct bolt‑on'],
    featured: false,
    href: '/shop/fas-motorsports-billet-hellcat-supercharger-lid'
  },
  {
    id: 'prod2',
    name: 'FAS Hellcat Pulley Upgrade',
    price: '$499.99',
    sale: true,
    compareAt: '$699.99',
    image: '/images/products/pulley.jpg',
    highlights: ['+40–80whp gains', 'Lightweight design', 'Heat‑treated steel'],
    featured: true,
    href: '/product/fas-pulley-upgrade'
  },
  {
    id: 'prod3',
    name: 'FAS Carbon Fiber Intake Lid',
    price: '$699.99',
    sale: true,
    compareAt: '$899.99',
    image: '/images/products/intake-lid.jpg',
    highlights: ['Real carbon fiber', 'Improves airflow', 'Premium finish'],
    featured: false,
    href: '/product/fas-carbon-lid'
  }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function PricingCards() {
  return (
    <section className="relative isolate overflow-hidden bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            BLACK FRIDAY DOORBUSTERS
          </h2>
          <p className="mt-6 text-lg text-gray-400">
            Limited time Black Friday deals! Save big on our most popular products while supplies
            last.
          </p>
        </div>

        {/* CARD GRID */}
        <div className="border border-white/5 shadow-card-outter shadow-inner shadow-white/10 rounded-xl relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 lg:mx-0 lg:-mb-14 lg:max-w-none lg:grid-cols-3">
          {/* OVERLAY PANEL (behind cards) */}
          <div
            aria-hidden="true"
            className="hidden lg:absolute lg:inset-x-px lg:top-4 lg:bottom-0 lg:block lg:rounded-t-2xl lg:bg-gray-800/80 lg:ring-1 lg:ring-white/10"
          />

          {products.map((product) => (
            <div
              key={product.id}
              data-featured={product.featured ? 'true' : undefined}
              className={classNames(
                product.featured
                  ? 'z-10 bg-primary/20 backdrop-blur-xl shadow-2xl shadow-primary/30 border border-primary/40 outline-1 -outline-offset-1 outline-white/10'
                  : 'bg-black/30 backdrop-blur-md outline-1 -outline-offset-1 outline-white/10 lg:bg-transparent lg:pb-14 lg:outline-0',
                'relative rounded-2xl lg:shadow-[0_0_35px_rgba(0,0,0,0.45)]'
              )}
            >
              <div className="p-8 lg:pt-12 xl:p-10 xl:pt-14">
                <h3 className="text-sm font-semibold text-white">{product.name}</h3>

                {product.sale && (
                  <div className="mb-3 inline-block rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">
                    SALE
                  </div>
                )}

                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-40 object-contain rounded-lg mb-4"
                />
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-3xl font-semibold text-white">{product.price}</p>
                  {product.sale && (
                    <p className="text-lg font-medium text-red-400 line-through">
                      {product.compareAt}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className={classNames(
                      product.featured
                        ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40'
                        : 'bg-black/30 hover:bg-black/40 border border-white/10 shadow-md',
                      'btn-plain w-1/2 rounded-md px-3 py-2 text-sm font-semibold text-white'
                    )}
                  >
                    Add to Cart
                  </button>

                  <a
                    href={product.href}
                    className="btn-plain w-1/2 rounded-md px-3 py-2 text-sm font-semibold text-center bg-white/10 hover:bg-white/20 text-white border border-white/10"
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
