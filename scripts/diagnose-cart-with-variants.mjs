#!/usr/bin/env node

/**
 * Enhanced Cart Diagnostic Tool
 *
 * Fetches Medusa cart and checks detailed item + variant information
 * including shipping dimensions to debug validation errors.
 *
 * Usage:
 *   node scripts/diagnose-cart-with-variants.mjs <cart_id>
 *
 * Or to use cart from localStorage:
 *   1. Open browser console on fas-cms-fresh
 *   2. Run: localStorage.getItem('fas_medusa_cart_id')
 *   3. Copy the cart ID
 *   4. Run: node scripts/diagnose-cart-with-variants.mjs <paste_id>
 */

import fetch from 'node-fetch';

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
const MEDUSA_PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY;

async function medusaFetch(path, options = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (MEDUSA_PUBLISHABLE_KEY) {
    headers['x-publishable-api-key'] = MEDUSA_PUBLISHABLE_KEY;
  }

  const response = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
    ...options,
    headers
  });

  return response;
}

async function getVariantDetails(variantId) {
  try {
    const response = await medusaFetch(`/store/variants/${variantId}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.variant;
  } catch (error) {
    console.error(`Failed to fetch variant ${variantId}:`, error.message);
    return null;
  }
}

async function diagnoseCart(cartId) {
  if (!cartId) {
    console.error('❌ Cart ID required');
    console.log('\nUsage:');
    console.log('  node scripts/diagnose-cart-with-variants.mjs <cart_id>');
    console.log('\nTo find cart ID:');
    console.log('  1. Open browser console on your site');
    console.log('  2. Run: localStorage.getItem("fas_medusa_cart_id")');
    process.exit(1);
  }

  console.log(`\n🔍 Diagnosing Medusa Cart: ${cartId}\n`);
  console.log(`Backend: ${MEDUSA_BACKEND_URL}\n`);

  try {
    const response = await medusaFetch(`/store/carts/${cartId}`);

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
    console.log('LINE ITEMS WITH VARIANT DETAILS');
    console.log('═══════════════════════════════════════════════════════════\n');

    let hasErrors = false;
    let hasDimensionWarnings = false;

    for (let index = 0; index < cart.items.length; index++) {
      const item = cart.items[index];

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

      // Fetch and check variant details
      if (item.variant_id) {
        console.log(`\n    📦 Fetching variant details...`);
        const variant = await getVariantDetails(item.variant_id);

        if (variant) {
          console.log(`    Variant Title: ${variant.title || 'N/A'}`);
          console.log(`    SKU:          ${variant.sku || 'N/A'}`);

          // Check dimensions
          console.log(`\n    📏 Shipping Dimensions:`);

          const length = variant.length;
          const width = variant.width;
          const height = variant.height;
          const weight = variant.weight;

          if (length === null || length === undefined) {
            console.log(`      Length:   ⚠️  NOT SET`);
            hasDimensionWarnings = true;
          } else if (length <= 0) {
            console.log(`      Length:   ❌ INVALID (${length})`);
            hasErrors = true;
          } else if (length < 2) {
            console.log(`      Length:   ⚠️  SUSPICIOUS (${length} - too small?)`);
            hasDimensionWarnings = true;
          } else {
            console.log(`      Length:   ✅ ${length}`);
          }

          if (width === null || width === undefined) {
            console.log(`      Width:    ⚠️  NOT SET`);
            hasDimensionWarnings = true;
          } else if (width <= 0) {
            console.log(`      Width:    ❌ INVALID (${width})`);
            hasErrors = true;
          } else if (width < 2) {
            console.log(`      Width:    ⚠️  SUSPICIOUS (${width} - too small?)`);
            hasDimensionWarnings = true;
          } else {
            console.log(`      Width:    ✅ ${width}`);
          }

          if (height === null || height === undefined) {
            console.log(`      Height:   ⚠️  NOT SET`);
            hasDimensionWarnings = true;
          } else if (height <= 0) {
            console.log(`      Height:   ❌ INVALID (${height})`);
            hasErrors = true;
          } else if (height < 2) {
            console.log(`      Height:   ⚠️  SUSPICIOUS (${height} - too small?)`);
            hasDimensionWarnings = true;
          } else {
            console.log(`      Height:   ✅ ${height}`);
          }

          if (weight === null || weight === undefined) {
            console.log(`      Weight:   ⚠️  NOT SET`);
            hasDimensionWarnings = true;
          } else if (weight <= 0) {
            console.log(`      Weight:   ❌ INVALID (${weight})`);
            hasErrors = true;
          } else {
            console.log(`      Weight:   ✅ ${weight}`);
          }

          // Check inventory
          if (variant.inventory_quantity !== undefined) {
            console.log(`\n    📊 Inventory: ${variant.inventory_quantity}`);
          }

          // Check if variant has options
          if (variant.options && variant.options.length > 0) {
            console.log(`\n    🎨 Options:`);
            variant.options.forEach(opt => {
              console.log(`      - ${opt.option?.title || 'Unknown'}: ${opt.value}`);
            });
          }
        } else {
          console.log(`    ❌ Failed to fetch variant details`);
          hasErrors = true;
        }
      }

      // Check metadata
      if (item.metadata && Object.keys(item.metadata).length > 0) {
        console.log(`\n    🏷️  Metadata:`);
        Object.entries(item.metadata).forEach(([key, value]) => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
          console.log(`      - ${key}: ${valueStr}`);
        });
      } else {
        console.log(`\n    Metadata:     ⚠️  None`);
      }

      console.log('\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (hasErrors) {
      console.log('❌ VALIDATION FAILED - Cart has invalid items\n');
      console.log('Critical Issues Found:');
      console.log('- Items with invalid prices, totals, or dimensions');
      console.log('\nNext Steps:');
      console.log('1. Go to Medusa Admin → Products');
      console.log('2. Find products/variants listed above with errors');
      console.log('3. Update each variant to have:');
      console.log('   - Valid price (not null, not $0.00)');
      console.log('   - Valid dimensions (length, width, height > 0)');
      console.log('   - Valid weight (> 0)');
      console.log('4. Save changes and try checkout again\n');
    } else if (hasDimensionWarnings) {
      console.log('⚠️  WARNINGS FOUND - Cart may have issues\n');
      console.log('Warnings:');
      console.log('- Some variants have missing or suspicious dimensions');
      console.log('- This may cause shipping calculation errors');
      console.log('\nRecommended Actions:');
      console.log('1. Go to Medusa Admin → Products');
      console.log('2. Review variants with dimension warnings');
      console.log('3. Set realistic shipping dimensions (in inches or cm)');
      console.log('4. Ensure weight is set correctly\n');
    } else {
      console.log('✅ All items validated successfully\n');
      console.log('- All prices and totals are valid');
      console.log('- All shipping dimensions are set');
      console.log('\nIf checkout still fails, check:');
      console.log('- Shipping address format');
      console.log('- Payment provider configuration');
      console.log('- Backend logs for additional errors\n');
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
