# 🚀 Netlify Environment Variable Sync - Quick Start

## What This Does

Automatically syncs your cleaned `.env` file to Netlify's environment variables using the Netlify CLI.

---

## ⚡ Quick Commands

### Preview Changes (Safe - Always Start Here!)

```bash
yarn env:sync:dry
```

### Apply Changes to Netlify

```bash
yarn env:sync
```

### Full Sync + Cleanup (Remove unused vars)

```bash
yarn env:sync:remove
```

---

## 📋 Setup (One-Time)

1. **Install Netlify CLI** (if not installed):

   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:

   ```bash
   netlify login
   ```

3. **Link your site**:

   ```bash
   netlify link
   ```

4. **Verify connection**:
   ```bash
   netlify status
   ```

---

## 🎯 Recommended Workflow

```bash
# 1. Preview what will change
yarn env:sync:dry

# 2. Review the output carefully

# 3. Apply changes if everything looks good
yarn env:sync

# 4. Verify in Netlify dashboard
# https://app.netlify.com → Your Site → Environment variables
```

---

## ⚠️ Important Notes

- **Always run `--dry-run` first** to preview changes
- Script **skips `TODO_*` placeholder values** automatically
- Variables are synced to **all contexts** (production, deploy-preview, branch-deploy) by default
- **5-second countdown** before applying changes (Ctrl+C to cancel)
- Script **won't delete** Netlify vars unless you use `--remove` flag

---

## 🛡️ Safety Features

✅ **Automatic skips:**

- Comment lines (`#`)
- Empty lines
- Section headers (`===`)
- Placeholder values (`TODO_ADD_*`)

✅ **Safeguards:**

- Dry run mode
- Countdown before changes
- Clear labeling (+ NEW, ↻ UPDATE, - REMOVE)
- Success/failure summary

---

## 📖 Full Documentation

See [scripts/README-NETLIFY-SYNC.md](./README-NETLIFY-SYNC.md) for:

- All CLI options
- Context targeting (`--context=production`)
- Troubleshooting
- Manual verification steps
- Rollback instructions

---

## 🔍 Example Output

```
🚀 Netlify Environment Variable Sync Tool

Mode: ✍️  LIVE UPDATE
Context: all
Remove unused: NO

📖 Reading .env file...
   Found 65 variables

🌐 Fetching current Netlify variables...
   Found 48 variables in Netlify

⏭️  Skipping placeholder variables:
   - CALCOM_WEBHOOK_SECRET (TODO_ADD_CALCOM_WEBHOOK_SECRET)

📊 Summary:
   Variables to update: 17
   Variables to remove: 0

⚠️  This will modify Netlify environment variables.
   Press Ctrl+C to cancel, or wait 5 seconds to continue...

📝 Updating variables:

   + NEW: PUBLIC_SANITY_API_TOKEN... ✓
   ↻ UPDATE: STRIPE_API_VERSION... ✓
   ↻ UPDATE: PUBLIC_MEDUSA_BACKEND_URL... ✓
   ...

   Success: 17, Failed: 0

✅ Sync complete!
```

---

## 💡 Pro Tips

1. **Use dry run liberally** — it's free and shows exactly what will happen
2. **Check the Netlify dashboard after sync** to verify
3. **Keep backup:** Original `.env` saved as `.env.backup-2026-02-04`
4. **Production-only updates:** Add `--context=production` if needed
5. **Troubleshooting:** See full docs in `README-NETLIFY-SYNC.md`

---

## 🆘 Troubleshooting

**"Failed to fetch Netlify variables"**

```bash
netlify login
netlify link
```

**"Permission denied"**

```bash
chmod +x scripts/sync-env-to-netlify.js
```

**Variables not syncing**

```bash
# Check connection
netlify status

# Try direct command
node scripts/sync-env-to-netlify.js --dry-run
```

---

Created: February 4, 2026  
Associated with: `.env` cleanup and reorganization
