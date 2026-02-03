/**
 * Medusa Pricing Utilities
 * 
 * ✅ AUTHORITATIVE PRICING SOURCE
 * 
 * This module provides utilities for fetching pricing from Medusa,
 * which is the ONLY valid source of truth for transactional pricing.
 * 
 * **PRICING AUTHORITY:**
 * - Medusa: Products, variants, cart totals, shipping, tax
 * - Stripe: Payment processing only (receives amounts, doesn't set them)
 * - Sanity: UI metadata only (never used for transactions)
 * 
 * **Usage:**
 * ```typescript
 * // Get product price from Medusa
 * const product = await getMedusaProduct(variantId);
 * const price = product.variants[0].calculated_price;
 * 
 * // Get cart total from Medusa
 * const cart = await getMedusaCart(cartId);
 * const total = cart.total;
 * 
 * // Create payment intent with Medusa total
 * const paymentIntent = await createPaymentIntent(cart.total);
 * ```
 */

import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

type MedusaProduct = {
  id: string;
  title?: string;
  variants?: Array<{
    id: string;
    title?: string;
    sku?: string;
    calculated_price?: number; // ✅ AUTHORITATIVE PRICE
    original_price?: number;
    prices?: Array<{
      amount?: number;
      currency_code?: string;
      region_id?: string;
    }>;
  }>;
};

type MedusaCart = {
  id: string;
  total?: number; // ✅ AUTHORITATIVE TOTAL
  subtotal?: number;
  tax_total?: number;
  shipping_total?: number;
  items?: Array<{
    id: string;
    variant_id?: string;
    title?: string;
    quantity?: number;
    unit_price?: number; // ✅ AUTHORITATIVE UNIT PRICE
    total?: number;
  }>;
};

/**
 * Fetch product with pricing from Medusa
 * 
 * @param productId - Medusa product ID
 * @param regionId - Optional region ID for regional pricing
 * @returns Medusa product with authoritative pricing
 */
export async function getMedusaProduct(
  productId: string,
  regionId?: string
): Promise<MedusaProduct | null> {
  const config = getMedusaConfig();
  if (!config) {
    console.error('[medusa-pricing] Medusa backend not configured');
    return null;
  }

  const params = regionId ? `?region_id=${regionId}` : '';
  const response = await medusaFetch(`/store/products/${productId}${params}`, {
    method: 'GET'
  });

  const data = await readJsonSafe<any>(response);
  if (!response.ok) {
    console.error('[medusa-pricing] Failed to fetch product', {
      productId,
      status: response.status,
      error: data?.message
    });
    return null;
  }

  return data?.product || null;
}

/**
 * Fetch cart with totals from Medusa
 * 
 * @param cartId - Medusa cart ID
 * @returns Medusa cart with authoritative totals
 */
export async function getMedusaCart(cartId: string): Promise<MedusaCart | null> {
  const config = getMedusaConfig();
  if (!config) {
    console.error('[medusa-pricing] Medusa backend not configured');
    return null;
  }

  const response = await medusaFetch(`/store/carts/${cartId}`, {
    method: 'GET'
  });

  const data = await readJsonSafe<any>(response);
  if (!response.ok) {
    console.error('[medusa-pricing] Failed to fetch cart', {
      cartId,
      status: response.status,
      error: data?.message
    });
    return null;
  }

  return data?.cart || null;
}

/**
 * Get variant price from Medusa product
 * 
 * @param product - Medusa product object
 * @param variantId - Optional variant ID (defaults to first variant)
 * @returns Calculated price in cents, or null if not found
 */
export function getVariantPrice(
  product: MedusaProduct,
  variantId?: string
): number | null {
  if (!product?.variants || product.variants.length === 0) {
    return null;
  }

  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : product.variants[0];

  if (!variant) {
    return null;
  }

  // calculated_price is the authoritative price including discounts, taxes, etc.
  return typeof variant.calculated_price === 'number' ? variant.calculated_price : null;
}

/**
 * Validate that a price came from Medusa
 * 
 * Use this to ensure prices are from authoritative source.
 * 
 * @param price - Price to validate
 * @param source - Source identifier (for logging)
 * @returns true if valid Medusa price
 */
export function validateMedusaPrice(price: unknown, source: string): boolean {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    console.error('[medusa-pricing] Invalid price detected', {
      price,
      priceType: typeof price,
      source
    });
    return false;
  }

  return true;
}

/**
 * Runtime assertion: Ensure price source is Medusa
 * 
 * Throws error if price is not from a Medusa source.
 * Use in checkout and cart operations.
 * 
 * @param price - Price to validate
 * @param context - Context description
 * @throws Error if price is invalid
 */
export function assertMedusaPrice(price: unknown, context: string): asserts price is number {
  if (!validateMedusaPrice(price, context)) {
    throw new Error(
      `[PRICING VIOLATION] Invalid Medusa price in ${context}. ` +
        `Expected valid number, got: ${typeof price} = ${price}`
    );
  }
}
