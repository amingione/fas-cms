const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Format a numeric value as USD currency. Accepts numbers or numeric strings.
 */
export function formatMoney(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '$0.00';
  return USD_FORMATTER.format(num);
}

export function parseMoney(value: string | number): number {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[^\d.-]+/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
