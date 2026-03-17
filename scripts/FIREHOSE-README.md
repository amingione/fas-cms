# Firehose Brand Monitoring

Real-time web monitoring for FAS Motorsports brand mentions using the Firehose API.

## What is Firehose?

Firehose monitors the web in real-time using Ahrefs' massive crawl (8B+ pages/day). You create monitoring rules using Lucene query syntax, and every matching page is delivered via Server-Sent Events (SSE).

## Setup

### 1. Environment Variable

The `FIREHOSE_MANAGEMENT_KEY` is already configured in `.env`:

```bash
FIREHOSE_MANAGEMENT_KEY=fhm_j44D2QQqW0RlSoFRfnZelxKkjjuORRSjOtYWhSWb
```

### 2. Dependencies

Already installed via `yarn add eventsource`

## Usage

### Create a Monitoring Tap

Creates a new monitoring rule for FAS Motorsports:

```bash
node scripts/firehose-monitor.js create
```

This creates a tap with the following Lucene query:
```
"FAS Motorsports" OR "fasmotorsports.com" OR "FAS Performance" OR "FAS Racing" OR (FAS AND (motorsports OR performance OR racing OR automotive))
```

### List Existing Taps

View all your monitoring taps:

```bash
node scripts/firehose-monitor.js list
```

### Stream Real-Time Matches

Connect to the SSE stream and monitor matches in real-time:

```bash
node scripts/firehose-monitor.js stream <tap-id>
```

Example output:
```
─────────────────────────────────────────
NEW MATCH DETECTED
─────────────────────────────────────────
URL: https://example.com/article
Title: New FAS Motorsports Product Launch
Domain: example.com
Published: 2026-03-16T09:00:00Z
Snippet: FAS Motorsports announced today...
```

Press `Ctrl+C` to stop streaming.

### Ingest Mentions into Sanity

Stream matches and upsert them into Sanity as `brandMention` documents:

```bash
node scripts/firehose-monitor-fetch.js ingest <tap-id>
```

Use `--max` for a bounded test run:

```bash
node scripts/firehose-monitor-fetch.js ingest <tap-id> --max 5
```

If `<tap-id>` is omitted, the script uses `FIREHOSE_TAP_ID` from `.env`.
For Sanity writes, set `SANITY_WRITE_TOKEN` (or `SANITY_API_TOKEN`) with create/update permissions.

### Automated Schedule (Netlify)

A scheduled Netlify function is included:

- File: `netlify/functions/firehose-brand-ingest-cron.ts`
- Schedule: every 15 minutes
- Manual trigger endpoint: `/.netlify/functions/firehose-brand-ingest-cron`

Env controls:

- `FIREHOSE_INGEST_MAX_EVENTS` (default `25`)
- `FIREHOSE_INGEST_WINDOW_MS` (default `45000`)

## Query Syntax

The monitoring uses Lucene query syntax. Key patterns:

### Exact Phrases
```
"FAS Motorsports"
```

### Boolean Operators
```
FAS AND (motorsports OR performance)
```

### Wildcards
```
FAS*
```

### Field-Specific Queries
```
domain:fasmotorsports.com
title:"FAS Motorsports"
url:"/products/*"
```

### Available Fields

- **Text fields** (tokenized, case-insensitive):
  - `title` - Page title
  - `added` - New content detected
  - `removed` - Content removed
  - `added_anchor` - New anchor text
  - `removed_anchor` - Removed anchor text

- **Keyword fields** (exact match, case-sensitive):
  - `url` - Full URL
  - `domain` - Domain name
  - `publish_time` - Publication timestamp
  - `page_category` - Page category
  - `page_type` - Page type (article, product, etc.)
  - `language` - Language code (e.g., "en")

## Integration Ideas

### 1. Sanity CMS Storage

Use `ingest` mode (above). It deduplicates by URL hash and updates `seenCount`/`lastDetectedAt`.

### 2. SEO Engine Integration

Feed mentions into your SEO pipeline:

```javascript
// Save to SEO-Clients directory
const fs = require('fs');
const mentionsFile = `${process.env.HOME}/LocalStorm/SEO-Clients/fas-motorsports/brand-mentions.json`;
```

### 3. Slack/Email Notifications

Alert team when high-value mentions detected:

```javascript
if (match.domain.includes('major-publication.com')) {
  // Send notification
}
```

### 4. Competitor Analysis

Track competitor mentions alongside your brand:

```javascript
const competitorQuery = '"Competitor Motors" OR "competitor.com"';
```

## Next Steps

1. **Create your first tap**: `node scripts/firehose-monitor.js create`
2. **Start ingestion**: `node scripts/firehose-monitor-fetch.js ingest <tap-id>`
3. **Customize queries**: Edit `firehose-monitor-fetch.js` to refine your Lucene queries
4. **Add notifications/reporting**: Slack, email, or dashboards using Sanity data

## Resources

- [Firehose API Documentation](https://firehose.com/api-docs)
- [Lucene Query Syntax](https://lucene.apache.org/core/2_9_4/queryparsersyntax.html)
- [Use Cases](https://firehose.com/use-cases)

## Troubleshooting

### "Connection refused" errors

If you see connection errors, verify:
1. Management key is valid: `echo $FIREHOSE_MANAGEMENT_KEY`
2. Firehose API is accessible: Try from browser or Postman
3. Check Firehose status/docs for API changes

### No matches appearing

- Check your Lucene query syntax
- Verify language filters (default: English only)
- Consider broadening your query terms
- Monitor the tap for 24-48 hours (matches come as pages are crawled)

### SSL/TLS errors

The script uses Node's native HTTPS module which should handle modern TLS. If issues persist, check your Node version:
```bash
node --version  # Should be 18+
```
