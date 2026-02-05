#!/usr/bin/env node

/**
 * FAS Checkout Cleanup Script
 *
 * Safely removes old Stripe Checkout Sessions code after creating backups
 * Run after unified checkout (Stripe Elements) is tested and working
 *
 * Usage: node scripts/cleanup-old-checkout.js
 */

import { unlinkSync, rmdirSync, existsSync, mkdirSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

const reset = '\x1b[0m';
const bright = '\x1b[1m';
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';

let removedCount = 0;
let backupCreated = false;

function log(message, type = 'info') {
  const prefix = {
    success: `${green}✓${reset}`,
    error: `${red}✗${reset}`,
    warning: `${yellow}⚠${reset}`,
    info: `${cyan}→${reset}`
  }[type];
  console.log(`${prefix} ${message}`);
}

function section(title) {
  console.log(`\n${bright}${cyan}${title}${reset}`);
  console.log('─'.repeat(60));
}

// Create backup directory
function createBackup() {
  section('Creating Backup');

  const backupDir = join(rootDir, '.cleanup-backup');

  try {
    if (existsSync(backupDir)) {
      log('Backup directory already exists, cleaning...', 'warning');
      rmdirSync(backupDir, { recursive: true });
    }

    mkdirSync(backupDir, { recursive: true });
    log(`Created backup directory: .cleanup-backup/`, 'success');
    backupCreated = true;
    return backupDir;
  } catch (error) {
    log(`Failed to create backup directory: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Backup and remove a file/directory
function removeWithBackup(relativePath, backupDir) {
  const fullPath = join(rootDir, relativePath);

  if (!existsSync(fullPath)) {
    log(`Already removed: ${relativePath}`, 'info');
    return;
  }

  try {
    // Create backup
    const backupPath = join(backupDir, relativePath);
    mkdirSync(dirname(backupPath), { recursive: true });

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      cpSync(fullPath, backupPath, { recursive: true });
      log(`Backed up directory: ${relativePath}`, 'info');
    } else {
      cpSync(fullPath, backupPath);
      log(`Backed up file: ${relativePath}`, 'info');
    }

    // Remove original
    if (stat.isDirectory()) {
      rmdirSync(fullPath, { recursive: true });
    } else {
      unlinkSync(fullPath);
    }

    log(`Removed: ${relativePath}`, 'success');
    removedCount++;
  } catch (error) {
    log(`Failed to remove ${relativePath}: ${error.message}`, 'error');
  }
}

// Check if git repo is clean
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', {
      cwd: rootDir,
      encoding: 'utf-8'
    });

    if (status.trim()) {
      log('You have uncommitted changes', 'warning');
      log('Recommended: commit changes before running cleanup', 'warning');
      return false;
    }

    return true;
  } catch {
    log('Not a git repository or git not available', 'info');
    return true;
  }
}

console.log(`${bright}${cyan}FAS Checkout Cleanup${reset}\n`);

// Pre-flight checks
section('Pre-flight Checks');

log('Checking git status...', 'info');
const gitClean = checkGitStatus();

log('Checking new checkout files exist...', 'info');
const requiredFiles = [
  'src/pages/checkout.astro',
  'src/pages/order/confirmation.astro',
  'src/pages/api/create-payment-intent.ts',
  'src/pages/api/shipping-rates.ts'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!existsSync(join(rootDir, file))) {
    log(`Missing required file: ${file}`, 'error');
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  log('New checkout files are missing! Aborting cleanup.', 'error');
  process.exit(1);
}

log('All new checkout files present', 'success');

// Confirm before proceeding
console.log(`\n${yellow}This will remove old checkout code and create backups.${reset}`);
console.log(`${yellow}Backups will be saved to: .cleanup-backup/${reset}\n`);

if (!gitClean) {
  console.log(`${red}Warning: You have uncommitted changes!${reset}`);
  console.log(`${yellow}Consider committing or stashing before cleanup.${reset}\n`);
}

// For automation, we'll proceed. In interactive mode, you'd prompt here.
const backup = createBackup();

// ============================================
// 1. Remove Old Checkout Pages
// ============================================
section('Removing Old Checkout Pages');

const oldCheckoutFiles = [
  'src/pages/checkout/index.astro',
  'src/pages/checkout/index-with-toggle.astro',
  'src/pages/checkout/success.astro',
  'src/pages/checkout/cancel.astro',
  'src/pages/checkout/return.astro',
  'src/pages/checkout/quick'
];

for (const file of oldCheckoutFiles) {
  removeWithBackup(file, backup);
}

// Remove checkout directory if empty
const checkoutDir = join(rootDir, 'src/pages/checkout');
if (existsSync(checkoutDir)) {
  try {
    const remaining = readdirSync(checkoutDir);
    if (remaining.length === 0) {
      rmdirSync(checkoutDir);
      log('Removed empty checkout directory', 'success');
    } else {
      log(`Checkout directory not empty (${remaining.length} files remain)`, 'warning');
    }
  } catch (error) {
    log(`Could not remove checkout directory: ${error.message}`, 'warning');
  }
}

// ============================================
// 2. Remove Legacy API Routes
// ============================================
section('Removing Legacy API Routes');

const legacyApiRoutes = [
  'src/pages/api/legacy/stripe/create-checkout-session.ts',
  'src/pages/api/legacy/medusa/checkout',
  'src/pages/api/legacy/stripe',
  'src/pages/api/legacy/medusa',
  'src/pages/api/legacy'
];

for (const route of legacyApiRoutes) {
  removeWithBackup(route, backup);
}

// Remove empty API directories
const emptyDirs = [
  'src/pages/api/stripe',
  'src/pages/api/medusa/payments'
];

for (const dir of emptyDirs) {
  const fullPath = join(rootDir, dir);
  if (existsSync(fullPath)) {
    try {
      const files = readdirSync(fullPath);
      if (files.length === 0) {
        rmdirSync(fullPath);
        log(`Removed empty directory: ${dir}`, 'success');
        removedCount++;
      }
    } catch (error) {
      log(`Could not remove ${dir}: ${error.message}`, 'warning');
    }
  }
}

// ============================================
// 3. Remove Old Checkout Components
// ============================================
section('Removing Old Checkout Components');

const oldComponents = [
  'src/components/checkout/CheckoutFlow.tsx',
  'src/components/checkout/CheckoutFlowNew.tsx',
  'src/components/checkout/StripePayment.tsx'
];

for (const component of oldComponents) {
  removeWithBackup(component, backup);
}

// ============================================
// Summary
// ============================================
section('Cleanup Summary');

console.log(`
${bright}Results:${reset}
  ${green}✓ Files/directories removed:${reset} ${removedCount}
  ${cyan}→ Backup location:${reset} .cleanup-backup/
  ${cyan}→ New checkout files:${reset} Preserved

${bright}What was removed:${reset}
  • Old checkout pages (index, success, cancel, etc.)
  • Legacy API routes
  • Old checkout components
  • Empty directories

${bright}What was kept:${reset}
  • src/pages/checkout.astro (NEW)
  • src/pages/order/confirmation.astro (NEW)
  • src/components/checkout/CheckoutForm.tsx (NEW)
  • All new API routes

${bright}Next Steps:${reset}
  1. Test new checkout: ${cyan}npm run dev${reset}
  2. Navigate to: ${cyan}http://localhost:4321/checkout${reset}
  3. If everything works: ${cyan}rm -rf .cleanup-backup${reset}
  4. Commit changes: ${cyan}git add -A && git commit -m "Remove old checkout code"${reset}

${yellow}Note: Backups are in .cleanup-backup/ if you need to restore anything${reset}
`);

log('Cleanup complete!', 'success');
