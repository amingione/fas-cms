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

// Mirror the storefront's shipping logic
const resolveBooleanEnv = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const useDynamicShippingRates = (() => {
  const raw = process.env.STRIPE_USE_DYNAMIC_SHIPPING_RATES;
  if (raw === undefined) return true; // Default to true (dynamic)
  return resolveBooleanEnv(raw);
})();

const UPS_CARRIER_REGEX = /\bups\b/i;

const resolveShippingCarrierLabel = (rate: Stripe.ShippingRate): string => {
  const meta = (rate.metadata || {}) as Record<string, string | undefined>;
  return (
    meta.shipping_carrier ||
    meta.carrier ||
    meta.shipping_carrier_id ||
    meta.carrier_id ||
    rate.display_name ||
    ''
  );
};

async function filterUpsShippingRateIds(rateIds: string[]): Promise<string[]> {
  if (!rateIds.length) return [];
  const entries = await Promise.all(
    rateIds.map(async (rateId) => {
      try {
        const rate = await stripe.shippingRates.retrieve(rateId);
        const label = resolveShippingCarrierLabel(rate).trim();
        const isUps = UPS_CARRIER_REGEX.test(label);
        return { id: rateId, isUps, label };
      } catch (error) {
        console.warn('[test-checkout] Failed to load Stripe shipping rate', rateId, error);
        return { id: rateId, isUps: false, label: '' };
      }
    })
  );
  return entries.filter((entry) => entry.isUps).map((entry) => entry.id);
}

async function createTestCheckout() {
  try {
    console.log(`\n🛒 Creating test Checkout Session with shipping...\n`);
    console.log(`📍 Shipping Address: ${city}, ${state} ${zip}\n`);
    console.log(`⚙️  Shipping Mode: ${useDynamicShippingRates ? 'Dynamic (Parcelcraft)' : 'Static (STRIPE_SHIPPING_RATE_IDS)'}\n`);

    // Mirror storefront shipping logic
    const configuredShippingRateIds = useDynamicShippingRates
      ? []
      : String(process.env.STRIPE_SHIPPING_RATE_IDS || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);

    const allowedShippingRateIds =
      configuredShippingRateIds.length
        ? await filterUpsShippingRateIds(configuredShippingRateIds)
        : [];

    if (!useDynamicShippingRates && configuredShippingRateIds.length && !allowedShippingRateIds.length) {
      console.error('❌ UPS-only shipping is enforced, but no UPS Stripe shipping rates are configured.');
      console.error('   Update STRIPE_SHIPPING_RATE_IDS with UPS rates, or set STRIPE_USE_DYNAMIC_SHIPPING_RATES=true');
      process.exit(1);
    }

    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] | undefined =
      useDynamicShippingRates
        ? undefined // Let Parcelcraft handle dynamic rates (matches storefront)
        : allowedShippingRateIds.length
          ? allowedShippingRateIds.map((id) => ({ shipping_rate: id }))
          : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product for Shipping',
              description: 'Test product to verify Parcelcraft transit times'
            },
            unit_amount: 10000 // $100.00
          },
          quantity: 1
        }
      ],
      shipping_address_collection: {
        allowed_countries: ['US']
      },
      ...(shippingOptions ? { shipping_options: shippingOptions } : {}),
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
    
    console.log('📝 Next Steps:');
    console.log('   1. Open the URL above in your browser');
    console.log('   2. Enter the shipping address when prompted:');
    console.log(`      ${city}, ${state} ${zip}`);
    if (useDynamicShippingRates) {
      console.log('   3. Wait for Parcelcraft to calculate UPS shipping rates dynamically');
      console.log('   4. Check if UPS Ground shows correct transit time (not always 1 day)');
    } else {
      console.log('   3. Select from the configured UPS shipping rates');
      console.log(`   4. ${allowedShippingRateIds.length} UPS rate(s) available`);
    }
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
