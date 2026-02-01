'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { CartProvider, useCart } from '@/components/cart/cart-context';
import type { CartItem } from '@/components/cart/actions';
import { CheckIcon, ClockIcon, XMarkIcon } from '@heroicons/react/20/solid';
import Price, { formatPrice } from '@/components/storefront/Price';
import { formatOptionSummary } from '@/lib/cart/format-option-summary';
import { calculateAddOnTotal, extractAddOns } from '@/lib/cart/extract-add-ons';

const FALLBACK_IMAGE = '/logo/faslogo150.webp';
const QUANTITY_CHOICES = Array.from({ length: 10 }, (_, i) => i + 1);

function toNumber(value: unknown, fallback = 0): number {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function extractDiscountPercent(label?: string | null): number | null {
  if (!label || typeof label !== 'string') return null;
  const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function CartContents() {
  const { cart, subtotal, setItemQuantity, removeCartItem, clearCart, redirectToCheckout } =
    useCart();
  const [clearing, setClearing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const hasItems = items.length > 0;

  const { perItemPricing, discountTotal, originalSubtotal, saleLabel, hasSaleItems } =
    useMemo(() => {
      const pricingById: Record<
        string,
        {
          unitPrice: number;
          comparePrice: number | null;
          onSale: boolean;
          quantity: number;
          savings: number;
          lineOriginal: number;
          lineCurrent: number;
          saleLabel?: string;
        }
      > = {};

      let discount = 0;
      let original = 0;
      let firstSaleLabel: string | null = null;
      let hasSale = false;

      items.forEach((item) => {
        const qty = Math.max(1, toNumber(item.quantity, 1));
        const addOns = extractAddOns(item);
        const addOnTotal = calculateAddOnTotal(addOns);
        const baseUnitPrice = Math.max(0, toNumber(item.price, 0));
        const baseComparePrice = toNumber(item.originalPrice, baseUnitPrice);
        const baseFromCart = toNumber((item as any).basePrice, Number.NaN);
        const hasExplicitExtras = typeof item.extra === 'number' || Number.isFinite(baseFromCart);
        const unitPrice = hasExplicitExtras ? baseUnitPrice : baseUnitPrice + addOnTotal;
        const compareCandidate = hasExplicitExtras
          ? baseComparePrice
          : baseComparePrice + addOnTotal;
        const percentFromLabel = extractDiscountPercent(item.saleLabel);
        const derivedCompare =
          percentFromLabel && unitPrice > 0 ? unitPrice / (1 - percentFromLabel / 100) : null;
        const bestCompare = Math.max(compareCandidate, derivedCompare ?? 0);
        const hasCompareDiff = bestCompare > unitPrice;
        const onSale = hasCompareDiff || Boolean(item.isOnSale) || Boolean(percentFromLabel);
        const comparePrice = hasCompareDiff ? bestCompare : null;
        const lineCurrent = unitPrice * qty;
        const lineOriginal = comparePrice ? comparePrice * qty : lineCurrent;
        const savings = lineOriginal > lineCurrent ? lineOriginal - lineCurrent : 0;

        discount += savings;
        original += lineOriginal;
        if (!firstSaleLabel && (item.saleLabel || item.isOnSale))
          firstSaleLabel = item.saleLabel || null;
        if (onSale) hasSale = true;

        pricingById[item.id] = {
          unitPrice,
          comparePrice,
          onSale,
          quantity: qty,
          savings,
          lineOriginal,
          lineCurrent,
          saleLabel: item.saleLabel || undefined
        };
      });

      return {
        perItemPricing: pricingById,
        discountTotal: discount,
        originalSubtotal: original,
        saleLabel: firstSaleLabel,
        hasSaleItems: hasSale
      };
    }, [items]);

  const hasDiscounts = discountTotal > 0;

  const installOnlyItems = useMemo(
    () =>
      items.filter((item) => {
        const normalizedClass = (item.shippingClass || '')
          .toString()
          .toLowerCase()
          .replace(/[^a-z]/g, '');
        return item.installOnly || normalizedClass.includes('installonly');
      }),
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

  const handleCheckout = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const result = await redirectToCheckout();
      if (typeof result === 'string' && result) {
        setCheckoutError(result);
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const formattedSubtotal = formatPrice(subtotal || 0);

  return (
    <div className="bg-dark text-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
        <h1 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Shopping Cart
        </h1>

        {!hasItems ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-semibold text-white">Your cart is empty.</p>
            <p className="mt-2 max-w-md mx-auto text-sm text-white/70">
              Add products from the storefront to see them here.
            </p>
            <a
              href="/shop"
              className="mt-8 inline-block bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary-hover rounded-md"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <form className="mt-12">
            {hasDiscounts && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-700">
                <span className="uppercase tracking-wide font-semibold">Discounts Applied</span>
                <span className="font-semibold">-{formatPrice(discountTotal)}</span>
              </div>
            )}

            <section aria-labelledby="cart-heading">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>

              <ul
                role="list"
                className="divide-y divide-white/10 border-t border-b border-white/10"
              >
                {items.map((item) => {
                  const addOnEntries = extractAddOns(item);
                  const pricing = perItemPricing[item.id];
                  const normalizedClass = (item.shippingClass || '')
                    .toString()
                    .toLowerCase()
                    .replace(/[^a-z]/g, '');
                  const isInstallOnly = item.installOnly || normalizedClass.includes('installonly');
                const optionSummary = formatOptionSummary({
                  options: item.options as Record<string, unknown>,
                  selections: (item as any).selections,
                  selectedOptions: item.selectedOptions,
                  selectedUpgrades: item.selectedUpgrades,
                  upgrades: item.upgrades,
                  includeUpgrades: false,
                  includeUpgradeKeys: false
                });

                  return (
                    <li key={item.id} className="flex py-6">
                      <div className="shrink-0">
                        <img
                          alt={item.name || 'Cart item'}
                          src={item.image || FALLBACK_IMAGE}
                          className="size-24 rounded-md object-cover sm:size-32"
                        />
                      </div>

                      <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                        <div>
                          <div className="flex justify-between">
                            <h4 className="text-sm">
                              <a
                                href={
                                  item.productUrl
                                    ? item.productUrl.startsWith('/')
                                      ? item.productUrl
                                      : `/shop/${item.productUrl}`
                                    : '#'
                                }
                                className="font-medium text-white hover:text-primary"
                              >
                                {item.name || 'Product'}
                              </a>
                            </h4>
                            <Price
                              amount={pricing?.unitPrice ?? 0}
                              originalAmount={
                                pricing?.onSale ? (pricing.comparePrice ?? undefined) : undefined
                              }
                              onSale={pricing?.onSale}
                              className="ml-4 text-sm font-medium text-white"
                            />
                          </div>
                          {optionSummary && <p className="mt-1 text-sm text-white/70">{optionSummary}</p>}
                          {addOnEntries.length > 0 && (
                            <ul className="mt-1 text-sm text-white/70">
                              {addOnEntries.map((addon, idx) => (
                                <li key={idx}>
                                  + {addon.label}
                                  {addon.price !== undefined && ` (+${formatPrice(addon.price)})`}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="mt-4 flex flex-1 items-end justify-between">
                          <div className="flex flex-col gap-2">
                            {pricing?.onSale && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">
                                  {pricing.saleLabel || 'Sale'}
                                </span>
                                {pricing.savings > 0 && (
                                  <span className="text-xs text-emerald-600">
                                    You save {formatPrice(pricing.savings)}
                                  </span>
                                )}
                              </div>
                            )}
                            {isInstallOnly && (
                              <p className="inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-wide text-amber-200 bg-amber-500/10 border border-amber-500/40">
                                Install-Only Service
                              </p>
                            )}
                            <p className="flex items-center space-x-2 text-sm text-white/80">
                              <CheckIcon aria-hidden="true" className="size-5 shrink-0 text-green-400" />
                              <span>In stock</span>
                            </p>
                          </div>
                          <div className="ml-4 flex items-center gap-3">
                            <label htmlFor={`quantity-${item.id}`} className="sr-only">
                              Quantity
                            </label>
                            <select
                              id={`quantity-${item.id}`}
                              value={item.quantity || 1}
                              onChange={(event) => onQuantityChange(item.id, event.target.value)}
                              className="rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                              {(QUANTITY_CHOICES.includes(item.quantity || 1)
                                ? QUANTITY_CHOICES
                                : [...QUANTITY_CHOICES, item.quantity || QUANTITY_CHOICES[0]]
                              ).map((qty) => (
                                <option key={qty} value={qty}>
                                  Qty {qty}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => onRemove(item.id)}
                              className="text-sm font-medium text-primary hover:text-primary-hover"
                            >
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {installOnlyItems.length > 0 && (
              <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                Install-only services are scheduled directly with our team. You will not be charged
                for shipping on these items.
              </div>
            )}

            {/* Order summary */}
            <section aria-labelledby="summary-heading" className="mt-10">
              <h2 id="summary-heading" className="sr-only">
                Order summary
              </h2>

              <div>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-base font-medium text-white">Subtotal</dt>
                    <dd className="ml-4 text-base font-medium text-white">
                      {formattedSubtotal}
                    </dd>
                  </div>
                </dl>
                <p className="mt-1 text-sm text-white/70">
                  Shipping and taxes will be calculated at checkout.
                </p>
              </div>

              <div className="mt-10">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full rounded-full bg-primary px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-hover focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingOut ? 'Connecting...' : 'Checkout'}
                </button>
                {checkoutError && (
                  <p className="mt-2 text-xs text-red-400 text-center">{checkoutError}</p>
                )}
              </div>

              <div className="mt-6 text-center text-sm">
                <p>
                  or{' '}
                  <a href="/shop" className="font-medium text-primary hover:text-primary-hover">
                    Continue Shopping
                    <span aria-hidden="true"> &rarr;</span>
                  </a>
                </p>
              </div>
            </section>
          </form>
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
