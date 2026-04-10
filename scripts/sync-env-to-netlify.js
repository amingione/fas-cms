#!/usr/bin/env node
// ⚠️  DEPRECATED (2026-04-10) — dotenvx migration complete.
// Netlify now receives a single DOTENV_PRIVATE_KEY_PRODUCTION secret and decrypts
// .env.production at build time. This mass-sync script is no longer needed.
// Keep for DR reference only.

/**
 * Sync .env variables to Netlify
 *
 * Usage:
 *   node scripts/sync-env-to-netlify.js [options]
 *   node scripts/sync-env-to-netlify.js --dry-run
 *   node scripts/sync-env-to-netlify.js --remove
 *   node scripts/sync-env-to-netlify.js --context=production
 *   node scripts/sync-env-to-netlify.js --file=.env
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --remove     Remove Netlify vars not in .env (careful!)
 *   --context    Override context (default: per-var rules below)
 *   --file       Override env file path (default: .env)
 *
 * Context strategy:
 *   - Secrets (API keys, tokens, passwords) → all 5 contexts
 *   - Public/non-secret runtime vars       → production + deploy-preview + branch-deploy
 *   - Build-only vars (in netlify.toml)    → SKIPPED (never pushed to UI)
 *
 * Prerequisites:
 *   - Netlify CLI installed: npm install -g netlify-cli
 *   - Authenticated: netlify login
 *   - NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN in .env
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const removeUnused = args.includes('--remove');
const contextArg = args.find((arg) => arg.startsWith('--context='));
const contextOverride = contextArg ? contextArg.split('=')[1] : null;
const fileArg = args.find((arg) => arg.startsWith('--file='));
const envFileOverride = fileArg ? fileArg.split('=')[1] : process.env.NETLIFY_ENV_FILE;

const ENV_FILE = envFileOverride
  ? path.resolve(__dirname, '..', envFileOverride)
  : path.join(__dirname, '../.env');

// ─── Context definitions ───────────────────────────────────────────────────
// All 5 Netlify contexts:
//   production      → live site functions
//   deploy-preview  → PR preview functions
//   branch-deploy   → non-main branch functions
//   dev             → Netlify CLI local dev (netlify dev)
//   runtime         → Preview Server & Agent Runners

const ALL_CONTEXTS = ['production', 'deploy-preview', 'branch-deploy', 'dev', 'runtime'];
const RUNTIME_CONTEXTS = ['production', 'deploy-preview', 'branch-deploy'];

// ─── Keys that live in netlify.toml [build.environment] ────────────────────
// These must NOT be pushed to the Netlify UI — doing so would inject them
// into functions and count toward the 4 KB function env limit.
const BUILD_ONLY_KEYS = new Set([
  // Build tooling
  'NODE_VERSION', 'GO_VERSION', 'PHP_VERSION', 'YARN_VERSION',
  'NETLIFY_USE_YARN', 'NETLIFY_EXPERIMENTAL_YARN_BERRY', 'NPM_CONFIG_OPTIONAL',
  // Public URLs (baked into bundle)
  'PUBLIC_BASE_URL', 'PUBLIC_SITE_URL',
  // Public Sanity config (baked into bundle)
  'PUBLIC_SANITY_PROJECT_ID', 'PUBLIC_SANITY_DATASET', 'PUBLIC_SANITY_API_VERSION',
  'PUBLIC_SANITY_STUDIO_URL', 'PUBLIC_SANITY_FUNCTIONS_BASE_URL',
  'PUBLIC_SANITY_ENABLE_CACHE', 'PUBLIC_SANITY_CACHE_TTL_SECONDS',
  // Sanity non-secret identifiers
  'SANITY_PROJECT_ID', 'SANITY_DATASET', 'SANITY_API_VERSION',
  'SANITY_STUDIO_URL', 'SANITY_FUNCTIONS_BASE_URL',
  // Stripe non-secrets
  'STRIPE_API_VERSION', 'PUBLIC_STRIPE_PUBLISHABLE_KEY',
  // GMC feed config (non-secret)
  'GMC_SFTP_HOST', 'GMC_SFTP_PORT', 'GMC_SFTP_FEED_FILENAME', 'GMC_SFTP_USERNAME',
  'GMC_FEED_BASE_URL', 'GMC_FEED_CURRENCY', 'GMC_FEED_DEFAULT_QUANTITY',
  'GMC_FEED_DEFAULT_WEIGHT_LB', 'GMC_FEED_SHIPPING_PRICE', 'GMC_FEED_LANGUAGE',
  'GMC_FEED_TARGET_COUNTRY', 'GMC_CONTENT_API_BATCH_SIZE', 'GMC_CONTENT_API_MERCHANT_ID',
  // Shippo origin address (non-secret constants)
  'SHIPPO_ORIGIN_NAME', 'SHIPPO_ORIGIN_COMPANY', 'SHIPPO_ORIGIN_STREET1',
  'SHIPPO_ORIGIN_CITY', 'SHIPPO_ORIGIN_STATE', 'SHIPPO_ORIGIN_ZIP',
  'SHIPPO_ORIGIN_COUNTRY', 'SHIPPO_ORIGIN_PHONE', 'SHIPPO_ORIGIN_EMAIL',
  'SHIPPO_WEIGHT_UNIT', 'SHIPPO_DIMENSION_UNIT', 'SHIPPO_API_BASE', 'SHIPPING_PROVIDER',
  // Warehouse address (non-secret)
  'WAREHOUSE_ADDRESS_LINE1', 'WAREHOUSE_ADDRESS_LINE2', 'WAREHOUSE_CITY',
  'WAREHOUSE_STATE', 'WAREHOUSE_ZIP', 'WAREHOUSE_PHONE', 'WAREHOUSE_EMAIL',
  // Webhook forwarding defaults
  'PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED', 'PAYMENT_INTENT_WEBHOOK_FORWARD_FAIL_OPEN',
  'PAYMENT_INTENT_WEBHOOK_LOCAL_PROCESS_ENABLED', 'WEBHOOK_FORWARD_TIMEOUT_MS',
  // Email sender addresses (non-secret)
  'RESEND_FROM', 'NOTIFY_EMAIL', 'NOTIFY_FROM',
  // Public Medusa config
  'PUBLIC_MEDUSA_BACKEND_URL',
  // Session config (non-secret)
  'SESSION_COOKIE_NAME', 'SESSION_SAMESITE', 'SESSION_SECURE',
  // Misc non-secret
  'ADMIN_EMAIL', 'NEXT_PUBLIC_API_BASE_URL', 'SITE_NAME', 'SITE_URL',
  'CORS_ALLOW', 'CORS_ORIGIN', 'ANTHROPIC_MODEL',
]);

// ─── Keys that need ALL 5 contexts (secrets used at any runtime) ────────────
// Everything else gets RUNTIME_CONTEXTS (production + deploy-preview + branch-deploy).
// Local dev (netlify dev) and Agent Runners only need secrets.
const ALL_CONTEXT_KEYS = new Set([
  'JWT_SECRET', 'SESSION_SECRET', 'ADMIN_PASSWORD',
  'SANITY_API_TOKEN', 'PUBLIC_SANITY_API_TOKEN',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'MEDUSA_BACKEND_URL', 'MEDUSA_API_URL',
  'MEDUSA_PUBLISHABLE_KEY', 'PUBLIC_MEDUSA_PUBLISHABLE_KEY',
  'MEDUSA_REGION_ID', 'PUBLIC_MEDUSA_REGION_ID',
  'RESEND_API_KEY',
  'SHIPPO_API_KEY',
  'ANTHROPIC_API_KEY', 'CLAUDE_API_SECRET',
  'CALCOM_API_KEY', 'PUBLIC_CALCOM_API_KEY', 'CALCOM_WEBHOOK_SECRET',
  'NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID',
  'WEBHOOK_FORWARD_SHARED_SECRET',
  'GMC_SFTP_PASSWORD',
]);

// Large inline GMC credential blobs can exceed Netlify env limits and break deploy sync.
// Default behavior: skip syncing inline key values; prefer GMC_SERVICE_ACCOUNT_KEY_FILE.
// To force syncing inline values, set NETLIFY_SYNC_GMC_INLINE_KEYS=true.
const INLINE_GMC_KEY_VARS = new Set([
  'GMC_SERVICE_ACCOUNT_KEY_BASE64',
  'GMC_SERVICE_ACCOUNT_KEY',
]);
const syncInlineGmcKeys = process.env.NETLIFY_SYNC_GMC_INLINE_KEYS === 'true';
const ACCOUNT_ID_ERROR_PATTERN = /Missing required path variable 'account_id'/;
let cachedNetlifySiteContext = null;

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  content.split('\n').forEach((line) => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    if (line.trim().match(/^=+$/)) return;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      vars[key] = value.replace(/^["']|["']$/g, '');
    }
  });
  return vars;
}

function getNetlifyVars() {
  try {
    const output = execSync('netlify env:list --json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const trimmed = output.trim();
    if (!trimmed) return {};
    const vars = {};
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => { if (item?.key) vars[item.key] = item.value ?? true; });
      } else if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([key, value]) => { vars[key] = value ?? true; });
      }
    } catch {
      trimmed.split('\n').forEach((line) => {
        if (!line.trim()) return;
        try {
          const parsed = JSON.parse(line);
          if (parsed.key) vars[parsed.key] = parsed.value ?? true;
        } catch { /* skip */ }
      });
    }
    return vars;
  } catch (error) {
    console.error('❌ Failed to fetch Netlify variables');
    console.error('   Make sure you are authenticated: netlify login');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

function getNetlifySiteContext() {
  if (cachedNetlifySiteContext) return cachedNetlifySiteContext;

  try {
    const statusOutput = execSync('netlify status --json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const status = JSON.parse(statusOutput);
    const siteId = status?.siteData?.['site-id'];
    if (!siteId) {
      throw new Error('site-id missing from `netlify status --json` output');
    }

    const payload = JSON.stringify({ site_id: siteId }).replace(/'/g, "'\\''");
    const siteOutput = execSync(`netlify api getSite --data '${payload}'`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const site = JSON.parse(siteOutput);
    const accountId = site?.account_id;
    if (!accountId) {
      throw new Error('account_id missing from Netlify site metadata');
    }

    cachedNetlifySiteContext = { siteId, accountId };
    return cachedNetlifySiteContext;
  } catch (error) {
    throw new Error(`Could not resolve Netlify site/account context: ${error.message}`);
  }
}

function removeNetlifyVarViaApi(key) {
  const { siteId, accountId } = getNetlifySiteContext();
  const payload = JSON.stringify({
    account_id: accountId,
    site_id: siteId,
    key,
  }).replace(/'/g, "'\\''");

  execSync(`netlify api deleteEnvVar --data '${payload}'`, {
    encoding: 'utf8',
    stdio: 'pipe'
  });
}

function contextsFor(key) {
  if (contextOverride) return [contextOverride];
  return ALL_CONTEXT_KEYS.has(key) ? ALL_CONTEXTS : RUNTIME_CONTEXTS;
}

function setNetlifyVar(key, value) {
  const contexts = contextsFor(key);
  const contextFlag = contexts.map((c) => `--context ${c}`).join(' ');
  try {
    if (dryRun) {
      console.log(`   [DRY RUN] Would set: ${key} → [${contexts.join(', ')}]`);
      return true;
    }
    const escapedValue = value.replace(/'/g, "'\\''");
    execSync(`netlify env:set ${key} '${escapedValue}' ${contextFlag}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to set ${key}: ${error.message}`);
    return false;
  }
}

function removeNetlifyVar(key) {
  try {
    if (dryRun) {
      console.log(`   [DRY RUN] Would remove: ${key}`);
      return true;
    }
    try {
      execSync(`netlify env:unset ${key}`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      const message = error?.message || '';
      if (!ACCOUNT_ID_ERROR_PATTERN.test(message)) throw error;
      // Fallback for CLI account context bug: delete directly via API with explicit account/site IDs.
      removeNetlifyVarViaApi(key);
    }
    // Verify it's actually gone — team-level vars override site-level unset silently
    const check = execSync(`netlify env:get ${key} 2>/dev/null || echo ""`, { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (check) {
      console.warn(`\n   ⚠️  ${key} still present after unset — likely a team-level var.`);
      console.warn(`      Remove it manually: Netlify UI → Team Settings → Environment Variables`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to remove ${key}: ${error.message}`);
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Netlify Environment Variable Sync Tool\n');
  console.log(`Mode:           ${dryRun ? '🔍 DRY RUN' : '✍️  LIVE UPDATE'}`);
  console.log(`Context:        ${contextOverride ?? 'per-var rules'}`);
  console.log(`Remove unused:  ${removeUnused ? 'YES ⚠️' : 'NO'}\n`);

  if (!fs.existsSync(ENV_FILE)) {
    console.error(`❌ .env file not found at ${ENV_FILE}`);
    process.exit(1);
  }

  console.log('📖 Reading .env file...');
  const localVars = parseEnvFile(ENV_FILE);
  const localKeys = Object.keys(localVars);
  console.log(`   Found ${localKeys.length} variables\n`);

  // Separate build-only keys (skip) from runtime keys (sync)
  const skippedBuildOnly = localKeys.filter((k) => BUILD_ONLY_KEYS.has(k));
  const toSync = localKeys.filter((k) => !BUILD_ONLY_KEYS.has(k));
  const skippedInlineGmc = toSync.filter((k) => INLINE_GMC_KEY_VARS.has(k) && !syncInlineGmcKeys);

  if (skippedBuildOnly.length > 0) {
    console.log(`⚙️  Skipping ${skippedBuildOnly.length} build-only vars (already in netlify.toml):`);
    skippedBuildOnly.forEach((k) => console.log(`   - ${k}`));
    console.log('');
  }

  if (skippedInlineGmc.length > 0) {
    console.log(
      `🔐 Skipping ${skippedInlineGmc.length} inline GMC key var(s) (use GMC_SERVICE_ACCOUNT_KEY_FILE):`
    );
    skippedInlineGmc.forEach((k) => console.log(`   - ${k}`));
    console.log('');
  }

  const syncCandidates = toSync.filter((k) => !(INLINE_GMC_KEY_VARS.has(k) && !syncInlineGmcKeys));

  const placeholders = syncCandidates.filter((k) => localVars[k].startsWith('TODO_'));
  if (placeholders.length > 0) {
    console.log(`⏭️  Skipping ${placeholders.length} placeholder vars (TODO_ prefix):`);
    placeholders.forEach((k) => console.log(`   - ${k}`));
    console.log('');
  }

  const toSet = syncCandidates.filter((k) => !localVars[k].startsWith('TODO_'));

  console.log('🌐 Fetching current Netlify variables...');
  const netlifyVars = getNetlifyVars();
  const netlifyKeys = Object.keys(netlifyVars);
  console.log(`   Found ${netlifyKeys.length} variables in Netlify\n`);

  const toUpdate = toSet.filter(
    (k) => !netlifyVars[k] || netlifyVars[k] !== localVars[k]
  );

  // Remove: vars in Netlify but not in .env AND not build-only (those should be removed too if --remove)
  const toRemove = removeUnused
    ? netlifyKeys.filter((k) => !localKeys.includes(k) || BUILD_ONLY_KEYS.has(k))
    : [];

  // Show context plan
  console.log('📋 Context plan:');
  console.log(`   Secrets → [${ALL_CONTEXTS.join(', ')}]`);
  console.log(`   Public runtime vars → [${RUNTIME_CONTEXTS.join(', ')}]`);
  console.log(`   Build-only vars → skipped (in netlify.toml)\n`);

  console.log('📊 Summary:');
  console.log(`   Variables to set/update: ${toUpdate.length}`);
  console.log(`   Variables to remove:     ${toRemove.length}`);
  console.log('');

  if (toUpdate.length === 0 && toRemove.length === 0) {
    console.log('✅ Everything is in sync! Nothing to do.');
    return;
  }

  if (!dryRun) {
    console.log('⚠️  This will modify Netlify environment variables.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (toUpdate.length > 0) {
    console.log('📝 Setting variables:\n');
    let success = 0;
    let failed = 0;

    for (const key of toUpdate) {
      const value = localVars[key];
      const isNew = !netlifyVars[key];
      const contexts = contextsFor(key);
      const prefix = isNew ? '   + NEW   ' : '   ↻ UPDATE';

      process.stdout.write(`${prefix}: ${key} → [${contexts.join(', ')}]...`);

      if (setNetlifyVar(key, value)) {
        console.log(' ✓');
        success++;
      } else {
        console.log(' ✗');
        failed++;
      }
    }

    console.log(`\n   Success: ${success}, Failed: ${failed}\n`);
  }

  if (toRemove.length > 0) {
    console.log('🗑️  Removing variables (in Netlify but not in .env or now build-only):\n');
    toRemove.forEach((k) => {
      const reason = BUILD_ONLY_KEYS.has(k) ? ' (moved to netlify.toml)' : ' (not in .env)';
      console.log(`   - ${k}${reason}`);
    });
    console.log('');

    if (!dryRun) {
      console.log('⚠️  DANGER: About to delete variables from Netlify!');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    let success = 0;
    let failed = 0;

    for (const key of toRemove) {
      process.stdout.write(`   - REMOVE: ${key}...`);
      if (removeNetlifyVar(key)) {
        console.log(' ✓');
        success++;
      } else {
        console.log(' ✗');
        failed++;
      }
    }

    console.log(`\n   Success: ${success}, Failed: ${failed}\n`);
  }

  console.log('✅ Sync complete!');
  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
