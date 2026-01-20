/**
 * Delete Static Shipping Rates Script
 *
 * This script archives (soft-deletes) all static shipping rates in your Stripe account.
 * This is necessary for Parcelcraft to work, as static rates take precedence over dynamic rates.
 *
 * Run: tsx scripts/delete-static-shipping-rates.ts
 */

import Stripe from 'stripe';
import * as readline from 'readline';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local (fallback to .env)
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion
});

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function main() {
  console.log('🗑️  Delete Static Shipping Rates\n');
  console.log('='.repeat(60));

  // Fetch all shipping rates
  console.log('\n📦 Fetching shipping rates...');
  const shippingRates = await stripe.shippingRates.list({ limit: 100 });

  if (shippingRates.data.length === 0) {
    console.log('✅ No static shipping rates found. Nothing to delete.');
    return;
  }

  console.log(`\nFound ${shippingRates.data.length} shipping rate(s):\n`);

  shippingRates.data.forEach((rate, index) => {
    console.log(`${index + 1}. ${rate.display_name} (${rate.id})`);
    console.log(`   Type: ${rate.type}`);
    console.log(`   Active: ${rate.active}`);
    console.log(
      `   Amount: $${rate.fixed_amount?.amount ? rate.fixed_amount.amount / 100 : 'N/A'}`
    );
    console.log('');
  });

  console.log(
    '⚠️  WARNING: Deleting these rates will make Parcelcraft the ONLY source of shipping rates.'
  );
  console.log('⚠️  Make sure Parcelcraft is installed and configured before proceeding!');
  console.log('');

  const answer = await askQuestion('Do you want to archive (delete) these rates? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Aborted. No changes made.');
    return;
  }

  console.log('\n🗑️  Archiving shipping rates...\n');

  for (const rate of shippingRates.data) {
    try {
      // Stripe doesn't have a true "delete" - we update active to false
      await stripe.shippingRates.update(rate.id, { active: false });
      console.log(`✅ Archived: ${rate.display_name} (${rate.id})`);
    } catch (err) {
      console.error(`❌ Failed to archive ${rate.id}:`, err);
    }
  }

  console.log('\n✅ Done! All shipping rates have been archived.');
  console.log('Parcelcraft should now be able to inject dynamic shipping rates.');
  console.log('\nNext steps:');
  console.log('  1. Verify Parcelcraft is installed: https://dashboard.stripe.com/apps');
  console.log('  2. Configure your carriers in Parcelcraft settings');
  console.log('  3. Test checkout with a shippable product');
}

main().catch(console.error);
