/**
 * Sale Helper Functions for FAS Motorsports
 * Handles sale pricing logic, date validation, and badge text
 */

type MaybeDate = string | number | Date | null | undefined;
type SaleAwareProduct = Record<string, any> & {
  pricing?: Record<string, any>;
};

const getField = (product: SaleAwareProduct, key: string) =>
  product?.[key] ?? product?.pricing?.[key];

const toDate = (value: MaybeDate): Date | null => {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dt.valueOf()) ? null : dt;
};

const toNumeric = (value: unknown): number | undefined => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) ? numeric : undefined;
};

/**
 * Determines if a product is currently on sale
 * @param {Object} product - Product object from Sanity
 * @returns {boolean}
 */
export function isOnSale(product?: SaleAwareProduct): boolean {
  if (!product) return false;

  const onSale = getField(product, 'onSale') === true;
  const salePrice = getField(product, 'salePrice');
  const saleActive = getField(product, 'saleActive');

  if (!onSale || salePrice == null) return false;
  if (typeof saleActive === 'boolean' && !saleActive) return false;

  const now = new Date();

  const startDate = toDate(getField(product, 'saleStartDate'));
  if (startDate && now < startDate) return false;

  const endDate = toDate(getField(product, 'saleEndDate'));
  if (endDate && now > endDate) return false;

  return true;
}

/**
 * Returns the active price (sale or regular)
 * @param {Object} product - Product object from Sanity
 * @returns {number}
 */
export function getActivePrice(product?: SaleAwareProduct): number | undefined {
  if (!product) return undefined;
  if (isOnSale(product)) {
    return toNumeric(getField(product, 'salePrice'));
  }
  return toNumeric(getField(product, 'price'));
}

/**
 * Returns the original price for comparison (strikethrough display)
 * @param {Object} product - Product object from Sanity
 * @returns {number|null}
 */
export function getCompareAtPrice(product?: SaleAwareProduct): number | null {
  if (!product) return null;
  if (isOnSale(product)) {
    return (
      toNumeric(getField(product, 'compareAtPrice')) ??
      toNumeric(getField(product, 'price')) ??
      null
    );
  }
  return null;
}

/**
 * Returns formatted sale badge text
 * @param {Object} product - Product object from Sanity
 * @returns {string|null}
 */
export function getSaleBadgeText(product?: SaleAwareProduct): string | null {
  if (!product || !isOnSale(product)) return null;

  const labels: Record<string, string> = {
    'black-friday': 'BLACK FRIDAY',
    'cyber-monday': 'CYBER MONDAY',
    clearance: 'CLEARANCE',
    'limited-time': 'LIMITED TIME',
    'hot-deal': 'HOT DEAL',
    sale: 'SALE'
  };

  const labelKey = getField(product, 'saleLabel');
  if (labelKey && typeof labelKey === 'string' && labels[labelKey]) {
    return labels[labelKey];
  }

  const discount =
    getField(product, 'discountPercent') ??
    getField(product, 'discountPercentage') ??
    null;
  if (typeof discount === 'number' && Number.isFinite(discount) && discount > 0) {
    return `${discount}% OFF`;
  }

  return 'SALE';
}

/**
 * Returns savings amount in dollars
 * @param {Object} product - Product object from Sanity
 * @returns {number}
 */
export function getSavingsAmount(product?: SaleAwareProduct): number {
  if (!product || !isOnSale(product)) return 0;

  const originalPrice =
    toNumeric(getField(product, 'compareAtPrice')) ??
    toNumeric(getField(product, 'price')) ??
    0;
  const salePrice = toNumeric(getField(product, 'salePrice')) ?? 0;
  return Math.max(0, Number(originalPrice) - Number(salePrice));
}

/**
 * Formats price for display
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(Number(price))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(price));
}

/**
 * Returns time remaining until sale ends
 * @param {Object} product
 * @returns {string|null}
 */
export function getSaleTimeRemaining(product?: SaleAwareProduct): string | null {
  if (!product || !isOnSale(product)) return null;

  const endDate = toDate(getField(product, 'saleEndDate'));
  if (!endDate) return null;

  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} left`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  }
  return 'Ending soon';
}

/**
 * Filter helper: returns only products currently on sale.
 */
export function filterOnSaleProducts<T extends SaleAwareProduct>(products: T[]): T[] {
  return Array.isArray(products) ? products.filter((product) => isOnSale(product)) : [];
}

/**
 * Sort helper: products by largest percentage discount.
 */
export function sortByDiscount<T extends SaleAwareProduct>(products: T[]): T[] {
  return Array.isArray(products)
    ? [...products].sort((a, b) => {
        const discountA =
          (getField(a, 'discountPercent') ?? getField(a, 'discountPercentage') ?? 0) as number;
        const discountB =
          (getField(b, 'discountPercent') ?? getField(b, 'discountPercentage') ?? 0) as number;
        return (discountB || 0) - (discountA || 0);
      })
    : [];
}

/**
 * Sort helper: products by largest dollar savings.
 */
export function sortBySavings<T extends SaleAwareProduct>(products: T[]): T[] {
  return Array.isArray(products)
    ? [...products].sort((a, b) => {
        const savingsA = getSavingsAmount(a);
        const savingsB = getSavingsAmount(b);
        return savingsB - savingsA;
      })
    : [];
}
