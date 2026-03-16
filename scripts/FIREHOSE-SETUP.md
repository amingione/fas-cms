# Firehose Brand Monitoring Setup

## Issue Identified

Your macOS system's LibreSSL 3.3.6 has a TLS compatibility issue with the Firehose API server. This prevents the system `curl` from connecting.

**Error:** `tlsv1 alert protocol version`

## Solution Options

### Option 1: Use Homebrew curl (Recommended)

Install curl with modern OpenSSL via Homebrew:

```bash
brew install curl
```

Then test connectivity:

```bash
./scripts/firehose-setup.sh test
```

### Option 2: Use from a Different Environment

Run the monitoring from:
- **Docker container** with newer OpenSSL
- **Linux server** (Railway, Digital Ocean, etc.)
- **GitHub Actions** workflow
- **Netlify Function** (already deployed there)

### Option 3: Use Node.js Script (Alternative)

The Node.js scripts should work, but may need additional debugging for TLS:

```bash
node scripts/firehose-monitor-fetch.js test
```

## Quick Start (Once TLS is Fixed)

### 1. Test Connection

```bash
./scripts/firehose-setup.sh test
```

Should return your existing taps (if any).

### 2. Create Monitoring Tap

```bash
./scripts/firehose-setup.sh create
```

This creates a tap with the Lucene query:
```
"FAS Motorsports" OR "fasmotorsports.com" OR "FAS Performance" OR "FAS Racing" OR (FAS AND (motorsports OR performance OR racing OR automotive))
```

### 3. List Taps

```bash
./scripts/firehose-setup.sh list
```

### 4. Start Monitoring

```bash
./scripts/firehose-setup.sh stream <tap-id>
```

Streams real-time matches to your terminal.

## What I've Created for You

### Scripts

1. **`firehose-setup.sh`** (Bash, recommended)
   - Handles TLS better with Homebrew curl
   - Simple command-line interface
   - Real-time streaming display
   - Uses: `./scripts/firehose-setup.sh <command>`

2. **`firehose-monitor-fetch.js`** (Node.js)
   - Uses native fetch API
   - Tests multiple endpoint candidates
   - Fallback option if bash doesn't work
   - Uses: `node scripts/firehose-monitor-fetch.js <command>`

3. **`firehose-monitor.js`** (Node.js, HTTPS module)
   - Original version using https module
   - May have same TLS issues as curl
   - Uses: `node scripts/firehose-monitor.js <command>`

### Documentation

- **FIREHOSE-README.md** - Complete usage guide with integration ideas
- **FIREHOSE-SETUP.md** (this file) - Setup instructions and troubleshooting

### Environment

Added to `.env`:
```bash
FIREHOSE_MANAGEMENT_KEY=fhm_j44D2QQqW0RlSoFRfnZelxKkjjuORRSjOtYWhSWb
```

### Dependencies

Installed:
- `eventsource` - For SSE streaming in Node.js

## API Details Confirmed

- **Base URL:** `https://api.firehose.com/v1`
- **Server IP:** 188.166.198.231:443
- **Authentication:** `Authorization: Bearer <management-key>`
- **Management Key Prefix:** `fhm_` (for creating/managing taps)
- **Tap Token Prefix:** `fh_` (for streaming from a specific tap)

## Monitoring Query

Your FAS Motorsports monitoring will catch:

✓ Exact phrase "FAS Motorsports"
✓ Domain mentions "fasmotorsports.com"
✓ Brand variations "FAS Performance", "FAS Racing"
✓ Contextual mentions "FAS" + automotive keywords
✓ English content only (configurable)

## Next Steps

**Immediate:**
1. Install Homebrew curl: `brew install curl`
2. Test connection: `./scripts/firehose-setup.sh test`
3. Create tap: `./scripts/firehose-setup.sh create`

**Integration (Later):**
1. Store matches in Sanity CMS (`brandMention` document type)
2. Feed into SEO Engine for competitor analysis
3. Set up notifications (Slack, email, SMS)
4. Create dashboard in fas-dash
5. Automate with cron job or systemd service

## Deployment Ideas

### Netlify Function for Processing

Create `.netlify/functions/firehose-webhook.js`:

```javascript
import { createClient } from '@sanity/client';

export async function handler(event) {
  const match = JSON.parse(event.body);

  // Store in Sanity
  const client = createClient({
    projectId: 'r4og35qd',
    dataset: 'production',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });

  await client.create({
    _type: 'brandMention',
    url: match.url,
    title: match.title,
    domain: match.domain,
    detectedAt: new Date().toISOString(),
    source: 'firehose',
  });

  return { statusCode: 200 };
}
```

### GitHub Action for Daily Reports

Create `.github/workflows/firehose-report.yml`:

```yaml
name: Daily Firehose Report
on:
  schedule:
    - cron: '0 9 * * *' # 9 AM daily
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - name: Fetch yesterday's mentions
        env:
          FIREHOSE_MANAGEMENT_KEY: ${{ secrets.FIREHOSE_MANAGEMENT_KEY }}
        run: |
          node scripts/firehose-report.js > daily-report.md
      - name: Send to Slack
        uses: slackapi/slack-github-action@v1
        with:
          slack-message: "$(cat daily-report.md)"
```

## Troubleshooting

### "Protocol version" error
- Install Homebrew curl: `brew install curl`
- Or run from Docker/Linux environment

### "Connection refused"
- Check if api.firehose.com is accessible: `ping api.firehose.com`
- Verify management key is valid
- Try from different network (VPN, mobile hotspot)

### "Unauthorized" response
- Management key may be invalid or expired
- Check dashboard at https://firehose.com
- Verify key hasn't been revoked

### No matches appearing
- Firehose delivers matches as pages are crawled (8B+/day)
- May take 24-48 hours to see first matches
- Check query syntax in tap details
- Consider broadening query terms

### jq command not found
- Install jq: `brew install jq`
- Or modify bash script to not use jq

## Resources

- **Firehose API Docs:** https://firehose.com/api-docs
- **Lucene Query Syntax:** https://lucene.apache.org/core/2_9_4/queryparsersyntax.html
- **Use Cases:** https://firehose.com/use-cases
- **Support:** Check Firehose dashboard or contact support

## Integration with SEO Engine

Store brand mentions in your SEO-Clients directory:

```javascript
import fs from 'fs';
import path from 'path';

const seoClientsDir = path.join(process.env.HOME, 'LocalStorm/SEO-Clients');
const fasDir = path.join(seoClientsDir, 'fas-motorsports');
const mentionsFile = path.join(fasDir, 'brand-mentions.jsonl');

// Append match as JSON Lines
fs.appendFileSync(mentionsFile, JSON.stringify(match) + '\n');
```

Then create a dashboard generator in SEO-Engine:

```bash
cd ~/LocalStorm/SEO-Engine
# Add brand-mentions-dashboard.ts generator
# Read from fas-motorsports/brand-mentions.jsonl
# Generate HTML dashboard with charts
```
