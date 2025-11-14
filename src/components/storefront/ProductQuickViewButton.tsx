'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { EyeIcon, ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { addItem } from '@components/cart/actions';
import { prefersDesktopCart } from '@/lib/device';

const sanitizeAnalyticsPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

export type QuickViewProduct = {
  id?: string;
  title: string;
  href: string;
  price?: number;
  imageSrc: string;
  imageAlt?: string;
  description?: string;
};

export default function ProductQuickViewButton({
  product,
  className = ''
}: {
  product: QuickViewProduct;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const portalNode = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.createElement('div');
  }, []);

  useEffect(() => {
    if (!portalNode) return;
    document.body.appendChild(portalNode);
    return () => {
      document.body.removeChild(portalNode);
    };
  }, [portalNode]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const priceLabel =
    typeof product.price === 'number'
      ? `$${product.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`
      : undefined;

  const descriptionRaw =
    typeof product.description === 'string' ? product.description.trim() : undefined;
  const description = descriptionRaw
    ? descriptionRaw.length > 320
      ? `${descriptionRaw.slice(0, 320)}…`
      : descriptionRaw
    : undefined;

  const analyticsBase = useMemo(
    () =>
      sanitizeAnalyticsPayload({
        product_id: typeof product.id === 'string' ? product.id : undefined,
        product_name: product.title,
        product_href: product.href,
        price: typeof product.price === 'number' ? product.price : undefined
      }),
    [product.id, product.title, product.href, product.price]
  );
  const openAnalyticsParams = JSON.stringify({ ...analyticsBase, interaction: 'quick_view_open' });
  const viewAnalyticsParams = JSON.stringify({ ...analyticsBase, interaction: 'quick_view_view_product' });
  const addAnalyticsParams = JSON.stringify({ ...analyticsBase, interaction: 'quick_view_add_to_cart' });

  const [adding, setAdding] = useState(false);
  const canAddToCart = Boolean(product.id);

  async function handleAddToCart() {
    if (!product.id || adding) return;
    try {
      setAdding(true);
      await addItem(null as any, {
        id: product.id,
        name: product.title,
        price: product.price,
        image: product.imageSrc,
        quantity: 1,
        productUrl: product.href
      });

      const eventName = prefersDesktopCart() ? 'open-desktop-cart' : 'open-cart';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(eventName));
      }
    } catch (error) {
      console.error('Failed to add item from quick view:', error);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80 transition hover:border-white hover:text-white ${className}`.trim()}
        data-analytics-event="quick_view_open"
        data-analytics-category="engagement"
        data-analytics-label={product.title}
        data-analytics-params={openAnalyticsParams}
      >
        <EyeIcon className="h-4 w-4" aria-hidden="true" />
        Quick View
      </button>

      {portalNode && open
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
              <div
                className="absolute inset-0 bg-black/70"
                aria-hidden="true"
                onClick={() => setOpen(false)}
              />

              <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 text-white shadow-2xl">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 text-white/60 transition hover:text-white"
                >
                  <span className="sr-only">Close quick view</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>

                <div className="grid gap-6 p-6 sm:grid-cols-2 sm:gap-8 sm:p-8">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3">
                    <img
                      src={product.imageSrc}
                      alt={product.imageAlt || product.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex flex-col gap-4 text-left">
                    <div>
                      <h2 className="text-2xl font-bold sm:text-3xl">{product.title}</h2>
                      {priceLabel && (
                        <p className="mt-2 text-xl font-semibold text-white/90">{priceLabel}</p>
                      )}
                    </div>

                    {description && (
                      <p className="text-sm leading-relaxed text-white/70">{description}</p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-3 sm:flex-nowrap">
                      <a
                        href={product.href}
                        className="inline-flex min-w-[140px] items-center justify-center rounded-full border border-primary bg-primary px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-black drop-shadow-[0_0_20px_rgba(255,0,0,0.3)] transition hover:bg-primary/90 hover:drop-shadow-[0_0_26px_rgba(255,0,0,0.4)]"
                        data-analytics-event="quick_view_view_product"
                        data-analytics-category="ecommerce"
                        data-analytics-label={product.title}
                        data-analytics-params={viewAnalyticsParams}
                      >
                        <span className="whitespace-nowrap leading-none">View Product</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!canAddToCart || adding}
                        className="inline-flex min-w-[150px] items-center gap-2 rounded-full border border-white/25 bg-gradient-to-br from-black/70 to-black/40 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white shadow-[0_0_18px_rgba(255,0,0,0.12)] transition enabled:hover:border-primary enabled:hover:from-black/80 enabled:hover:to-black/60 enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        data-analytics-event="quick_view_add_to_cart"
                        data-analytics-category="ecommerce"
                        data-analytics-label={product.title}
                        data-analytics-params={addAnalyticsParams}
                      >
                        <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="whitespace-nowrap leading-none">
                          {adding ? 'Adding…' : 'Add to Cart'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            portalNode
          )
        : null}
    </>
  );
}
