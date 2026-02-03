import { formatCents } from '@/lib/pricing';

/**
 * ⚠️⚠️⚠️ CRITICAL PRICING WARNING ⚠️⚠️⚠️
 * 
 * Sale Helper Functions for FAS Motorsports
 * Handles sale pricing logic, date validation, and badge text
 * 
 * **PRICING AUTHORITY MODEL:**
 * - Medusa: AUTHORITATIVE for ALL transactional pricing
 * - Sanity: Display metadata only (sale badges, UI labels)
 * 
 * **THESE FUNCTIONS ARE FOR DISPLAY PURPOSES ONLY**
 * 
 * ✅ ALLOWED:
 * - Product card displays
 * - Price labels in UI
 * - Sale badges and indicators
 * - Marketing content
 * 
 * ❌ FORBIDDEN:
 * - Cart operations
 * - Checkout calculations
 * - Payment processing
 * - Any backend pricing logic
 * - Creating Stripe prices
 * 
 * **FOR TRANSACTIONAL PRICING:**
 * Use Medusa APIs exclusively:
 * - GET /store/products (for product prices)
 * - GET /store/carts/:id (for cart totals)
 * - POST /api/medusa/payments/create-intent (for checkout)
 * 
 * Violations of this rule will cause pricing bugs ($19 fallback issue).
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
 * ⚠️ DEPRECATED FOR CHECKOUT/CART: Returns the active price (sale or regular)
 * 
 * **CRITICAL WARNING:**
 * This function pulls prices from Sanity CMS, NOT from Medusa.
 * 
 * **ALLOWED USE CASES:**
 * - Display purposes only (product cards, price labels, UI)
 * - Sale badge indicators
 * - Promotional content
 * 
 * **FORBIDDEN USE CASES:**
 * - Adding items to cart (use Medusa variant price)
 * - Checkout calculations (use Medusa cart totals)
 * - Payment processing (use Medusa order total)
 * - Any backend pricing logic
 * 
 * **PRICING AUTHORITY:**
 * Medusa is the ONLY source of truth for transactional pricing.
 * This function is for UI display only.
 * 
 * @param {Object} product - Product object from Sanity (for display only)
 * @returns {number|undefined} Display price (NOT authoritative for transactions)
 */
export function getActivePrice(product?: SaleAwareProduct): number | undefined {
  if (process.env.NODE_ENV !== 'production') {
    const stack = new Error().stack;
    // Check if called from cart or checkout contexts
    if (
      stack?.includes('cart/actions') ||
      stack?.includes('checkout') ||
      stack?.includes('create-checkout-session')
    ) {
      console.error(
        '❌ [PRICING VIOLATION] getActivePrice() called from cart/checkout context!',
        '\n',
        'This function returns Sanity prices, NOT Medusa prices.',
        '\n',
        'Use Medusa /store/products API for transactional pricing.',
        '\n',
        'Stack trace:',
        stack
      );
    }
  }

  if (!product) return undefined;
  if (isOnSale(product)) {
    return toNumeric(getField(product, 'salePrice'));
  }
  return toNumeric(getField(product, 'price'));
}

/**
 * ⚠️ DEPRECATED FOR CHECKOUT/CART: Returns the original price for comparison (strikethrough display)
 * 
 * **CRITICAL WARNING:**
 * This function pulls prices from Sanity CMS, NOT from Medusa.
 * 
 * **ALLOWED USE CASES:**
 * - Display purposes only (strikethrough prices, sale indicators)
 * - UI comparison displays
 * - Marketing content
 * 
 * **FORBIDDEN USE CASES:**
 * - Cart calculations
 * - Checkout processing
 * - Payment intents
 * - Any transactional logic
 * 
 * **PRICING AUTHORITY:**
 * Medusa is the ONLY source of truth for transactional pricing.
 * 
 * @param {Object} product - Product object from Sanity (for display only)
 * @returns {number|null} Display price (NOT authoritative for transactions)
 */
export function getCompareAtPrice(product?: SaleAwareProduct): number | null {
  if (process.env.NODE_ENV !== 'production') {
    const stack = new Error().stack;
    if (
      stack?.includes('cart/actions') ||
      stack?.includes('checkout') ||
      stack?.includes('create-checkout-session')
    ) {
      console.error(
        '❌ [PRICING VIOLATION] getCompareAtPrice() called from cart/checkout context!',
        '\n',
        'This function returns Sanity prices, NOT Medusa prices.',
        '\n',
        'Use Medusa /store/products API for transactional pricing.'
      );
    }
  }

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
  return formatCents(price, { currency: 'USD', locale: 'en-US' });
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
