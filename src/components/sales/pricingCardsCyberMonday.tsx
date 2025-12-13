'use client';

import { CheckIcon } from '@heroicons/react/20/solid';
import { addItem } from '@lib/cart';
import { emitAddToCartSuccess } from '@/lib/add-to-cart-toast';
import { prefersDesktopCart } from '@/lib/device';

const products = [
  {
    id: 'prod1',
    name: 'Billet Hellcat Supercharger Lid',
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
    name: 'Predator Pulley',
    price: '$809.99',
    sale: true,
    compareAt: '$899.99',
    image: '/images/pulleys/FASpredator-lower-pulley.webp',
    highlights: ['Billet F.A.S. Pulley', 'Patent pending design', ' complete kit'],
    featured: true,
    href: '/shop/fas-predator-lower-pulley-no-tune-required'
  },
  {
    id: 'prod3',
    name: '6.7L Powerstroke piping kits',
    price: '$1899.99',
    sale: true,
    compareAt: '$1999.99',
    image: '/images/fabrication/6.7LpowerstrokePipingKit.webp',
    highlights: ['TIG-Welded Stainless Steel', 'Optimized Airflow', 'Direct Bolt-On Fit'],
    featured: false,
    href: '/shop/2020-6-7l-powerstroke-piping-kit'
  }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function parsePrice(value: string | number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
}

export default function PricingCards() {
  const handleAddToCart = (product: (typeof products)[number]) => {
    const name = product.name || 'Cyber Monday deal';
    const id = product.id || product.href || name.toLowerCase().replace(/\s+/g, '-');
    const price = parsePrice(product.price);

    try {
      addItem({
        id,
        name,
        price,
        quantity: 1,
        image: product.image,
        productUrl: product.href
      });
      emitAddToCartSuccess({ name });
      if (typeof window !== 'undefined') {
        try {
          if (!prefersDesktopCart()) window.dispatchEvent(new Event('open-cart'));
        } catch {
          window.dispatchEvent(new Event('open-cart'));
        }
      }
    } catch (error) {
      console.error('Failed to add doorbuster to cart', error);
    }
  };

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
                        ? 'btn-plain bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40'
                        : 'btn-plain bg-dark/60 hover:bg-primary/10 border border-white/10 shadow-md',
                      'btn-plain w-1/2 rounded-md px-3 py-2 text-sm font-semibold text-white transition-colors'
                    )}
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to Cart
                  </button>

                  <a
                    href={product.href}
                    className="btn-plain w-1/2 rounded-md px-3 py-2 text-sm font-semibold text-center hover:bg-white/20 text-white border border-white/10"
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
