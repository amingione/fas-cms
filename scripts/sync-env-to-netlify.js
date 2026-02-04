#!/usr/bin/env node

/**
 * Sync .env variables to Netlify
 *
 * Usage:
 *   node scripts/sync-env-to-netlify.js [options]
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --remove     Remove Netlify vars not in .env (careful!)
 *   --context    Specify context: production, deploy-preview, branch-deploy (default: all)
 *
 * Prerequisites:
 *   - Netlify CLI installed: npm install -g netlify-cli
 *   - Authenticated: netlify login
 *   - NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN in .env
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const removeUnused = args.includes('--remove');
const contextArg = args.find((arg) => arg.startsWith('--context='));
const context = contextArg ? contextArg.split('=')[1] : 'all';

const ENV_FILE = path.join(__dirname, '../.env');

console.log('🚀 Netlify Environment Variable Sync Tool\n');
console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '✍️  LIVE UPDATE'}`);
console.log(`Context: ${context}`);
console.log(`Remove unused: ${removeUnused ? 'YES ⚠️' : 'NO'}\n`);

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};

  content.split('\n').forEach((line) => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) return;

    // Skip section headers (lines that are only ====)
    if (line.trim().match(/^=+$/)) return;

    // Parse KEY=VALUE
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove surrounding quotes if present
      vars[key] = value.replace(/^["']|["']$/g, '');
    }
  });

  return vars;
}

/**
 * Get current Netlify environment variables
 */
function getNetlifyVars() {
  try {
    const output = execSync('netlify env:list --json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Netlify CLI outputs each var as a separate JSON object per line
    const vars = {};
    output
      .trim()
      .split('\n')
      .forEach((line) => {
        if (!line.trim()) return;
        try {
          const parsed = JSON.parse(line);
          if (parsed.key) {
            vars[parsed.key] = parsed.value || true;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      });

    return vars;
  } catch (error) {
    console.error('❌ Failed to fetch Netlify variables');
    console.error('   Make sure you are authenticated: netlify login');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Set environment variable in Netlify
 */
function setNetlifyVar(key, value, context) {
  const contextFlag =
    context === 'all'
      ? '--context production --context deploy-preview --context branch-deploy'
      : `--context ${context}`;

  try {
    if (dryRun) {
      console.log(`   [DRY RUN] Would set: ${key}`);
      return true;
    }

    // Escape value for shell
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

/**
 * Remove environment variable from Netlify
 */
function removeNetlifyVar(key) {
  try {
    if (dryRun) {
      console.log(`   [DRY RUN] Would remove: ${key}`);
      return true;
    }

    execSync(`netlify env:unset ${key}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    return true;
  } catch (error) {
    console.error(`   ❌ Failed to remove ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Main sync logic
 */
async function main() {
  // Check if .env exists
  if (!fs.existsSync(ENV_FILE)) {
    console.error(`❌ .env file not found at ${ENV_FILE}`);
    process.exit(1);
  }

  // Parse local .env
  console.log('📖 Reading .env file...');
  const localVars = parseEnvFile(ENV_FILE);
  const localKeys = Object.keys(localVars);
  console.log(`   Found ${localKeys.length} variables\n`);

  // Get current Netlify vars
  console.log('🌐 Fetching current Netlify variables...');
  const netlifyVars = getNetlifyVars();
  const netlifyKeys = Object.keys(netlifyVars);
  console.log(`   Found ${netlifyKeys.length} variables in Netlify\n`);

  // Skip TODO placeholders
  const toSkip = localKeys.filter((key) => localVars[key].startsWith('TODO_'));
  if (toSkip.length > 0) {
    console.log('⏭️  Skipping placeholder variables:');
    toSkip.forEach((key) => console.log(`   - ${key} (${localVars[key]})`));
    console.log('');
  }

  // Determine what to update
  const toUpdate = localKeys.filter(
    (key) =>
      !localVars[key].startsWith('TODO_') &&
      (!netlifyVars[key] || netlifyVars[key] !== localVars[key])
  );

  const toRemove = removeUnused ? netlifyKeys.filter((key) => !localKeys.includes(key)) : [];

  // Show summary
  console.log('📊 Summary:');
  console.log(`   Variables to update: ${toUpdate.length}`);
  console.log(`   Variables to remove: ${toRemove.length}`);
  console.log('');

  if (toUpdate.length === 0 && toRemove.length === 0) {
    console.log('✅ Everything is in sync! Nothing to do.');
    return;
  }

  // Confirm if not dry run
  if (!dryRun) {
    console.log('⚠️  This will modify Netlify environment variables.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Update variables
  if (toUpdate.length > 0) {
    console.log('📝 Updating variables:\n');
    let success = 0;
    let failed = 0;

    for (const key of toUpdate) {
      const value = localVars[key];
      const isNew = !netlifyVars[key];
      const prefix = isNew ? '   + NEW' : '   ↻ UPDATE';

      process.stdout.write(`${prefix}: ${key}...`);

      if (setNetlifyVar(key, value, context)) {
        console.log(' ✓');
        success++;
      } else {
        console.log(' ✗');
        failed++;
      }
    }

    console.log(`\n   Success: ${success}, Failed: ${failed}\n`);
  }

  // Remove unused variables
  if (toRemove.length > 0) {
    console.log('🗑️  Removing unused variables:\n');

    // Show what will be removed
    console.log('   The following variables exist in Netlify but not in .env:');
    toRemove.forEach((key) => console.log(`   - ${key}`));
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

// Run
main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
