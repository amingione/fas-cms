import clsx from 'clsx';
import * as React from 'react';

/**
 * Price — FAS + Sanity friendly
 *
 * Works with Sanity fields like: price (number), salePrice (number), onSale (boolean).
 * Accepts number or string amounts and renders a themed price with optional compare/original.
 */

export function formatPrice(
  amount: number | string | null | undefined,
  currency: string = 'USD',
  locale?: string,
  opts: {
    narrowSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n as number)) return '—';
  const { narrowSymbol = true, minimumFractionDigits = 2, maximumFractionDigits = 2 } = opts;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: narrowSymbol ? 'narrowSymbol' : 'symbol',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(n as number);
  } catch {
    // Fallback: simple toFixed with currency code suffix
    return `${currency} ${(n as number).toFixed(minimumFractionDigits)}`;
  }
}

export type PriceProps = {
  amount: number | string | null | undefined; // current/primary price
  originalAmount?: number | string | null; // compare-at price
  onSale?: boolean; // optional explicit flag
  currencyCode?: string;
  className?: string;
  currencyCodeClassName?: string; // kept for backwards compat (appended span when showCurrencyCode)
  showCurrencyCode?: boolean; // show trailing code like "USD"
  locale?: string; // pass locale if desired
  stackCompare?: boolean; // render compare price above sale price
  pill?: boolean; // render the active price inside a pill
} & React.ComponentProps<'p'>;

const Price: React.FC<PriceProps> = ({
  amount,
  originalAmount,
  onSale,
  currencyCode = 'USD',
  className,
  currencyCodeClassName,
  showCurrencyCode = false,
  locale,
  stackCompare = false,
  pill = false,
  ...p
}) => {
  const curr = formatPrice(amount, currencyCode, locale);
  const orig = formatPrice(originalAmount, currencyCode, locale);

  const hasCompare = Number.isFinite(
    typeof originalAmount === 'string' ? parseFloat(originalAmount) : (originalAmount as number)
  );

  const isSale =
    Boolean(onSale) ||
    (Number.isFinite(typeof amount === 'string' ? parseFloat(amount) : (amount as number)) &&
      Number.isFinite(
        typeof originalAmount === 'string'
          ? parseFloat(originalAmount as any)
          : (originalAmount as number)
      ) &&
      Number(
        typeof originalAmount === 'string'
          ? parseFloat(originalAmount as any)
          : (originalAmount as number)
      ) > Number(typeof amount === 'string' ? parseFloat(amount as any) : (amount as number)));

  // Theme classes: font-mono for numerals, accent for current price, muted strike-through for compare
  if (isSale && hasCompare) {
    if (stackCompare) {
      return (
        <div
          suppressHydrationWarning
          className={clsx('flex flex-col items-end text-right', className)}
          {...p}
        >
          <span className="text-xs font-medium leading-tight text-white/70 line-through">{orig}</span>
          <span className="mt-1 rounded-full bg-primary px-3 py-1.5 text-base font-bold leading-tight text-black">
            {curr}
            {showCurrencyCode && (
              <span className={clsx('ml-1 inline', currencyCodeClassName)}>{currencyCode}</span>
            )}
          </span>
        </div>
      );
    }

    return (
      <p suppressHydrationWarning className={clsx('font-sans font-semibold', className)} {...p}>
        <span className="text-white">{curr}</span>
        {showCurrencyCode && (
          <span className={clsx('ml-1 inline', currencyCodeClassName)}>{currencyCode}</span>
        )}
        <span className="ml-2 align-middle text-sm text-white line-through">{orig}</span>
      </p>
    );
  }

  if (pill) {
    return (
      <p
        suppressHydrationWarning
        className={clsx('font-sans font-bold text-white', className)}
        {...p}
      >
        <span className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-base leading-tight text-black">
          {curr}
          {showCurrencyCode && (
            <span className={clsx('ml-1 inline', currencyCodeClassName)}>{currencyCode}</span>
          )}
        </span>
      </p>
    );
  }

  return (
    <p
      suppressHydrationWarning
      className={clsx('font-sans font-bold text-white', className)}
      {...p}
    >
      {curr}
      {showCurrencyCode && (
        <span className={clsx('ml-1 inline', currencyCodeClassName)}>{currencyCode}</span>
      )}
    </p>
  );
};

export default Price;
