#!/usr/bin/env tsx
/**
 * Create a test Stripe Checkout Session with shipping to test Parcelcraft transit times
 *
 * Usage:
 *   yarn tsx scripts/create-test-checkout-with-shipping.ts [shipping_city] [shipping_state] [shipping_zip]
 *
 * Example (local address):
 *   yarn tsx scripts/create-test-checkout-with-shipping.ts "Los Angeles" "CA" "90001"
 *
 * Example (cross-country):
 *   yarn tsx scripts/create-test-checkout-with-shipping.ts "New York" "NY" "10001"
 */

import 'dotenv/config';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const city = process.argv[2] || 'Los Angeles';
const state = process.argv[3] || 'CA';
const zip = process.argv[4] || '90001';

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion
});

async function createTestCheckout() {
  try {
    console.log(`\n🛒 Creating test Checkout Session with shipping...\n`);
    console.log(`📍 Shipping Address: ${city}, ${state} ${zip}\n`);
    console.log(`⚙️  Shipping Mode: Dynamic (Parcelcraft)\n`);

    const existingPriceId = process.env.STRIPE_TEST_SHIPPABLE_PRICE_ID;
    let priceId = existingPriceId;

    if (!priceId) {
      const product = await stripe.products.create({
        name: 'Test Product for Shipping',
        description: 'Test product to verify Parcelcraft transit times',
        shippable: true,
        package_dimensions: {
          length: 12,
          width: 12,
          height: 12,
          weight: 15
        },
        tax_code: 'txcd_99999999',
        metadata: {
          shipping_required: 'true',
          weight: '15',
          weight_unit: 'pound',
          origin_country: 'US',
          length: '12',
          width: '12',
          height: '12',
          dimension_unit: 'inch'
        }
      });

      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: 10000,
        product: product.id,
        tax_behavior: 'exclusive'
      });

      priceId = price.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      shipping_address_collection: {
        allowed_countries: ['US']
      },
      invoice_creation: {
        enabled: true
      },
      automatic_tax: {
        enabled: true
      },
      billing_address_collection: 'required',
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        test_checkout: 'true',
        purpose: 'parcelcraft_transit_time_test',
        test_shipping_city: city,
        test_shipping_state: state,
        test_shipping_zip: zip
      }
    });

    console.log('✅ Checkout Session created!\n');
    console.log('─'.repeat(80));
    console.log(`\n📋 Session Details:`);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   URL: ${session.url}\n`);
    console.log(`   Stripe Price ID: ${priceId}`);

    console.log('📝 Next Steps:');
    console.log('   1. Open the URL above in your browser');
    console.log('   2. Enter the shipping address when prompted:');
    console.log(`      ${city}, ${state} ${zip}`);
    console.log('   3. Wait for Parcelcraft to calculate UPS shipping rates dynamically');
    console.log('   4. Check if UPS Ground shows correct transit time (not always 1 day)');
    console.log('   5. After selecting a shipping option, run:');
    console.log(`      yarn tsx scripts/check-parcelcraft-transit-times.ts ${session.id}\n`);

    console.log('💡 Tip: Try different addresses to test:');
    console.log('   - Local (same state): Should show 1-2 days');
    console.log('   - Cross-country (CA to NY): Should show 4-7 days');
    console.log('   - Remote area: Should show 5-8 days\n');

    console.log('─'.repeat(80));
    console.log(`\n🔍 To check this session later, run:`);
    console.log(`   yarn tsx scripts/check-parcelcraft-transit-times.ts ${session.id}\n`);
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Check your Stripe API key and account settings.');
    }
    process.exit(1);
  }
}

createTestCheckout();
