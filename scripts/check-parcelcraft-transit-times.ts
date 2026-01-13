#!/usr/bin/env tsx
/**
 * Script to check what transit times Parcelcraft is sending for UPS Ground
 * 
 * Usage:
 *   yarn tsx scripts/check-parcelcraft-transit-times.ts <checkout_session_id>
 * 
 * Example:
 *   yarn tsx scripts/check-parcelcraft-transit-times.ts cs_test_abc123
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
  console.error('   Usage: tsx scripts/check-parcelcraft-transit-times.ts <session_id>');
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

    // Check delivery estimate
    const deliveryEstimate = shippingRate.delivery_estimate;
    if (deliveryEstimate) {
      console.log(`\n📅 Delivery Estimate:`);
      if (deliveryEstimate.minimum) {
        console.log(`   Minimum: ${deliveryEstimate.minimum.unit} ${deliveryEstimate.minimum.value}`);
      }
      if (deliveryEstimate.maximum) {
        console.log(`   Maximum: ${deliveryEstimate.maximum.unit} ${deliveryEstimate.maximum.value}`);
      }
      
      // Check if it's always 1 day
      const minDays = deliveryEstimate.minimum?.value || 0;
      const maxDays = deliveryEstimate.maximum?.value || 0;
      
      if (minDays === 1 && maxDays === 1) {
        console.log(`\n⚠️  WARNING: Transit time is hardcoded to 1 day!`);
        console.log(`   This suggests Parcelcraft is not using dynamic UPS transit times.`);
        console.log(`   Check Parcelcraft settings in Stripe Dashboard.`);
      } else if (minDays === maxDays) {
        console.log(`\n⚠️  WARNING: Min and max transit times are the same (${minDays} days)`);
        console.log(`   This may indicate a configuration issue.`);
      } else {
        console.log(`\n✅ Transit time range looks correct (${minDays}-${maxDays} days)`);
      }
    } else {
      console.log(`\n⚠️  No delivery estimate found in shipping rate`);
      console.log(`   Parcelcraft may not be providing transit time data.`);
    }

    // Check metadata
    const metadata = shippingRate.metadata || {};
    if (Object.keys(metadata).length > 0) {
      console.log(`\n📋 Shipping Rate Metadata:`);
      Object.entries(metadata).forEach(([key, value]) => {
        if (key.includes('delivery') || key.includes('transit') || key.includes('days')) {
          console.log(`   ${key}: ${value}`);
        }
      });
    }

    // Check session metadata
    const sessionMetadata = session.metadata || {};
    const deliveryDays = sessionMetadata.shipping_delivery_days;
    const estimatedDate = sessionMetadata.shipping_estimated_delivery_date;
    
    if (deliveryDays || estimatedDate) {
      console.log(`\n📋 Session Metadata:`);
      if (deliveryDays) {
        console.log(`   shipping_delivery_days: ${deliveryDays}`);
        if (deliveryDays === '1') {
          console.log(`   ⚠️  WARNING: Always showing 1 day in metadata!`);
        }
      }
      if (estimatedDate) {
        console.log(`   shipping_estimated_delivery_date: ${estimatedDate}`);
      }
    }

    // Check shipping address
    const shippingAddress = session.shipping_details?.address;
    if (shippingAddress) {
      console.log(`\n📍 Shipping Address:`);
      console.log(`   ${shippingAddress.line1 || ''}`);
      if (shippingAddress.line2) console.log(`   ${shippingAddress.line2}`);
      console.log(`   ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`);
      console.log(`   ${shippingAddress.country}`);
    }

    console.log(`\n${'─'.repeat(60)}\n`);

  } catch (error: any) {
    console.error('❌ Error checking session:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Make sure the session ID is correct and you have access to it.');
    }
    process.exit(1);
  }
}

checkTransitTimes();
