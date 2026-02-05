#!/usr/bin/env node

/**
 * FAS Unified Checkout - Setup Validator
 *
 * Checks dependencies, environment variables, and API connections
 * Run before first checkout test to catch configuration issues early
 *
 * Usage: node scripts/validate-checkout-setup.js
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const { reset, bright, red, green, yellow, blue, cyan } = colors;

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: []
};

function log(message, type = 'info') {
  const prefix = {
    success: `${green}✓${reset}`,
    error: `${red}✗${reset}`,
    warning: `${yellow}⚠${reset}`,
    info: `${blue}ℹ${reset}`
  }[type];

  console.log(`${prefix} ${message}`);
}

function section(title) {
  console.log(`\n${bright}${cyan}${title}${reset}`);
  console.log('─'.repeat(50));
}

function check(name, status, message = '') {
  results.checks.push({ name, status, message });

  if (status === 'pass') {
    results.passed++;
    log(`${name}`, 'success');
  } else if (status === 'fail') {
    results.failed++;
    log(`${name}${message ? ': ' + message : ''}`, 'error');
  } else if (status === 'warn') {
    results.warnings++;
    log(`${name}${message ? ': ' + message : ''}`, 'warning');
  }
}

function findPackageVersion(depName) {
  try {
    const pkg = require(`${depName}/package.json`);
    return pkg.version;
  } catch {}

  try {
    const resolved = require.resolve(depName);
    let dir = dirname(resolved);
    while (dir && dir !== dirname(dir)) {
      const pkgPath = join(dir, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg?.name === depName) {
          return pkg.version;
        }
      }
      dir = dirname(dir);
    }
  } catch {}

  return null;
}

// ============================================
// 1. Check Node.js Version
// ============================================
section('1. Node.js Environment');

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion >= 18) {
  check('Node.js version', 'pass', nodeVersion);
} else {
  check('Node.js version', 'fail', `${nodeVersion} - Requires Node 18+`);
}

// ============================================
// 2. Check Dependencies
// ============================================
section('2. Required Dependencies');

const requiredDeps = [
  { name: 'stripe', minVersion: '17.0.0' },
  { name: 'shippo', minVersion: '2.0.0' },
  { name: '@sanity/client', minVersion: '6.0.0' }
];

for (const dep of requiredDeps) {
  const version = findPackageVersion(dep.name);
  if (version) {
    check(`${dep.name}@${version}`, 'pass');
  } else {
    check(dep.name, 'fail', 'Not installed - Run: npm install ' + dep.name);
  }
}

// ============================================
// 3. Check Environment Variables
// ============================================
section('3. Environment Variables');

// Load .env file
const envPath = join(dirname(__dirname), '.env');
let envVars = {};

if (existsSync(envPath)) {
  check('.env file exists', 'pass');

  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = value.trim();
    }
  });
} else {
  check('.env file exists', 'fail', 'Copy .env.example to .env');
}

// Critical environment variables for checkout
const requiredEnvVars = [
  { key: 'PUBLIC_STRIPE_PUBLISHABLE_KEY', prefix: 'pk_', description: 'Stripe publishable key' },
  { key: 'STRIPE_SECRET_KEY', prefix: 'sk_', description: 'Stripe secret key' },
  { key: 'SHIPPO_API_KEY', prefix: 'shippo_', description: 'Shippo API key' },
  { key: 'MEDUSA_API_URL', description: 'Medusa backend URL' },
  { key: 'SANITY_PROJECT_ID', description: 'Sanity project ID' },
  { key: 'SANITY_DATASET', description: 'Sanity dataset' },
  { key: 'SANITY_API_TOKEN', prefix: 'sk', description: 'Sanity API token (write access)' }
];

for (const envVar of requiredEnvVars) {
  const value = envVars[envVar.key];

  if (!value || value.startsWith('YOUR_')) {
    check(envVar.key, 'fail', 'Missing or placeholder value');
  } else if (envVar.prefix && !value.startsWith(envVar.prefix)) {
    check(envVar.key, 'warn', `Should start with "${envVar.prefix}"`);
  } else {
    check(envVar.key, 'pass');
  }
}

// Warehouse address
const warehouseVars = ['WAREHOUSE_ADDRESS_LINE1', 'WAREHOUSE_CITY', 'WAREHOUSE_STATE', 'WAREHOUSE_ZIP'];
const warehouseConfigured = warehouseVars.every(key => envVars[key] && !envVars[key].startsWith('YOUR_'));

if (warehouseConfigured) {
  check('Warehouse address configured', 'pass');
} else {
  check('Warehouse address', 'warn', 'Using defaults - update for accurate shipping rates');
}

// ============================================
// 4. Test API Connections
// ============================================
section('4. API Connection Tests');

console.log(`${yellow}Note: API tests require valid credentials${reset}\n`);

// Test Stripe connection
if (envVars.STRIPE_SECRET_KEY && !envVars.STRIPE_SECRET_KEY.startsWith('YOUR_')) {
  try {
    const testMode = envVars.STRIPE_SECRET_KEY.includes('_test_');
    const modeLabel = testMode ? '(test mode)' : '(live mode)';
    check(`Stripe connection ${modeLabel}`, 'pass', 'Run actual test with: node scripts/test-stripe.js');
  } catch (error) {
    check('Stripe connection', 'fail', error.message);
  }
} else {
  check('Stripe connection', 'fail', 'Configure STRIPE_SECRET_KEY first');
}

// Test Shippo connection
if (envVars.SHIPPO_API_KEY && !envVars.SHIPPO_API_KEY.startsWith('YOUR_')) {
  const testMode = envVars.SHIPPO_API_KEY.includes('_test_');
  const modeLabel = testMode ? '(test mode)' : '(live mode)';
  check(`Shippo connection ${modeLabel}`, 'pass', 'Run actual test with: node scripts/test-shippo.js');
} else {
  check('Shippo connection', 'fail', 'Configure SHIPPO_API_KEY first');
}

// Test Medusa connection
if (envVars.MEDUSA_API_URL && !envVars.MEDUSA_API_URL.startsWith('YOUR_')) {
  const isLocalhost = envVars.MEDUSA_API_URL.includes('localhost');
  const note = isLocalhost ? '(ensure Medusa is running)' : '';
  check(`Medusa backend ${note}`, 'pass', 'Run actual test with: node scripts/test-medusa.js');
} else {
  check('Medusa connection', 'fail', 'Configure MEDUSA_API_URL first');
}

// Test Sanity connection
if (envVars.SANITY_PROJECT_ID && !envVars.SANITY_PROJECT_ID.startsWith('YOUR_')) {
  check('Sanity project', 'pass', 'Run actual test with: node scripts/test-sanity.js');
} else {
  check('Sanity connection', 'fail', 'Configure SANITY_PROJECT_ID first');
}

// ============================================
// 5. Check File Structure
// ============================================
section('5. Checkout Files');

const requiredFiles = [
  'src/pages/checkout.astro',
  'src/components/checkout/CheckoutForm.tsx',
  'src/components/checkout/CheckoutForm.css',
  'src/pages/order/confirmation.astro',
  'src/pages/api/create-payment-intent.ts',
  'src/pages/api/shipping-rates.ts',
  'src/pages/api/update-payment-intent.ts',
  'src/pages/api/cart/[id].ts',
  'src/pages/api/complete-order.ts'
];

for (const file of requiredFiles) {
  const filePath = join(dirname(__dirname), file);
  if (existsSync(filePath)) {
    check(file, 'pass');
  } else {
    check(file, 'fail', 'File missing');
  }
}

// ============================================
// Summary
// ============================================
section('Summary');

console.log(`
${bright}Results:${reset}
  ${green}✓ Passed:${reset}   ${results.passed}
  ${red}✗ Failed:${reset}   ${results.failed}
  ${yellow}⚠ Warnings:${reset} ${results.warnings}
`);

if (results.failed === 0 && results.warnings === 0) {
  console.log(`${green}${bright}🎉 All checks passed! Ready to test checkout.${reset}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Start dev server:  ${cyan}npm run dev${reset}`);
  console.log(`  2. Create test cart in Medusa`);
  console.log(`  3. Navigate to:       ${cyan}http://localhost:4321/checkout${reset}`);
  console.log(`  4. Test with card:    ${cyan}4242 4242 4242 4242${reset}`);
  process.exit(0);
} else if (results.failed === 0) {
  console.log(`${yellow}${bright}⚠ Setup complete with warnings.${reset}`);
  console.log(`Review warnings above and update configuration if needed.`);
  process.exit(0);
} else {
  console.log(`${red}${bright}❌ Setup incomplete. Fix errors above before testing.${reset}`);
  console.log(`\nQuick fixes:`);
  console.log(`  • Missing dependencies:  ${cyan}npm install stripe shippo @sanity/client${reset}`);
  console.log(`  • Missing .env:          ${cyan}cp .env.example .env${reset}`);
  console.log(`  • Update .env with your API keys from:`);
  console.log(`    - Stripe:  https://dashboard.stripe.com/apikeys`);
  console.log(`    - Shippo:  https://apps.goshippo.com/settings/api`);
  console.log(`    - Sanity:  https://www.sanity.io/manage`);
  process.exit(1);
}
