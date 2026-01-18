#!/usr/bin/env tsx
/**
 * List recent Stripe Checkout Sessions to find one for testing transit times
 * 
 * Usage:
 *   yarn tsx scripts/list-recent-checkout-sessions.ts [limit]
 * 
 * Example:
 *   yarn tsx scripts/list-recent-checkout-sessions.ts 10
 */

import 'dotenv/config';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const limit = parseInt(process.argv[2] || '10', 10);

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion
});

async function listSessions() {
  try {
    console.log(`\n🔍 Fetching last ${limit} Checkout Sessions...\n`);
    
    const sessions = await stripe.checkout.sessions.list({
      limit,
      expand: ['data.shipping_cost.shipping_rate']
    });

    if (sessions.data.length === 0) {
      console.log('⚠️  No checkout sessions found.');
      console.log('\n💡 To create a test session:');
      console.log('   1. Go to Stripe Dashboard → Payments → Checkout');
      console.log('   2. Create a test checkout with a shipping address');
      console.log('   3. Copy the session ID (starts with cs_test_ or cs_live_)');
      return;
    }

    console.log(`Found ${sessions.data.length} session(s):\n`);
    console.log('─'.repeat(80));

    sessions.data.forEach((session, index) => {
      console.log(`\n${index + 1}. Session ID: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      
      const shippingCost = session.shipping_cost;
      if (shippingCost) {
        const shippingRate = 
          typeof shippingCost.shipping_rate === 'string'
            ? null // Would need to fetch separately
            : shippingCost.shipping_rate;

        if (shippingRate) {
          console.log(`   Shipping: ${shippingRate.display_name}`);
          
          const deliveryEstimate = shippingRate.delivery_estimate;
          if (deliveryEstimate) {
            const min = deliveryEstimate.minimum?.value || '?';
            const max = deliveryEstimate.maximum?.value || '?';
            const unit = deliveryEstimate.minimum?.unit || deliveryEstimate.maximum?.unit || 'days';
            console.log(`   Transit Time: ${min}-${max} ${unit}`);
            
            if (min === 1 && max === 1) {
              console.log(`   ⚠️  WARNING: Always showing 1 day!`);
            }
          } else {
            console.log(`   ⚠️  No delivery estimate found`);
          }
        } else {
          console.log(`   Shipping: ${shippingCost.amount_total ? `$${(shippingCost.amount_total / 100).toFixed(2)}` : 'N/A'}`);
        }
      } else {
        console.log(`   Shipping: No shipping cost`);
      }

      const shippingDetails = (session as Stripe.Checkout.Session & {
        shipping_details?: { address?: Stripe.Address | null } | null;
      }).shipping_details;
      const shippingAddress = shippingDetails?.address;
      if (shippingAddress) {
        console.log(`   Address: ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`);
      }

      console.log(`\n   To check this session in detail, run:`);
      console.log(`   yarn tsx scripts/check-parcelcraft-transit-times.ts ${session.id}`);
    });

    console.log(`\n${'─'.repeat(80)}\n`);

  } catch (error: any) {
    console.error('❌ Error fetching sessions:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('   Check that STRIPE_SECRET_KEY is correct and has access to checkout sessions.');
    }
    process.exit(1);
  }
}

listSessions();
