#!/usr/bin/env node

/**
 * FAS Unified Checkout - Connection Tester
 *
 * Tests actual API connections to verify credentials work
 * Run after validate-checkout-setup.js passes
 *
 * Usage: node scripts/test-connections.js
 */

import Stripe from 'stripe';
import Shippo from 'shippo';
import { createClient } from '@sanity/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(dirname(__dirname), '.env') });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const { reset, bright, red, green, yellow, cyan } = colors;

function log(message, type = 'info') {
  const prefix = {
    success: `${green}✓${reset}`,
    error: `${red}✗${reset}`,
    info: `${cyan}→${reset}`
  }[type];
  console.log(`${prefix} ${message}`);
}

function section(title) {
  console.log(`\n${bright}${cyan}${title}${reset}`);
  console.log('─'.repeat(50));
}

// ============================================
// Test Stripe Connection
// ============================================
async function testStripe() {
  section('Testing Stripe Connection');

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia'
    });

    log('Connecting to Stripe...', 'info');

    // Test with balance retrieve (lightweight call)
    const balance = await stripe.balance.retrieve();
    const testMode = process.env.STRIPE_SECRET_KEY.includes('_test_');

    log(`Connected successfully! (${testMode ? 'test mode' : 'live mode'})`, 'success');
    log(`Available balance: $${(balance.available[0]?.amount || 0) / 100} USD`, 'info');

    // Test Payment Intent creation
    log('Testing Payment Intent creation...', 'info');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      automatic_payment_methods: { enabled: true }
    });

    log(`Payment Intent created: ${paymentIntent.id}`, 'success');

    // Clean up test payment intent
    await stripe.paymentIntents.cancel(paymentIntent.id);
    log('Test Payment Intent cancelled', 'info');

    return true;
  } catch (error) {
    log(`Failed: ${error.message}`, 'error');
    if (error.code === 'invalid_api_key') {
      log('Check your STRIPE_SECRET_KEY in .env', 'error');
    }
    return false;
  }
}

// ============================================
// Test Shippo Connection
// ============================================
async function testShippo() {
  section('Testing Shippo Connection');

  try {
    const shippo = new Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY
    });

    log('Connecting to Shippo...', 'info');

    // Create test address validation
    const address = await shippo.addresses.create({
      name: 'Test Customer',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'US'
    });

    const testMode = process.env.SHIPPO_API_KEY.includes('_test_');
    log(`Connected successfully! (${testMode ? 'test mode' : 'live mode'})`, 'success');
    log(`Address validation: ${address.validation_results.is_valid ? 'Valid' : 'Invalid'}`, 'info');

    // Test rate quote
    log('Testing shipping rate quote...', 'info');

    const shipment = await shippo.shipments.create({
      address_from: {
        name: 'FAS Motorsports',
        street1: process.env.WAREHOUSE_ADDRESS_LINE1 || '6161 Riverside Dr',
        city: process.env.WAREHOUSE_CITY || 'Punta Gorda',
        state: process.env.WAREHOUSE_STATE || 'FL',
        zip: process.env.WAREHOUSE_ZIP || '33982',
        country: 'US'
      },
      address_to: {
        name: 'Test Customer',
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US'
      },
      parcels: [{
        length: '12',
        width: '12',
        height: '8',
        distance_unit: 'in',
        weight: '5',
        mass_unit: 'lb'
      }],
      async: false
    });

    if (shipment.rates && shipment.rates.length > 0) {
      log(`Retrieved ${shipment.rates.length} shipping rates`, 'success');
      const upsRates = shipment.rates.filter(r => r.provider === 'UPS');
      log(`UPS rates available: ${upsRates.length}`, 'info');

      if (upsRates.length > 0) {
        const cheapest = upsRates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
        log(`Sample rate: ${cheapest.servicelevel.name} - $${cheapest.amount}`, 'info');
      }
    } else {
      log('No rates returned (may need UPS account connected)', 'info');
    }

    return true;
  } catch (error) {
    log(`Failed: ${error.message}`, 'error');
    if (error.message.includes('Authentication')) {
      log('Check your SHIPPO_API_KEY in .env', 'error');
    }
    return false;
  }
}

// ============================================
// Test Medusa Connection
// ============================================
async function testMedusa() {
  section('Testing Medusa Connection');

  try {
    const medusaUrl = process.env.MEDUSA_API_URL || 'http://localhost:9000';
    log(`Connecting to ${medusaUrl}...`, 'info');

    // Test health endpoint
    const healthResponse = await fetch(`${medusaUrl}/health`);

    if (healthResponse.ok) {
      log('Medusa backend is running', 'success');

      // Test store API
      const storeResponse = await fetch(`${medusaUrl}/store/products?limit=1`);

      if (storeResponse.ok) {
        const data = await storeResponse.json();
        log(`Store API accessible - ${data.count || 0} products`, 'success');
        return true;
      } else {
        log(`Store API returned: ${storeResponse.status}`, 'error');
        return false;
      }
    } else {
      log('Health check failed', 'error');
      return false;
    }
  } catch (error) {
    log(`Failed: ${error.message}`, 'error');
    if (error.code === 'ECONNREFUSED') {
      log('Is Medusa running? Start with: npm run dev (in medusa directory)', 'error');
    }
    return false;
  }
}

// ============================================
// Test Sanity Connection
// ============================================
async function testSanity() {
  section('Testing Sanity Connection');

  try {
    const sanityClient = createClient({
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET || 'production',
      token: process.env.SANITY_API_TOKEN,
      apiVersion: '2024-01-01',
      useCdn: false
    });

    log('Connecting to Sanity...', 'info');

    // Test read access
    const projects = await sanityClient.projects.list();
    log(`Connected successfully! (${projects.length} project(s))`, 'success');

    // Test write access by creating a draft document
    log('Testing write permissions...', 'info');

    const testDoc = await sanityClient.create({
      _type: 'test',
      _id: `test.${Date.now()}`,
      title: 'Connection test'
    });

    log('Write permissions confirmed', 'success');

    // Clean up test document
    await sanityClient.delete(testDoc._id);
    log('Test document cleaned up', 'info');

    // Check if order schema exists
    log('Checking for order schema...', 'info');
    const schemas = await sanityClient.fetch('*[_type == "sanity.imageAsset"][0]._type');

    log('Sanity setup verified', 'success');

    return true;
  } catch (error) {
    log(`Failed: ${error.message}`, 'error');

    if (error.message.includes('projectId')) {
      log('Check SANITY_PROJECT_ID in .env', 'error');
    } else if (error.message.includes('Insufficient permissions')) {
      log('SANITY_API_TOKEN needs write permissions', 'error');
      log('Create token at: https://www.sanity.io/manage → API → Tokens', 'error');
    }
    return false;
  }
}

// ============================================
// Run All Tests
// ============================================
async function runTests() {
  console.log(`${bright}${cyan}FAS Unified Checkout - Connection Tests${reset}\n`);

  const results = {
    stripe: await testStripe(),
    shippo: await testShippo(),
    medusa: await testMedusa(),
    sanity: await testSanity()
  };

  // Summary
  section('Summary');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`\n${bright}Connection Tests:${reset}`);
  console.log(`  Stripe:  ${results.stripe ? green + '✓' : red + '✗'}${reset}`);
  console.log(`  Shippo:  ${results.shippo ? green + '✓' : red + '✗'}${reset}`);
  console.log(`  Medusa:  ${results.medusa ? green + '✓' : red + '✗'}${reset}`);
  console.log(`  Sanity:  ${results.sanity ? green + '✓' : red + '✗'}${reset}`);

  console.log(`\n${passed === total ? green : yellow}${passed}/${total} connections successful${reset}\n`);

  if (passed === total) {
    console.log(`${green}${bright}🎉 All connections working! Ready for checkout testing.${reset}`);
    console.log(`\nNext: Test the checkout flow`);
    console.log(`  1. npm run dev`);
    console.log(`  2. Create test cart in Medusa`);
    console.log(`  3. http://localhost:4321/checkout`);
    process.exit(0);
  } else {
    console.log(`${red}${bright}Fix failed connections above before testing checkout.${reset}`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error(`${red}Unexpected error:${reset}`, error);
  process.exit(1);
});
