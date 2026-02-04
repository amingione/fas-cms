# Netlify Environment Variable Sync Script

Automatically sync your `.env` file to Netlify's environment variables.

## Prerequisites

1. **Install Netlify CLI** (if not already installed):

   ```bash
   npm install -g netlify-cli
   ```

2. **Authenticate with Netlify**:

   ```bash
   netlify login
   ```

3. **Link to your site** (if not already linked):
   ```bash
   netlify link
   ```
   Or ensure `NETLIFY_SITE_ID` is in your `.env`

## Usage

### Dry Run (Recommended First)

See what would be updated without making changes:

```bash
node scripts/sync-env-to-netlify.js --dry-run
```

### Update Variables

Apply changes to Netlify:

```bash
node scripts/sync-env-to-netlify.js
```

### Update + Remove Unused

Update variables AND remove any Netlify vars not in `.env`:

```bash
node scripts/sync-env-to-netlify.js --remove
```

⚠️ **Careful with `--remove`** — This will delete Netlify variables that don't exist in your `.env`

### Specify Context

Set variables for specific deployment contexts:

```bash
# Production only
node scripts/sync-env-to-netlify.js --context=production

# Deploy previews only
node scripts/sync-env-to-netlify.js --context=deploy-preview

# Branch deploys only
node scripts/sync-env-to-netlify.js --context=branch-deploy

# All contexts (default)
node scripts/sync-env-to-netlify.js --context=all
```

## Options

| Option            | Description                                                                         |
| ----------------- | ----------------------------------------------------------------------------------- |
| `--dry-run`       | Preview changes without applying them                                               |
| `--remove`        | Delete Netlify vars not in `.env` (use with caution)                                |
| `--context=<ctx>` | Target context: `production`, `deploy-preview`, `branch-deploy`, or `all` (default) |

## Examples

### Safe Update (Recommended Workflow)

```bash
# 1. Preview changes
node scripts/sync-env-to-netlify.js --dry-run

# 2. Apply changes
node scripts/sync-env-to-netlify.js

# 3. Verify in Netlify dashboard
```

### Full Sync with Cleanup

```bash
# Preview first
node scripts/sync-env-to-netlify.js --dry-run --remove

# Apply if looks good
node scripts/sync-env-to-netlify.js --remove
```

### Production-Only Update

```bash
node scripts/sync-env-to-netlify.js --context=production
```

## What Gets Synced?

✅ **Included:**

- All variables from `.env`
- New variables (marked as `+ NEW`)
- Changed variables (marked as `↻ UPDATE`)

❌ **Excluded:**

- Comment lines (starting with `#`)
- Empty lines
- Section headers (`===`)
- Variables with `TODO_` prefix (placeholders)

## Safety Features

- **5-second countdown** before applying changes (press Ctrl+C to cancel)
- **Dry run mode** to preview changes
- **Clear labeling** of new vs. updated variables
- **Skips placeholder values** (like `TODO_ADD_*`)
- **Summary report** of success/failures

## Troubleshooting

### "Failed to fetch Netlify variables"

Make sure you're authenticated:

```bash
netlify login
netlify link
```

### "Permission denied"

Make the script executable:

```bash
chmod +x scripts/sync-env-to-netlify.js
```

### Variables not showing up in Netlify

- Check the correct site is linked: `netlify status`
- Verify variables in Netlify dashboard: https://app.netlify.com
- Try specifying context explicitly: `--context=production`

### "Cannot find module" error

The script uses Node.js built-in modules only. Make sure you're running with Node.js 14+:

```bash
node --version
```

## Tips

1. **Always run with `--dry-run` first** to preview changes
2. **Be cautious with `--remove`** — it deletes Netlify variables not in `.env`
3. **Use `--context`** to avoid accidentally updating wrong environments
4. **Check Netlify dashboard** after sync to verify changes
5. **Keep `.env` in `.gitignore`** to avoid committing secrets

## Manual Verification

After running the script, verify in Netlify:

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Check that variables match your `.env`

## Rollback

If something goes wrong:

1. Netlify keeps variable history — check the Activity log
2. You have `.env.backup-2026-02-04` as a backup
3. Re-run the script with your backup: `cp .env.backup-2026-02-04 .env && node scripts/sync-env-to-netlify.js`
