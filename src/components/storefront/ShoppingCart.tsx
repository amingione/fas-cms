'use client';

import { useMemo, useState } from 'react';
import { CartProvider, useCart } from '@/components/cart/cart-context';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';
import Price, { formatPrice } from '@/components/storefront/Price';
import { prefersDesktopCart } from '@/lib/device';
import {
  ShippingEstimator,
  loadStoredShipping,
  type ShippingFormState
} from '@/components/cart/ShippingEstimator';

type CartOptionMap = Record<string, string | number | boolean | null | undefined>;

const FALLBACK_IMAGE = '/logo/faslogo150.png';
const QUANTITY_CHOICES = Array.from({ length: 10 }, (_, i) => i + 1);

function normalizeOptionLabel(rawKey: string) {
  return rawKey
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) =>
      segment.length > 1
        ? segment[0].toUpperCase() + segment.slice(1).toLowerCase()
        : segment.toUpperCase()
    )
    .join(' ');
}

function normalizeOptionValue(rawValue: string | number | boolean | null | undefined) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === 'boolean') return rawValue ? 'Selected' : 'None';
  const stringy = String(rawValue).trim();
  if (!stringy) return null;
  const lower = stringy.toLowerCase();
  if (lower === 'true' || lower === 'on') return 'Selected';
  if (lower === 'false' || lower === 'off') return 'None';
  return stringy;
}

function listOptions(options?: CartOptionMap) {
  if (!options) return null;
  const entries = Object.entries(options)
    .map(([key, value]) => {
      const normalized = normalizeOptionValue(value);
      if (!normalized) return null;
      return `${normalizeOptionLabel(key)}: ${normalized}`;
    })
    .filter(Boolean) as string[];
  if (!entries.length) return null;
  return entries.join(' | ');
}

function CartContents() {
  const { cart, subtotal, setItemQuantity, removeCartItem, clearCart } = useCart();
  const [clearing, setClearing] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [shippingForm, setShippingForm] = useState<ShippingFormState>(() => loadStoredShipping());

  const items = cart?.items ?? [];
  const hasItems = items.length > 0;

  const isInstallOnlyItem = (item: any): boolean => {
    if (!item) return false;
    if (item.installOnly === true) return true;
    if (item.installOnly === false) return false;
    const normalized = (item.shippingClass || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    return normalized === 'installonly';
  };

  const installOnlyItems = useMemo(
    () => items.filter((item) => isInstallOnlyItem(item)),
    [items]
  );

  const onQuantityChange = (id: string, value: string) => {
    const qty = Number(value);
    if (!Number.isFinite(qty) || qty < 1) return;
    void setItemQuantity(id, qty);
  };

  const onRemove = (id: string) => {
    void removeCartItem(id);
  };

  const onClearCart = async () => {
    try {
      setClearing(true);
      await clearCart();
    } finally {
      setClearing(false);
    }
  };

  const handleCheckout = () => {
    setShowShipping(true);
  };

  const formattedSubtotal = formatPrice(subtotal || 0);

  return (
    <div className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="font-ethno text-3xl italic tracking-tight sm:text-4xl">Shopping Cart</h1>
          {hasItems && (
            <button
              type="button"
              disabled={clearing}
              onClick={onClearCart}
              className="self-start rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-wide text-white hover:border-primary disabled:opacity-60 lg:self-center"
            >
              Clear Cart
            </button>
          )}
        </div>

        {!hasItems ? (
          <div className="mt-16 flex flex-col items-center rounded-3xl border border-white/10 p-12 text-center">
            <p className="text-lg font-semibold">Your cart is empty.</p>
            <p className="mt-2 max-w-md text-sm text-white/70">
              Add products from the storefront to see them here. When you’re ready, we’ll collect
              shipping details and redirect you to secure checkout.
            </p>
            <a
              href="/shop"
              className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <section
              aria-labelledby="cart-items-heading"
              className="rounded-3xl border border-white/10 p-4 sm:p-6"
            >
              <h2 id="cart-items-heading" className="sr-only">
                Items in your cart
              </h2>
              <ul className="divide-y divide-white/10">
                {items.map((item) => {
                  const optionsSummary = listOptions(item.options);
                  const isInstallOnly = isInstallOnlyItem(item);
                  const productHref = (() => {
                    const raw = item.productUrl;
                    if (!raw) return undefined;
                    if (raw.startsWith('http')) return raw;
                    if (raw.startsWith('/')) return raw;
                    return `/shop/${raw}`;
                  })();
                  return (
                    <li key={item.id} className="flex flex-col gap-4 py-6 sm:flex-row sm:gap-6">
                      <div className="size-24 rounded-md object-cover">
                        {productHref ? (
                          <a href={productHref} className="block">
                            <img
                              src={item.image || FALLBACK_IMAGE}
                              alt={item.name || 'Cart item'}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <img
                            src={item.image || FALLBACK_IMAGE}
                            alt={item.name || 'Cart item'}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            {productHref ? (
                              <a
                                href={productHref}
                                className="text-base font-semibold text-white transition hover:text-primary"
                              >
                                {item.name || 'Product'}
                              </a>
                            ) : (
                              <h3 className="text-base font-semibold text-white">
                                {item.name || 'Product'}
                              </h3>
                            )}
                            {optionsSummary && (
                              <p className="text-sm text-white/70">{optionsSummary}</p>
                            )}
                            <Price
                              amount={item.price}
                              className="text-base font-semibold text-white"
                            />
                            {isInstallOnly && (
                              <p className="inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-wide text-amber-200">
                                Install-Only Service
                              </p>
                            )}
                          </div>

                          <div className="flex items-start gap-3">
                            <select
                              id={`quantity-${item.id}`}
                              value={item.quantity || 1}
                              onChange={(event) => onQuantityChange(item.id, event.target.value)}
                              className="rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:outline-none"
                            >
                              {(QUANTITY_CHOICES.includes(item.quantity || 1)
                                ? QUANTITY_CHOICES
                                : [...QUANTITY_CHOICES, item.quantity || QUANTITY_CHOICES[0]]
                              ).map((qty) => (
                                <option key={qty} value={qty}>
                                  {qty}
                                </option>
                              ))}
                            </select>
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                onRemove(item.id);
                              }}
                            >
                              <button
                                type="submit"
                                aria-label="Remove item"
                                className="text-white/60 transition hover:text-red-400"
                              >
                                <XMarkIcon aria-hidden="true" className="size-5" />
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {installOnlyItems.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Install-only services are scheduled directly with our team. You will not be
                  charged for shipping on these items.
                </div>
              )}
            </section>

            <aside className="space-y-6 self-start rounded-3xl border border-white/10 bg-white/5 p-6 lg:w-[360px] lg:justify-self-end">
              {showShipping ? (
                <ShippingEstimator
                  cart={cart}
                  subtotal={subtotal}
                  form={shippingForm}
                  setForm={setShippingForm}
                  showBackButton
                  onBack={() => setShowShipping(false)}
                  variant="embedded"
                />
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-white">Order Summary</h2>
                  <dl className="space-y-3 text-sm text-white/80">
                    <div className="flex items-center justify-between">
                      <dt>Subtotal</dt>
                      <dd className="font-semibold text-white">{formattedSubtotal}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="flex items-center gap-2 text-white">
                        Shipping
                        <span className="group relative inline-flex">
                          <button
                            type="button"
                            aria-label="Shipping is calculated after you enter your address"
                            className="shrink-0 text-white/50 transition hover:text-white"
                          >
                            <QuestionMarkCircleIcon aria-hidden="true" className="size-4" />
                          </button>
                          <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-1 hidden w-max -translate-x-1/2 rounded-md border border-white/20 bg-black/90 px-3 py-2 text-xs text-white shadow-lg transition group-hover:block group-focus-within:block">
                            Shipping is calculated after you provide your address.
                          </span>
                        </span>
                      </dt>
                      <dd className="text-white/60">Calculated after address</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="flex items-center gap-2 text-white">
                        Taxes
                        <span className="group relative inline-flex">
                          <button
                            type="button"
                            aria-label="Taxes are calculated at checkout"
                            className="shrink-0 text-white/50 transition hover:text-white"
                          >
                            <QuestionMarkCircleIcon aria-hidden="true" className="size-4" />
                          </button>
                          <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-1 hidden w-max -translate-x-1/2 rounded-md border border-white/20 bg-black/90 px-3 py-2 text-xs text-white shadow-lg transition group-hover:block group-focus-within:block">
                            Taxes are finalized during checkout based on your delivery details.
                          </span>
                        </span>
                      </dt>
                      <dd className="text-white/60">Calculated at checkout</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90"
                  >
                    Enter Shipping & Checkout
                  </button>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShoppingCartDisplay() {
  return (
    <CartProvider>
      <CartContents />
    </CartProvider>
  );
}
