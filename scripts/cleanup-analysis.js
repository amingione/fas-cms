#!/usr/bin/env node

/**
 * FAS Codebase Cleanup Analysis
 *
 * Scans for legacy code that can be safely removed after unified checkout migration
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

const reset = '\x1b[0m';
const bright = '\x1b[1m';
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const cyan = '\x1b[36m';

function section(title) {
  console.log(`\n${bright}${cyan}${title}${reset}`);
  console.log('─'.repeat(60));
}

function item(label, status = 'info') {
  const prefix = {
    remove: `${red}✗ REMOVE${reset}`,
    keep: `${green}✓ KEEP${reset}`,
    review: `${yellow}? REVIEW${reset}`,
    info: `${blue}→${reset}`
  }[status];
  console.log(`${prefix} ${label}`);
}

// Recursively find files
function findFiles(dir, pattern, results = []) {
  if (!existsSync(dir)) return results;

  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      findFiles(filePath, pattern, results);
    } else if (pattern.test(file)) {
      results.push(filePath.replace(rootDir + '/', ''));
    }
  }

  return results;
}

// Check if file contains specific patterns
function containsPattern(filePath, patterns) {
  try {
    const content = readFileSync(join(rootDir, filePath), 'utf-8');
    return patterns.some(pattern => content.includes(pattern));
  } catch {
    return false;
  }
}

console.log(`${bright}${cyan}FAS Checkout Migration - Cleanup Analysis${reset}\n`);

// ============================================
// 1. Duplicate Checkout Routes
// ============================================
section('1. Duplicate Checkout Routes (CONFLICT)');

const checkoutDir = join(rootDir, 'src/pages/checkout');
if (existsSync(checkoutDir)) {
  item('src/pages/checkout/index.astro (OLD - Stripe Checkout Sessions)', 'remove');
  item('src/pages/checkout/index-with-toggle.astro (OLD - variant)', 'remove');
  item('src/pages/checkout/success.astro (OLD - replaced by order/confirmation)', 'remove');
  item('src/pages/checkout/cancel.astro (OLD - not needed with Elements)', 'remove');
  item('src/pages/checkout/return.astro (OLD - not needed)', 'remove');
  item('src/pages/checkout/quick/ directory (OLD)', 'remove');
} else {
  item('No old checkout directory found', 'info');
}

item('src/pages/checkout.astro (NEW - Stripe Elements)', 'keep');
item('src/pages/order/confirmation.astro (NEW)', 'keep');

// ============================================
// 2. Legacy API Routes
// ============================================
section('2. Legacy API Routes');

const legacyRoutes = [
  'src/pages/api/legacy/stripe/create-checkout-session.ts',
  'src/pages/api/legacy/medusa/checkout'
];

for (const route of legacyRoutes) {
  if (existsSync(join(rootDir, route))) {
    item(route + ' (already in legacy folder)', 'remove');
  }
}

// Empty directories
const emptyDirs = [
  'src/pages/api/stripe',
  'src/pages/api/medusa/payments'
];

for (const dir of emptyDirs) {
  const fullPath = join(rootDir, dir);
  if (existsSync(fullPath)) {
    const files = readdirSync(fullPath);
    if (files.length === 0) {
      item(dir + ' (empty directory)', 'remove');
    }
  }
}

// New unified checkout routes
item('src/pages/api/create-payment-intent.ts (NEW)', 'keep');
item('src/pages/api/shipping-rates.ts (NEW)', 'keep');
item('src/pages/api/update-payment-intent.ts (NEW)', 'keep');
item('src/pages/api/cart/[id].ts (NEW)', 'keep');
item('src/pages/api/complete-order.ts (NEW)', 'keep');

// ============================================
// 3. Netlify Functions (if any)
// ============================================
section('3. Netlify Functions');

const netlifyDir = join(rootDir, 'netlify/functions');
if (existsSync(netlifyDir)) {
  const functions = readdirSync(netlifyDir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .filter(f => f.includes('checkout') || f.includes('stripe-checkout'));

  if (functions.length > 0) {
    for (const fn of functions) {
      item(`netlify/functions/${fn} (check if still needed)`, 'review');
    }
  } else {
    item('No checkout-related Netlify functions found', 'info');
  }
} else {
  item('No netlify/functions directory', 'info');
}

// ============================================
// 4. Components
// ============================================
section('4. Components');

const componentsDir = join(rootDir, 'src/components');
if (existsSync(componentsDir)) {
  const checkoutComponents = findFiles(componentsDir, /checkout|payment|stripe/i);

  for (const component of checkoutComponents) {
    if (component.includes('checkout/CheckoutForm')) {
      item(component + ' (NEW - Stripe Elements)', 'keep');
    } else if (component.includes('checkout/')) {
      item(component + ' (check if old checkout component)', 'review');
    }
  }
}

// ============================================
// 5. Environment Variables
// ============================================
section('5. Environment Variables Audit');

const envPath = join(rootDir, '.env.example');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');

  // Variables that might be unused now
  const potentiallyUnused = [
    'STRIPE_CHECKOUT_SUCCESS_URL',
    'STRIPE_CHECKOUT_CANCEL_URL',
    'NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED',
    'STRIPE_CHECKOUT_MODE',
    'STRIPE_AUTOMATIC_TAX'
  ];

  const found = [];
  for (const varName of potentiallyUnused) {
    if (envContent.includes(varName)) {
      found.push(varName);
    }
  }

  if (found.length > 0) {
    item('Found potentially unused Checkout Sessions variables:', 'review');
    for (const varName of found) {
      item(`  ${varName}`, 'review');
    }
  } else {
    item('No obvious Checkout Sessions variables found', 'info');
  }

  // Check for STRIPE_SHIPPING_WEBHOOK_SECRET (may be duplicate)
  if (envContent.includes('STRIPE_SHIPPING_WEBHOOK_SECRET')) {
    item('STRIPE_SHIPPING_WEBHOOK_SECRET (may duplicate STRIPE_WEBHOOK_SECRET)', 'review');
  }
} else {
  item('.env.example not found', 'info');
}

// ============================================
// 6. Code References
// ============================================
section('6. Code References to Old Patterns');

// Find files that reference old checkout
const srcFiles = findFiles(join(rootDir, 'src'), /\.(ts|tsx|astro|js|jsx)$/);
let checkoutSessionRefs = 0;
let checkoutPageRefs = 0;

for (const file of srcFiles) {
  const content = readFileSync(join(rootDir, file), 'utf-8');

  if (content.includes('createCheckoutSession') ||
      content.includes('checkout_session') ||
      content.includes('stripe.checkout.sessions')) {
    checkoutSessionRefs++;
  }

  if (content.includes('/checkout/success') ||
      content.includes('/checkout/cancel')) {
    checkoutPageRefs++;
  }
}

if (checkoutSessionRefs > 0) {
  item(`${checkoutSessionRefs} files reference Checkout Sessions API`, 'review');
  item('These files may need updating to use Payment Intents', 'review');
}

if (checkoutPageRefs > 0) {
  item(`${checkoutPageRefs} files reference old /checkout/success or /checkout/cancel`, 'review');
  item('Update redirects to use /order/confirmation', 'review');
}

// ============================================
// Summary
// ============================================
section('Summary & Recommendations');

console.log(`
${bright}Safe to Remove:${reset}
  • src/pages/checkout/ directory (entire old checkout)
  • src/pages/api/legacy/ directory (if confirmed not used)
  • Empty API directories (stripe, medusa/payments)
  • Unused environment variables from .env.example

${bright}Keep (New Unified Checkout):${reset}
  • src/pages/checkout.astro
  • src/pages/order/confirmation.astro
  • src/pages/api/create-payment-intent.ts
  • src/pages/api/shipping-rates.ts
  • src/pages/api/update-payment-intent.ts
  • src/pages/api/cart/[id].ts
  • src/pages/api/complete-order.ts
  • src/components/checkout/CheckoutForm.tsx
  • src/components/checkout/CheckoutForm.css

${bright}Review Before Removing:${reset}
  • Netlify functions (check if still needed)
  • Code references to old checkout URLs
  • Code using Checkout Sessions API

${bright}Next Steps:${reset}
  1. Create backup: ${cyan}git checkout -b backup-old-checkout${reset}
  2. Run removal script: ${cyan}node scripts/cleanup-old-checkout.js${reset}
  3. Test new checkout works: ${cyan}npm run dev${reset}
  4. Commit cleanup: ${cyan}git commit -m "Remove old Checkout Sessions code"${reset}
`);
