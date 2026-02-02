export type PriceFormatOptions = {
  currency?: string;
  locale?: string;
  narrowSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const parseCents = (value: number | string | null | undefined): number | null => {
  if (value == null) return null;
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

export const centsToDollars = (amount: number | string | null | undefined): number | null => {
  const cents = parseCents(amount);
  if (cents == null) return null;
  return cents / 100;
};

export const formatCents = (
  amount: number | string | null | undefined,
  {
    currency = 'USD',
    locale,
    narrowSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  }: PriceFormatOptions = {}
): string => {
  const dollars = centsToDollars(amount);
  if (dollars == null) return '—';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: narrowSymbol ? 'narrowSymbol' : 'symbol',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(dollars);
  } catch {
    return `${currency} ${dollars.toFixed(minimumFractionDigits)}`;
  }
};

export const formatCentsWithSign = (
  amount: number | string | null | undefined,
  opts: PriceFormatOptions = {}
): string => {
  const cents = parseCents(amount);
  if (cents == null) return '—';
  const sign = cents < 0 ? '-' : cents > 0 ? '+' : '';
  const formatted = formatCents(Math.abs(cents), opts);
  return `${sign}${formatted}`;
};
