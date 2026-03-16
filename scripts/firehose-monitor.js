/**
 * Firehose Brand Monitoring for FAS Motorsports
 * Creates a monitoring tap and streams real-time web mentions
 */

import https from 'https';
import * as EventSourceModule from 'eventsource';
import { config } from 'dotenv';

const EventSource = EventSourceModule.default || EventSourceModule;

// Load environment variables
config();

const FIREHOSE_API_BASE = 'https://api.firehose.com/v1';
const MANAGEMENT_KEY = process.env.FIREHOSE_MANAGEMENT_KEY || 'fhm_j44D2QQqW0RlSoFRfnZelxKkjjuORRSjOtYWhSWb';

/**
 * Make authenticated request to Firehose API
 */
async function firehoseRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, FIREHOSE_API_BASE);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${MANAGEMENT_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Create a monitoring tap for FAS Motorsports
 * Uses Lucene query syntax to match brand mentions
 */
async function createFASMonitoringTap() {
  console.log('Creating FAS Motorsports monitoring tap...\n');

  // Lucene query to catch various brand mentions
  const luceneQuery = [
    '"FAS Motorsports"',
    '"fasmotorsports.com"',
    '"FAS Performance"',
    '"FAS Racing"',
    '(FAS AND (motorsports OR performance OR racing OR automotive))',
  ].join(' OR ');

  const tapConfig = {
    name: 'FAS Motorsports Brand Monitor',
    query: luceneQuery,
    description: 'Real-time monitoring of FAS Motorsports brand mentions across the web',
    // Optional: Add filters for specific domains, languages, etc.
    filters: {
      language: 'en', // English content only
      // page_type: 'article', // Uncomment to limit to articles
    },
  };

  try {
    const response = await firehoseRequest('POST', '/taps', tapConfig);

    if (response.status === 200 || response.status === 201) {
      console.log('✓ Tap created successfully!');
      console.log('Tap ID:', response.data.id || response.data.tap_id);
      console.log('Query:', luceneQuery);
      console.log('\n');
      return response.data;
    } else {
      console.error('Failed to create tap:', response.status, response.data);
      return null;
    }
  } catch (error) {
    console.error('Error creating tap:', error.message);
    return null;
  }
}

/**
 * List existing taps
 */
async function listTaps() {
  try {
    const response = await firehoseRequest('GET', '/taps');

    if (response.status === 200) {
      console.log('Existing taps:');
      console.log(JSON.stringify(response.data, null, 2));
      return response.data;
    } else {
      console.error('Failed to list taps:', response.status, response.data);
      return null;
    }
  } catch (error) {
    console.error('Error listing taps:', error.message);
    return null;
  }
}

/**
 * Connect to SSE stream and monitor for matches
 */
function streamMatches(tapId) {
  console.log(`Connecting to SSE stream for tap ${tapId}...\n`);

  const streamUrl = `${FIREHOSE_API_BASE}/stream/${tapId}`;
  const eventSource = new EventSource(streamUrl, {
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_KEY}`,
    },
  });

  eventSource.onopen = () => {
    console.log('✓ Connected to Firehose stream');
    console.log('Monitoring for FAS Motorsports mentions...\n');
  };

  eventSource.onmessage = (event) => {
    try {
      const match = JSON.parse(event.data);
      console.log('─────────────────────────────────────────');
      console.log('NEW MATCH DETECTED');
      console.log('─────────────────────────────────────────');
      console.log('URL:', match.url);
      console.log('Title:', match.title);
      console.log('Domain:', match.domain);
      console.log('Published:', match.publish_time || 'Unknown');
      console.log('Snippet:', match.snippet || match.added?.substring(0, 200) || 'N/A');
      console.log('\n');

      // TODO: Store to database, send notification, etc.
      // Could integrate with Sanity CMS or SEO Engine
    } catch (e) {
      console.error('Error parsing event:', e.message);
    }
  };

  eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
  };

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nClosing stream...');
    eventSource.close();
    process.exit(0);
  });
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'create';

  switch (command) {
    case 'list':
      await listTaps();
      break;

    case 'create':
      const tap = await createFASMonitoringTap();
      if (tap && (tap.id || tap.tap_id)) {
        console.log('Tap created! To start monitoring, run:');
        console.log(`  node scripts/firehose-monitor.js stream ${tap.id || tap.tap_id}`);
      }
      break;

    case 'stream':
      const tapId = process.argv[3];
      if (!tapId) {
        console.error('Error: Tap ID required for streaming');
        console.log('Usage: node scripts/firehose-monitor.js stream <tap-id>');
        process.exit(1);
      }
      streamMatches(tapId);
      break;

    default:
      console.log('Usage:');
      console.log('  node scripts/firehose-monitor.js create   - Create new monitoring tap');
      console.log('  node scripts/firehose-monitor.js list     - List existing taps');
      console.log('  node scripts/firehose-monitor.js stream <tap-id> - Stream matches from tap');
  }
}

main().catch(console.error);
