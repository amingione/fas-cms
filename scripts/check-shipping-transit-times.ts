#!/usr/bin/env tsx
/**
 * Check Stripe Checkout shipping rate details for a session.
 *
 * Usage:
 *   yarn tsx scripts/check-shipping-transit-times.ts <checkout_session_id>
 *
 * Example:
 *   yarn tsx scripts/check-shipping-transit-times.ts cs_test_abc123
 */

import 'dotenv/config';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('❌ Please provide a Stripe Checkout Session ID');
  console.error('   Usage: tsx scripts/check-shipping-transit-times.ts <session_id>');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion
});

async function checkTransitTimes() {
  try {
    console.log(`\n🔍 Checking Checkout Session: ${sessionId}\n`);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['shipping_cost.shipping_rate']
    });

    console.log('📦 Shipping Information:');
    console.log('─'.repeat(60));

    const shippingCost = session.shipping_cost;
    if (!shippingCost) {
      console.log('⚠️  No shipping cost found in session');
      return;
    }

    const shippingRate =
      typeof shippingCost.shipping_rate === 'string'
        ? await stripe.shippingRates.retrieve(shippingCost.shipping_rate)
        : shippingCost.shipping_rate;

    if (!shippingRate) {
      console.log('⚠️  No shipping rate found');
      return;
    }

    console.log(`\n✅ Shipping Rate: ${shippingRate.display_name}`);
    console.log(`   ID: ${shippingRate.id}`);
    console.log(`   Type: ${shippingRate.type}`);
    console.log(`   Amount: $${(shippingCost.amount_total / 100).toFixed(2)}`);

    const deliveryEstimate = shippingRate.delivery_estimate;
    if (deliveryEstimate) {
      console.log(`\n📅 Delivery Estimate:`);
      if (deliveryEstimate.minimum) {
        console.log(`   Minimum: ${deliveryEstimate.minimum.unit} ${deliveryEstimate.minimum.value}`);
      }
      if (deliveryEstimate.maximum) {
        console.log(`   Maximum: ${deliveryEstimate.maximum.unit} ${deliveryEstimate.maximum.value}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error checking session:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('   Check that STRIPE_SECRET_KEY is correct and has access to checkout sessions.');
    }
    process.exit(1);
  }
}

checkTransitTimes();
