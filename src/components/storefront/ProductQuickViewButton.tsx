'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { EyeIcon, ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PortableText, type PortableTextComponents } from '@portabletext/react';
import clsx from 'clsx';
import { addItem } from '@components/cart/actions';
import { prefersDesktopCart } from '@/lib/device';
import { emitAddToCartSuccess } from '@/lib/add-to-cart-toast';
import type { QuickViewOptionGroup, QuickViewOptionValue } from '@/lib/quick-view-options';
import { portableTextToPlainText } from '@/lib/portableText';
import { resolveProductCartMeta } from '@/lib/product-flags';
import {
  formatPrice,
  getActivePrice,
  getCompareAtPrice,
  getSaleBadgeText,
  isOnSale
} from '@/lib/saleHelpers';

const sanitizeAnalyticsPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );

export type QuickViewProduct = {
  id?: string;
  title: string;
  href: string;
  price?: number;
  imageSrc: string;
  imageAlt?: string;
  description?: string;
  shortDescriptionPortable?: unknown;
  optionGroups?: QuickViewOptionGroup[];
  shippingClass?: string | null;
  filters?: unknown;
  installOnly?: unknown;
};

const portableComponents: Partial<PortableTextComponents> = {
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic text-white/90">{children}</em>
  },
  list: {
    bullet: ({ children }) => (
      <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-white/75">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="ml-5 list-decimal space-y-1 text-sm leading-relaxed text-white/75">
        {children}
      </ol>
    )
  },
  block: {
    normal: ({ children }) => <p className="text-sm leading-relaxed text-white/80">{children}</p>
  }
};

const normalizePortableBlocks = (value: unknown): any[] | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const filtered = value.filter(
      (block) => block && typeof block === 'object' && !Array.isArray(block)
    );
    return filtered.length ? filtered : null;
  }
  if (typeof value === 'object') {
    return [value];
  }
  return null;
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

  const activePrice = getActivePrice(product as any);
  const comparePrice = getCompareAtPrice(product as any);
  const formattedPrice = typeof activePrice === 'number' ? formatPrice(activePrice) : undefined;
  const formattedCompare = typeof comparePrice === 'number' ? formatPrice(comparePrice) : undefined;
  const onSale = isOnSale(product as any);
  const saleBadge = getSaleBadgeText(product as any);

  const portableDescription = useMemo(() => {
    return normalizePortableBlocks(product.shortDescriptionPortable);
  }, [product.shortDescriptionPortable]);

  const fallbackDescription = useMemo(() => {
    if (portableDescription) return undefined;
    const plain =
      (typeof product.description === 'string' && product.description.trim()) ||
      portableTextToPlainText(product.description) ||
      portableTextToPlainText(product.shortDescriptionPortable);
    const trimmed = typeof plain === 'string' ? plain.trim() : '';
    if (!trimmed) return undefined;
    return trimmed.length > 320 ? `${trimmed.slice(0, 320)}…` : trimmed;
  }, [portableDescription, product.description, product.shortDescriptionPortable]);

  const optionGroups = useMemo(() => {
    return Array.isArray(product.optionGroups)
      ? product.optionGroups.filter((group) => Array.isArray(group?.values) && group.values.length)
      : [];
  }, [product.optionGroups]);

  const cartMeta = useMemo(() => resolveProductCartMeta(product), [product]);

  const analyticsBase = useMemo(
    () =>
      sanitizeAnalyticsPayload({
        product_id: typeof product.id === 'string' ? product.id : undefined,
        product_name: product.title,
        product_href: product.href,
        price: typeof activePrice === 'number' ? activePrice : undefined
      }),
    [activePrice, product.id, product.title, product.href]
  );
  const openAnalyticsParams = JSON.stringify({ ...analyticsBase, interaction: 'quick_view_open' });
  const viewAnalyticsParams = JSON.stringify({
    ...analyticsBase,
    interaction: 'quick_view_view_product'
  });
  const addAnalyticsParams = JSON.stringify({
    ...analyticsBase,
    interaction: 'quick_view_add_to_cart'
  });

  const [adding, setAdding] = useState(false);
  const canAddToCart = Boolean(product.id);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, QuickViewOptionValue>>({});

  useEffect(() => {
    if (!open) return;
    setSelectedOptions(() => {
      const initial: Record<string, QuickViewOptionValue> = {};
      optionGroups.forEach((group) => {
        const defaultValue = group.values.find((value) => value.defaultSelected);
        if (defaultValue) {
          initial[group.key] = defaultValue;
        }
      });
      return initial;
    });
  }, [open, optionGroups]);

  const selectionEntries = useMemo(
    () =>
      optionGroups
        .map((group) => {
          const selected = selectedOptions[group.key];
          if (!selected) return null;
          return {
            groupKey: group.key,
            groupTitle: group.title,
            label: selected.label,
            value: selected.value
          };
        })
        .filter(
          (
            entry
          ): entry is { groupKey: string; groupTitle: string; label: string; value: string } =>
            Boolean(entry)
        ),
    [optionGroups, selectedOptions]
  );

  const selectionSignature = useMemo(() => {
    if (!optionGroups.length) return '';
    return optionGroups
      .map((group) => `${group.key}:${selectedOptions[group.key]?.value ?? ''}`)
      .join('|');
  }, [optionGroups, selectedOptions]);

  const optionsPayload = useMemo(() => {
    if (!selectionEntries.length) return undefined;
    return selectionEntries.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.groupTitle] = entry.label;
      return acc;
    }, {});
  }, [selectionEntries]);

  const missingSelections = optionGroups.some((group) => !selectedOptions[group.key]);

  const formatPriceDelta = (delta?: number | null) => {
    if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) return null;
    const absolute = Math.abs(delta);
    const prefix = delta > 0 ? '+' : '-';
    return `${prefix}$${absolute.toFixed(2)}`;
  };

  const handleOptionSelect = (groupKey: string, value: string) => {
    const group = optionGroups.find((entry) => entry.key === groupKey);
    if (!group) return;
    const nextValue = group.values.find((entry) => entry.value === value);
    if (!nextValue) return;
    setSelectedOptions((prev) => ({
      ...prev,
      [groupKey]: nextValue
    }));
  };

  async function handleAddToCart() {
    if (!product.id || adding) return;
    try {
      setAdding(true);
      const baseId = product.id || product.href || '';
      const resolvedId =
        baseId && selectionSignature ? `${baseId}::${selectionSignature}` : baseId || product.id;
      const selectedOptionsList = selectionEntries.map(
        (entry) => `${entry.groupTitle}: ${entry.label}`
      );
      await addItem(null as any, {
        id: resolvedId || product.id,
        name: product.title,
        price:
          typeof activePrice === 'number'
            ? activePrice
            : typeof product.price === 'number'
              ? product.price
              : undefined,
        originalPrice:
          typeof comparePrice === 'number' &&
          (typeof activePrice !== 'number' || comparePrice > activePrice)
            ? comparePrice
            : typeof product.price === 'number'
              ? product.price
              : undefined,
        isOnSale: onSale,
        saleLabel: saleBadge || (product as any)?.saleLabel,
        image: product.imageSrc,
        quantity: 1,
        productUrl: product.href,
        options: optionsPayload,
        selectedOptions: selectedOptionsList,
        selectedUpgrades: [],
        ...(cartMeta.shippingClass ? { shippingClass: cartMeta.shippingClass } : {}),
        ...(cartMeta.installOnly ? { installOnly: true } : {})
      });

      emitAddToCartSuccess({ name: product.title });

      if (typeof window !== 'undefined') {
        try {
          if (!prefersDesktopCart()) {
            window.dispatchEvent(new Event('open-cart'));
          }
        } catch (error) {
          void error;
          try {
            window.dispatchEvent(new Event('open-cart'));
          } catch {
            // ignore
          }
        }
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
        className={`btn-plain inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80 transition hover:border-white/10 border-t shadow-sm hover:text-white ${className}`.trim()}
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
                className="absolute inset-0 bg-dark/70"
                aria-hidden="true"
                onClick={() => setOpen(false)}
              />

              <div className="btn-plain relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 text-white shadow-md">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 text-white/60 transition hover:text-white"
                >
                  <span className="sr-only">Close quick view</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>

                <div className="grid gap-6 p-6 sm:grid-cols-2 sm:gap-8 sm:p-8">
                  <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-dark/40 p-3 sm:block sm:min-h-0">
                    <img
                      src={product.imageSrc}
                      alt={product.imageAlt || product.title}
                      className="h-40 w-auto object-contain sm:h-full sm:w-full"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex flex-col gap-4 text-left">
                    <div>
                      <h2 className="text-2xl font-bold sm:text-3xl">{product.title}</h2>
                      {(formattedPrice || saleBadge) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {formattedPrice && (
                            <p className="text-xl font-semibold text-white/90">
                              {onSale && formattedCompare ? (
                                <>
                                  <span className="text-red-400">{formattedPrice}</span>
                                  <span className="ml-2 text-base text-white/60 line-through">
                                    {formattedCompare}
                                  </span>
                                </>
                              ) : (
                                formattedPrice
                              )}
                            </p>
                          )}
                          {saleBadge && (
                            <span className="rounded-full border border-red-500/60 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-200">
                              {saleBadge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {portableDescription ? (
                      <div className="space-y-2 text-sm leading-relaxed text-white/80">
                        <PortableText value={portableDescription} components={portableComponents} />
                      </div>
                    ) : fallbackDescription ? (
                      <p className="text-sm leading-relaxed text-white/70">{fallbackDescription}</p>
                    ) : null}

                    {optionGroups.length ? (
                      <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/60">
                          Options
                        </p>
                        <div className="mt-3 space-y-4">
                          {optionGroups.map((group) => {
                            const selected = selectedOptions[group.key];
                            return (
                              <div key={group.key}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                                    {group.title}
                                  </span>
                                  {selected?.priceDelta ? (
                                    <span className="text-[0.65rem] font-semibold text-white/70">
                                      {formatPriceDelta(selected.priceDelta)}
                                    </span>
                                  ) : null}
                                </div>
                                {group.helperText ? (
                                  <p className="mt-1 text-[0.65rem] text-white/60">
                                    {group.helperText}
                                  </p>
                                ) : null}
                                {group.type === 'select' ? (
                                  <select
                                    value={selected?.value ?? ''}
                                    onChange={(event) =>
                                      handleOptionSelect(group.key, event.target.value)
                                    }
                                    className="mt-2 w-full rounded-lg border border-white/15 bg-dark/60 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                                    aria-label={`Select ${group.title}`}
                                    aria-invalid={!selected}
                                  >
                                    <option value="" disabled>
                                      {`Select ${group.title}`}
                                    </option>
                                    {group.values.map((option) => (
                                      <option key={option.id} value={option.value}>
                                        {option.label}
                                        {option.priceDelta
                                          ? ` (${formatPriceDelta(option.priceDelta) ?? ''})`
                                          : ''}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {group.values.map((option) => {
                                      const isSelected = selected?.value === option.value;
                                      return (
                                        <button
                                          type="button"
                                          key={option.id}
                                          onClick={() =>
                                            handleOptionSelect(group.key, option.value)
                                          }
                                          className={clsx(
                                            'rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                            isSelected
                                              ? 'border-primary bg-primary/15 text-white'
                                              : 'border-white/20 text-white/70 hover:border-white/40'
                                          )}
                                          aria-pressed={isSelected}
                                        >
                                          <span>{option.label}</span>
                                          {option.priceDelta ? (
                                            <span className="ml-1 text-[0.65rem] font-normal text-white/70">
                                              {formatPriceDelta(option.priceDelta)}
                                            </span>
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {missingSelections ? (
                          <p className="mt-3 text-[0.65rem] font-semibold tracking-[0.15em] text-red-300">
                            Select a value for each option before adding to cart.
                          </p>
                        ) : null}
                      </section>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center gap-3 sm:flex-nowrap">
                      <a
                        href={product.href}
                        className="btn-plain inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border border-white/80 bg-dark px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/70 shadow-[inset_0_0_10px_rgba(125,1,7,0.18),0_0_18px_rgba(125,1,7,0.2)] transition hover:bg-white/70 hover:text-black hover:border-white hover:shadow-[inset_0_0_10px_rgba(125,1,7,0.18),0_0_22px_rgba(125,1,7,0.28)]"
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
                        disabled={!canAddToCart || adding || missingSelections}
                        className="btn-plain inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border border-primary bg-primary px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-black shadow-[inset_0_0_10px_rgba(125,1,7,0.18),0_0_18px_rgba(125,1,7,0.2)] transition enabled:hover:bg-primary/90 enabled:hover:shadow-[inset_0_0_10px_rgba(125,1,7,0.18),0_0_22px_rgba(125,1,7,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
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
