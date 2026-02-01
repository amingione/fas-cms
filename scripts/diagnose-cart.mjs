#!/usr/bin/env node

/**
 * Cart Diagnostic Tool
 * 
 * Fetches Medusa cart and shows detailed item information
 * to help debug validation errors.
 * 
 * Usage:
 *   node scripts/diagnose-cart.mjs <cart_id>
 * 
 * Or to use cart from localStorage:
 *   1. Open browser console on fas-cms-fresh
 *   2. Run: localStorage.getItem('fas_medusa_cart_id')
 *   3. Copy the cart ID
 *   4. Run: node scripts/diagnose-cart.mjs <paste_id>
 */

import fetch from 'node-fetch';

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
const MEDUSA_PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY;

async function diagnoseCart(cartId) {
  if (!cartId) {
    console.error('❌ Cart ID required');
    console.log('\nUsage:');
    console.log('  node scripts/diagnose-cart.mjs <cart_id>');
    console.log('\nTo find cart ID:');
    console.log('  1. Open browser console on your site');
    console.log('  2. Run: localStorage.getItem("fas_medusa_cart_id")');
    process.exit(1);
  }

  console.log(`\n🔍 Diagnosing Medusa Cart: ${cartId}\n`);
  console.log(`Backend: ${MEDUSA_BACKEND_URL}\n`);

  try {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (MEDUSA_PUBLISHABLE_KEY) {
      headers['x-publishable-api-key'] = MEDUSA_PUBLISHABLE_KEY;
    }

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch cart: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
      process.exit(1);
    }

    const data = await response.json();
    const cart = data.cart;

    console.log('✅ Cart fetched successfully\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CART SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Cart ID:       ${cart.id}`);
    console.log(`Email:         ${cart.email || 'Not set'}`);
    console.log(`Region:        ${cart.region_id || 'Not set'}`);
    console.log(`Currency:      ${cart.currency_code || 'Not set'}`);
    console.log(`Item Count:    ${cart.items?.length || 0}`);
    console.log('');

    console.log('───────────────────────────────────────────────────────────');
    console.log('TOTALS');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`Subtotal:      ${formatAmount(cart.subtotal, cart.currency_code)}`);
    console.log(`Shipping:      ${formatAmount(cart.shipping_total, cart.currency_code)}`);
    console.log(`Tax:           ${formatAmount(cart.tax_total, cart.currency_code)}`);
    console.log(`Discount:      ${formatAmount(cart.discount_total, cart.currency_code)}`);
    console.log(`TOTAL:         ${formatAmount(cart.total, cart.currency_code)}`);
    console.log('');

    if (!cart.items || cart.items.length === 0) {
      console.log('⚠️  Cart is empty\n');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('LINE ITEMS');
    console.log('═══════════════════════════════════════════════════════════\n');

    let hasErrors = false;

    cart.items.forEach((item, index) => {
      console.log(`[${index + 1}] ${item.title || 'Untitled Item'}`);
      console.log(`    ID:           ${item.id}`);
      console.log(`    Variant ID:   ${item.variant_id || '❌ MISSING'}`);
      console.log(`    Quantity:     ${item.quantity}`);
      
      // Check unit_price
      if (typeof item.unit_price !== 'number') {
        console.log(`    Unit Price:   ❌ INVALID (${item.unit_price})`);
        hasErrors = true;
      } else {
        console.log(`    Unit Price:   ${formatAmount(item.unit_price, cart.currency_code)}`);
      }

      // Check total
      if (typeof item.total !== 'number') {
        console.log(`    Total:        ❌ INVALID (${item.total})`);
        hasErrors = true;
      } else {
        console.log(`    Total:        ${formatAmount(item.total, cart.currency_code)}`);
      }

      // Check metadata
      if (item.metadata) {
        console.log(`    Metadata:`);
        Object.entries(item.metadata).forEach(([key, value]) => {
          console.log(`      - ${key}: ${JSON.stringify(value)}`);
        });
      } else {
        console.log(`    Metadata:     ⚠️  None`);
      }

      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (hasErrors) {
      console.log('❌ VALIDATION FAILED - Cart has invalid items\n');
      console.log('Next Steps:');
      console.log('1. Go to Medusa Admin → Products');
      console.log('2. Find products listed above with invalid prices');
      console.log('3. Check each variant has:');
      console.log('   - Valid price set (not null, not $0.00)');
      console.log('   - Correct currency');
      console.log('4. Update prices and try checkout again\n');
    } else {
      console.log('✅ All items have valid prices and totals\n');
      console.log('If checkout still fails, check:');
      console.log('- Variant weight/dimensions (for shipping)');
      console.log('- Shipping address format');
      console.log('- Payment provider configuration\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

function formatAmount(amount, currency = 'usd') {
  if (typeof amount !== 'number') {
    return 'N/A';
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

// Get cart ID from command line
const cartId = process.argv[2];
diagnoseCart(cartId);
