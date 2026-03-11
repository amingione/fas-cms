export type MoneyValue = number | string | null | undefined;

const decimalPattern = /^-?\d+(\.\d+)?$/;

export function toCentsStrict(value: MoneyValue, label = 'amount'): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value)) return value;
  }

  const raw = typeof value === 'number' ? value.toString() : String(value);
  const normalized = raw.trim();
  if (!normalized) return null;
  if (!decimalPattern.test(normalized)) {
    throw new Error(`[money] Invalid ${label} "${normalized}"`);
  }

  const isNegative = normalized.startsWith('-');
  const numeric = isNegative ? normalized.slice(1) : normalized;
  const [wholePart, fractional = ''] = numeric.split('.');

  // Round to 2 decimal places if there are more
  let fraction = fractional;
  if (fraction.length > 2) {
    // Convert to number, round, then back to 2-digit string
    const fullNumber = parseFloat(normalized);
    const rounded = Math.round(fullNumber * 100) / 100;
    const roundedStr = rounded.toFixed(2);
    const [, roundedFraction = ''] = roundedStr.split('.');
    fraction = roundedFraction;
  }

  const paddedFraction = (fraction + '00').slice(0, 2);
  const whole = BigInt(wholePart || '0');
  const cents = whole * 100n + BigInt(paddedFraction || '0');
  const signed = isNegative ? -cents : cents;

  const asNumber = Number(signed);
  if (!Number.isFinite(asNumber)) {
    throw new Error(`[money] ${label} is too large to fit in Number: "${normalized}"`);
  }
  return asNumber;
}

export function normalizeCartTotals(
  cart: Record<string, any> | null | undefined
): Record<string, any> | null | undefined {
  if (!cart || typeof cart !== 'object') return cart;
  const fields = [
    'subtotal',
    'tax_total',
    'shipping_total',
    'discount_total',
    'total',
    'original_total'
  ];

  for (const field of fields) {
    if (field in cart) {
      const next = toCentsStrict(cart[field], field);
      if (typeof next === 'number') {
        (cart as Record<string, any>)[field] = next;
      }
    }
  }

  return cart;
}
