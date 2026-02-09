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

  let fraction = fractional;
  if (fraction.length > 2) {
    const extra = fraction.slice(2);
    if (extra.replace(/0/g, '') !== '') {
      throw new Error(`[money] ${label} has more than 2 decimal places: "${normalized}"`);
    }
    fraction = fraction.slice(0, 2);
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
