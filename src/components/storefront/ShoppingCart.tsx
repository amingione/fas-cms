'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { CartProvider, useCart } from '@/components/cart/cart-context';
import type { CartItem } from '@/components/cart/actions';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';
import Price, { formatPrice } from '@/components/storefront/Price';
import { formatOptionSummary } from '@/lib/cart/format-option-summary';

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

type AddOnEntry = { label: string; price?: number };

const CLEAN_PREFIX_REGEX = /^(type|option|upgrade|add[-\s]?on)\s*\d*\s*:?/i;

function cleanLabel(label?: string | null) {
  if (!label) return '';
  return label.replace(CLEAN_PREFIX_REGEX, '').trim();
}

function extractAddOns(item: CartItem): AddOnEntry[] {
  const addOns: AddOnEntry[] = [];
  const push = (label?: string | null, price?: number | null) => {
    const cleaned = cleanLabel(label);
    if (!cleaned) return;
    const normalized = cleaned.toLowerCase();
    const normalizedPrice =
      typeof price === 'number' && Number.isFinite(price) ? price : undefined;
    const existing = addOns.find((entry) => entry.label.toLowerCase() === normalized);

    // Merge duplicate add-ons (e.g., when upgrades also show up in options) while keeping any price.
    if (existing) {
      if (existing.price == null && normalizedPrice !== undefined) existing.price = normalizedPrice;
      return;
    }

    addOns.push({
      label: cleaned,
      price: normalizedPrice
    });
  };

  const readEntry = (entry: any) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      push(entry, undefined);
      return;
    }
    if (typeof entry === 'object') {
      const label = (entry as any).label ?? (entry as any).value ?? (entry as any).name;
      const price =
        typeof (entry as any).priceDelta === 'number'
          ? (entry as any).priceDelta
          : typeof (entry as any).delta === 'number'
            ? (entry as any).delta
            : (entry as any).price;
      push(label, typeof price === 'number' && Number.isFinite(price) ? price : undefined);
      return;
    }
  };

  const upgradeSource = item.upgrades ?? item.selectedUpgrades;
  if (Array.isArray(upgradeSource)) {
    upgradeSource.forEach((entry) => readEntry(entry));
  } else if (upgradeSource && typeof upgradeSource === 'object') {
    Object.values(upgradeSource).forEach((entry) => readEntry(entry));
  }

  Object.entries(item.options || {}).forEach(([key, value]) => {
    if (!/upgrade|add[-\s]?on/i.test(key)) return;
    const price = typeof value === 'object' ? (value as any).price : undefined;
    push(String(value), typeof price === 'number' && Number.isFinite(price) ? price : undefined);
  });

  return addOns;
}

function calculateAddOnTotal(addOns: AddOnEntry[]): number {
  return addOns.reduce((total, entry) => total + (entry.price ?? 0), 0);
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
  const formattedOriginalSubtotal = formatPrice(originalSubtotal || subtotal || 0);
  const formattedDiscount = formatPrice(discountTotal);

  return (
    <div className="bg-dark text-white">
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
              Add products from the storefront to see them here.
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
              {hasDiscounts && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                  <span className="uppercase tracking-wide">Discounts</span>
                  <span className="font-semibold">-{formattedDiscount}</span>
                </div>
              )}
              <ul className="divide-y divide-white/10">
                {items.map((item) => {
                  const addOnEntries = extractAddOns(item);
                  const addOnTotal = calculateAddOnTotal(addOnEntries);
                  const quantityValue = Math.max(1, toNumber(item.quantity, 1));
                  const baseUnitPrice = Math.max(0, toNumber(item.price, 0));
                  const baseComparePrice = toNumber(item.originalPrice, baseUnitPrice);
                  const baseFromCart = toNumber((item as any).basePrice, Number.NaN);
                  const hasExplicitExtras =
                    typeof item.extra === 'number' || Number.isFinite(baseFromCart);
                  const unitPriceWithExtras = hasExplicitExtras
                    ? baseUnitPrice
                    : baseUnitPrice + addOnTotal;
                  const compareWithExtras = hasExplicitExtras
                    ? baseComparePrice
                    : baseComparePrice + addOnTotal;
                  const pricing = perItemPricing[item.id] || {
                    unitPrice: unitPriceWithExtras,
                    comparePrice:
                      compareWithExtras > unitPriceWithExtras ? compareWithExtras : null,
                    onSale: compareWithExtras > unitPriceWithExtras || Boolean(item.isOnSale),
                    quantity: quantityValue,
                    savings:
                      compareWithExtras > unitPriceWithExtras
                        ? compareWithExtras - unitPriceWithExtras
                        : 0,
                    lineCurrent: unitPriceWithExtras * quantityValue,
                    lineOriginal:
                      (compareWithExtras > unitPriceWithExtras
                        ? compareWithExtras
                        : unitPriceWithExtras) * quantityValue,
                    saleLabel: item.saleLabel || undefined
                  };
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
                    upgrades: item.upgrades
                  });
                  const displayTitle = `(${pricing.quantity}) ${item.name || 'Product'}`;
                  const unitPrice = pricing.unitPrice;
                  const comparePrice = pricing.comparePrice;
                  const onSale = pricing.onSale;
                  const savings = pricing.savings;
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            {productHref ? (
                              <a
                                href={productHref}
                                className="text-base font-semibold text-white transition hover:text-primary"
                              >
                                {displayTitle}
                              </a>
                            ) : (
                              <h3 className="text-base font-semibold text-white">{displayTitle}</h3>
                            )}
                            {optionSummary && (
                              <p className="text-sm text-white/70">{optionSummary}</p>
                            )}
                            <Price
                              amount={unitPrice}
                              originalAmount={onSale ? (comparePrice ?? undefined) : undefined}
                              onSale={onSale}
                              className="text-base font-semibold text-white"
                            />
                            {onSale && (
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-200">
                                  {pricing.saleLabel || item.saleLabel || 'Sale'}
                                </span>
                                {savings > 0 && (
                                  <span className="text-xs text-emerald-200">
                                    You save {formatPrice(savings)}
                                  </span>
                                )}
                              </div>
                            )}
                            {isInstallOnly && (
                              <p className="inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-wide text-amber-200">
                                Install-Only Service
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <select
                              id={`quantity-${item.id}`}
                              value={item.quantity || 1}
                              onChange={(event) => onQuantityChange(item.id, event.target.value)}
                              className="rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm text-white/80 focus:outline-none"
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
                            <div className="flex w-10 shrink-0 items-center justify-center">
                              <form
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  onRemove(item.id);
                                }}
                              >
                                <button
                                  type="submit"
                                  aria-label="Remove item"
                                  className="shrink-0 text-white/60 transition hover:text-red-400"
                                >
                                  <XMarkIcon aria-hidden="true" className="size-5" />
                                </button>
                              </form>
                            </div>
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
              <h2 className="text-lg font-semibold text-white">Order Summary</h2>
              <dl className="space-y-3 text-sm text-white/80">
                {hasDiscounts && (
                  <div className="flex items-center justify-between text-emerald-200">
                    <dt className="flex items-center gap-2">
                      <span className="uppercase tracking-wide">Discounts</span>
                      {saleLabel && (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
                          {saleLabel}
                        </span>
                      )}
                    </dt>
                    <dd className="font-semibold">-{formattedDiscount}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <dt className="flex flex-col gap-1">
                    <span className="text-white">Subtotal</span>
                    {hasDiscounts && (
                      <span className="text-xs text-white/50 line-through">
                        {formattedOriginalSubtotal}
                      </span>
                    )}
                  </dt>
                  <dd className="font-semibold text-white">{formattedSubtotal}</dd>
                </div>
                {!hasDiscounts && hasSaleItems && (
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide">
                      {saleLabel || 'Discount'}
                    </span>
                    <span className="text-right text-white/70">Sale price applied</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <dt className="flex items-center gap-2 text-white">
                    Shipping
                    <span className="group relative inline-flex">
                      <button
                        type="button"
                        aria-label="Calculated at checkout"
                        className="shrink-0 text-white/50 transition hover:text-white"
                      >
                        <QuestionMarkCircleIcon aria-hidden="true" className="size-4" />
                      </button>
                      <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-1 hidden w-max -translate-x-1/2 rounded-md border border-white/20 bg-dark/90 px-3 py-2 text-xs text-white shadow-lg transition group-hover:block group-focus-within:block">
                        Shipping costs are calculated according to your delivery address.
                      </span>
                    </span>
                  </dt>
                  <dd className="text-white/60">Calculated at checkout</dd>
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
                      <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-1 hidden w-max -translate-x-1/2 rounded-md border border-white/20 bg-dark/90 px-3 py-2 text-xs text-white shadow-lg transition group-hover:block group-focus-within:block">
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
                disabled={checkingOut}
                className="btn-plain w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {checkingOut ? 'Connecting…' : 'Continue to Checkout'}
              </button>
              {checkoutError && (
                <p className="mt-2 text-xs text-red-400">{checkoutError}</p>
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
