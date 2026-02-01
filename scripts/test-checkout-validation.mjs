#!/usr/bin/env node

/**
 * Test Checkout Validation
 * Tests if the cart passes validation with the updated logic
 */

import fetch from 'node-fetch';

const MEDUSA_BACKEND_URL = 'http://localhost:9000';
const MEDUSA_PUBLISHABLE_KEY = 'pk_f845f736dea225523c815ec65dedb635fd9130713ea6876f82608c435322d162';

async function validateCartForCheckout(cartId) {
  const errors = [];
  const warnings = [];

  try {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY
    };

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}`, {
      method: 'GET',
      headers
    });

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

      // Check total (optional in Medusa v2 - totals are calculated at cart level)
      // If total exists, validate it; otherwise calculate from unit_price * quantity
      const expectedTotal = item.unit_price * item.quantity;
      if (item.total !== undefined) {
        if (typeof item.total !== 'number' || item.total < 0) {
          errors.push(`Item "${itemLabel}" has invalid total. Check variant configuration in Medusa Admin.`);
        }
      } else if (expectedTotal < 0) {
        errors.push(`Item "${itemLabel}" has invalid calculated total. Check variant pricing in Medusa Admin.`);
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
  } catch (error) {
    console.error('[Validation] Cart validation failed:', error);
    errors.push(`Validation error: ${error.message || 'Unknown error'}`);
    return { valid: false, errors, warnings };
  }
}

const cartId = process.argv[2] || 'cart_01KGCCKZA2Q5NF7NJ6TVT64TA2';

console.log(`\n🧪 Testing Checkout Validation for Cart: ${cartId}\n`);

validateCartForCheckout(cartId).then(result => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('VALIDATION RESULT');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (result.valid) {
    console.log('✅ VALIDATION PASSED\n');
    console.log('The cart should now proceed to checkout successfully.');
  } else {
    console.log('❌ VALIDATION FAILED\n');
    console.log('Errors:');
    result.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((warn, i) => {
      console.log(`  ${i + 1}. ${warn}`);
    });
  }

  console.log('');
  process.exit(result.valid ? 0 : 1);
});
