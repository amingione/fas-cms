/**
 * Checkout Cart Validation
 * 
 * Validates Medusa cart before allowing checkout to proceed.
 * Catches common issues: missing prices, invalid variants, malformed data.
 */

import { medusaFetch } from '../medusa';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validates a Medusa cart is ready for checkout
 * 
 * Checks:
 * - Cart exists and has items
 * - All line items have valid prices
 * - All line items have valid totals
 * - All line items have variant IDs
 * 
 * @param cartId - Medusa cart ID
 * @returns Validation result with errors array
 */
export async function validateCartForCheckout(cartId: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Fetch cart
    const response = await medusaFetch(`/store/carts/${cartId}`);
    
    if (!response.ok) {
      errors.push('Failed to load cart from Medusa');
      return { valid: false, errors, warnings };
    }

    const data = await response.json();
    const cart = data.cart;

    if (!cart) {
      errors.push('Cart not found');
      return { valid: false, errors, warnings };
    }

    if (!cart.items || cart.items.length === 0) {
      errors.push('Cart is empty');
      return { valid: false, errors, warnings };
    }

    // Check each line item
    for (const item of cart.items) {
      const itemLabel = item.title || item.id;

      // Check price
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        errors.push(`Item "${itemLabel}" has invalid unit price. Check variant pricing in Medusa Admin.`);
      }

      // Check total
      if (typeof item.total !== 'number' || item.total < 0) {
        errors.push(`Item "${itemLabel}" has invalid total. Check variant configuration in Medusa Admin.`);
      }

      // Check variant exists
      if (!item.variant_id) {
        errors.push(`Item "${itemLabel}" is missing variant ID. This item cannot be fulfilled.`);
      }

      // Warning: Check for missing metadata (non-blocking)
      if (!item.metadata || Object.keys(item.metadata).length === 0) {
        warnings.push(`Item "${itemLabel}" has no metadata. Options/upgrades may not display correctly.`);
      }
    }

    // Check cart totals
    if (typeof cart.total !== 'number' || cart.total < 0) {
      errors.push('Cart total is invalid. Cannot proceed to payment.');
    }

    // Check subtotal
    if (typeof cart.subtotal !== 'number' || cart.subtotal < 0) {
      errors.push('Cart subtotal is invalid. Check item prices.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error: any) {
    console.error('[Validation] Cart validation failed:', error);
    errors.push(`Validation error: ${error.message || 'Unknown error'}`);
    return { valid: false, errors, warnings };
  }
}
