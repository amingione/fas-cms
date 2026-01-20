/**
 * Parcelcraft Diagnostic Script
 *
 * This script checks your Stripe account for configurations that might
 * prevent Parcelcraft from injecting dynamic shipping rates.
 *
 * Run: tsx scripts/parcelcraft-diagnostic.ts
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion
});

async function main() {
  console.log('🔍 Parcelcraft Diagnostic Report\n');
  console.log('='.repeat(60));

  // 1. Check for static shipping rates
  console.log('\n1. Checking for static shipping rates...');
  try {
    const shippingRates = await stripe.shippingRates.list({ limit: 100 });

    if (shippingRates.data.length === 0) {
      console.log('   ✅ No static shipping rates found (Good for Parcelcraft)');
    } else {
      console.log(`   ⚠️  Found ${shippingRates.data.length} static shipping rate(s):`);
      shippingRates.data.forEach((rate) => {
        console.log(`      - ${rate.display_name} (${rate.id})`);
        console.log(`        Type: ${rate.type}`);
        console.log(`        Active: ${rate.active}`);
        console.log(
          `        Amount: $${rate.fixed_amount?.amount ? rate.fixed_amount.amount / 100 : 'N/A'}`
        );
      });
      console.log('\n   ⛔ CRITICAL: Static shipping rates prevent Parcelcraft from working!');
      console.log('   ACTION REQUIRED: Delete these rates in Stripe Dashboard:');
      console.log('   https://dashboard.stripe.com/settings/shipping-rates');
      console.log('   OR run: tsx scripts/delete-static-shipping-rates.ts');
    }
  } catch (err) {
    console.error('   ❌ Error checking shipping rates:', err);
  }

  // 2. Check Parcelcraft app installation
  console.log('\n2. Checking Parcelcraft app installation...');
  console.log('   ℹ️  This requires manual verification in Stripe Dashboard:');
  console.log('   Go to: https://dashboard.stripe.com/apps');
  console.log('   Verify: "Parcelcraft" is listed and shows "Installed"');
  console.log('   Then go to: https://dashboard.stripe.com/apps/parcelcraft/settings');
  console.log('   Verify: Your shipping carriers (UPS, USPS, FedEx) are configured');

  // 3. Check recent checkout sessions
  console.log('\n3. Checking recent checkout sessions...');
  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 5,
      expand: ['data.line_items.data.price.product']
    });

    if (sessions.data.length === 0) {
      console.log('   ℹ️  No recent checkout sessions found');
    } else {
      console.log(`   Found ${sessions.data.length} recent session(s):\n`);

      for (const session of sessions.data) {
        console.log(`   Session: ${session.id}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   UI Mode: ${session.ui_mode}`);
        console.log(`   Shipping Options: ${session.shipping_options?.length || 0}`);
        console.log(
          `   Shipping Cost: ${session.shipping_cost ? `$${session.shipping_cost.amount_total / 100}` : 'null'}`
        );
        console.log(`   Has Shipping Address Collection: ${!!session.shipping_address_collection}`);
        console.log(
          `   Invoice Creation: ${session.invoice_creation?.enabled ? 'Enabled' : 'Disabled'}`
        );

        // Check line items for shipping metadata
        if (session.line_items?.data) {
          for (const item of session.line_items.data) {
            const product = typeof item.price?.product === 'object' ? item.price.product : null;
            if (product && !('deleted' in product)) {
              const metadata = product.metadata || {};
              console.log(`   \n   Product: ${product.name}`);
              console.log(`     Type: ${product.type}`);
              console.log(`     Shippable: ${product.shippable}`);
              console.log(`     Metadata:`);
              console.log(
                `       - shipping_required: ${metadata.shipping_required || 'missing ❌'}`
              );
              console.log(`       - weight: ${metadata.weight || 'missing ❌'}`);
              console.log(`       - weight_unit: ${metadata.weight_unit || 'missing ❌'}`);
              console.log(`       - origin_country: ${metadata.origin_country || 'missing ❌'}`);
              console.log(
                `       - dimensions: ${metadata.length ? `${metadata.length}x${metadata.width}x${metadata.height} ${metadata.dimension_unit}` : 'missing ❌'}`
              );

              if (!metadata.shipping_required || !metadata.weight || !metadata.origin_country) {
                console.log(`     ⚠️  Missing required Parcelcraft metadata!`);
              } else {
                console.log(`     ✅ Has all required Parcelcraft metadata`);
              }
            }
          }
        }
        console.log('');
      }
    }
  } catch (err) {
    console.error('   ❌ Error checking sessions:', err);
  }

  // 4. Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 SUMMARY & RECOMMENDATIONS:\n');
  console.log('For Parcelcraft to work, you MUST:');
  console.log('  1. ✅ Delete ALL static shipping rates from Stripe Dashboard');
  console.log('  2. ✅ Install Parcelcraft app from Stripe App Marketplace');
  console.log('  3. ✅ Configure your carriers in Parcelcraft settings');
  console.log('  4. ✅ Ensure products have type="good" (not "service")');
  console.log(
    '  5. ✅ Ensure products have all metadata: shipping_required, weight, origin_country'
  );
  console.log('  6. ✅ Use ui_mode="embedded" in Checkout Session');
  console.log('  7. ✅ Enable invoice_creation in Checkout Session');
  console.log('  8. ✅ Set shipping_address_collection in Checkout Session');
  console.log('  9. ✅ Set permissions.update_shipping_details="server_only"');
  console.log("\nIf all above are correct and shipping rates still don't appear:");
  console.log('  - Check Parcelcraft logs in Stripe Dashboard (Apps → Parcelcraft → Logs)');
  console.log('  - Verify carrier API keys are valid in Parcelcraft settings');
  console.log('  - Contact Parcelcraft support with your session ID');

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
