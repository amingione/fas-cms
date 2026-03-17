/**
 * Firehose Brand Monitoring for FAS Motorsports (Fetch API version)
 * Creates a monitoring tap and streams real-time web mentions
 */

import * as EventSourceModule from 'eventsource';
import { config } from 'dotenv';
import {createClient} from '@sanity/client';
import {createHash} from 'node:crypto';

const EventSource = EventSourceModule.EventSource || EventSourceModule.default || EventSourceModule;

// Load environment variables
config();

// Try multiple possible API base URLs
const API_CANDIDATES = [
  'https://api.firehose.com/v1',
  'https://firehose.com/api/v1',
  'https://api.firehose.io/v1',
  'https://firehose.io/api/v1',
];

const MANAGEMENT_KEY = process.env.FIREHOSE_MANAGEMENT_KEY || 'fhm_j44D2QQqW0RlSoFRfnZelxKkjjuORRSjOtYWhSWb';
const DEFAULT_TAP_ID = process.env.FIREHOSE_TAP_ID || '';
const SANITY_PROJECT_ID =
  process.env.SANITY_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID || 'r4og35qd';
const SANITY_DATASET =
  process.env.SANITY_DATASET || process.env.PUBLIC_SANITY_DATASET || 'production';
const SANITY_API_VERSION = process.env.SANITY_API_VERSION || '2024-10-01';
const SANITY_API_TOKEN = process.env.SANITY_API_TOKEN || '';
const SANITY_WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || SANITY_API_TOKEN;

/**
 * Make authenticated request to Firehose API using fetch
 */
async function firehoseRequest(method, endpoint, data = null, baseUrl = API_CANDIDATES[0]) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  const url = new URL(normalizedEndpoint, normalizedBase);

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'FAS-Motorsports-Monitor/1.0',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt === 1) {
        console.log(`→ ${method} ${url.toString()}`);
      } else {
        console.log(`↻ Retry ${attempt}/${maxAttempts}: ${method} ${url.toString()}`);
      }

      const response = await fetch(url.toString(), options);

      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        url: url.toString(),
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      const code = error?.cause?.code || '';
      const retryable = code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND';
      console.error(`✗ Request failed: ${error.message}${code ? ` (${code})` : ''}`);
      if (!retryable || attempt === maxAttempts) {
        return {
          status: 0,
          ok: false,
          url: url.toString(),
          error: error.message,
          data: null,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

/**
 * Test API connectivity by trying multiple endpoints
 */
async function testConnectivity() {
  console.log('Testing Firehose API connectivity...\n');

  for (const baseUrl of API_CANDIDATES) {
    console.log(`Testing: ${baseUrl}`);
    const result = await firehoseRequest('GET', '/taps', null, baseUrl);
    const contentType = result.headers?.['content-type'] || '';
    const looksJson = contentType.includes('application/json');

    if (result.ok && looksJson) {
      console.log(`✓ Success! API base URL: ${baseUrl}\n`);
      return baseUrl;
    } else {
      if (result.ok && !looksJson) {
        console.log(`✗ Failed (non-JSON response from ${result.url})\n`);
      } else {
        console.log(`✗ Failed (${result.status} ${result.statusText})\n`);
      }
    }
  }

  console.log('Could not find working API endpoint. Possible issues:');
  console.log('1. API might be down or under maintenance');
  console.log('2. Management key might be invalid');
  console.log('3. API endpoint structure might be different');
  console.log('\nPlease check:');
  console.log('- Firehose API documentation: https://firehose.com/api-docs');
  console.log('- Your management key is valid');
  console.log('- API status page (if available)\n');

  return null;
}

/**
 * Create a monitoring tap for FAS Motorsports
 */
async function createFASMonitoringTap(baseUrl = API_CANDIDATES[0]) {
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
    filters: {
      language: 'en',
    },
  };

  console.log('Lucene Query:', luceneQuery);
  console.log('');

  const response = await firehoseRequest('POST', '/taps', tapConfig, baseUrl);

  if (response.ok) {
    const tap = response.data?.data || response.data;
    console.log('✓ Tap created successfully!');
    console.log(JSON.stringify(tap, null, 2));
    console.log('');
    return tap;
  } else {
    console.error('✗ Failed to create tap');
    console.error('Status:', response.status, response.statusText);
    console.error('Response:', response.data);
    console.error('');
    return null;
  }
}

/**
 * List existing taps
 */
async function listTaps(baseUrl = API_CANDIDATES[0]) {
  console.log('Fetching existing taps...\n');

  const response = await firehoseRequest('GET', '/taps', null, baseUrl);

  if (response.ok) {
    console.log('✓ Taps retrieved:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    return response.data;
  } else {
    console.error('✗ Failed to list taps');
    console.error('Status:', response.status, response.statusText);
    console.error('Response:', response.data);
    console.error('');
    return null;
  }
}

/**
 * Get tap details
 */
async function getTapDetails(tapId, baseUrl = API_CANDIDATES[0]) {
  console.log(`Fetching details for tap ${tapId}...\n`);

  const response = await firehoseRequest('GET', `/taps/${tapId}`, null, baseUrl);

  if (response.ok) {
    console.log('✓ Tap details:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    return response.data;
  } else {
    console.error('✗ Failed to get tap details');
    console.error('Status:', response.status, response.statusText);
    console.error('Response:', response.data);
    console.error('');
    return null;
  }
}

/**
 * Connect to SSE stream and monitor for matches
 */
function streamMatches(tapId, baseUrl = API_CANDIDATES[0]) {
  console.log(`Connecting to SSE stream for tap ${tapId}...\n`);

  const streamUrl = `${baseUrl}/stream/${tapId}`;
  console.log('Stream URL:', streamUrl);
  console.log('');

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
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔥 NEW MATCH DETECTED');
      console.log('═══════════════════════════════════════════════════════');
      console.log('URL:', match.url);
      console.log('Title:', match.title || 'N/A');
      console.log('Domain:', match.domain);
      console.log('Published:', match.publish_time || match.published || 'Unknown');
      console.log('Language:', match.language || 'N/A');
      console.log('Type:', match.page_type || 'N/A');
      if (match.snippet || match.added) {
        console.log('Snippet:');
        console.log((match.snippet || match.added)?.substring(0, 300) + '...');
      }
      console.log('═══════════════════════════════════════════════════════\n');

      // TODO: Integrate with your systems
      // - Store in Sanity CMS
      // - Add to SEO Engine
      // - Send notifications
      // - Update dashboards
    } catch (e) {
      console.error('Error parsing event:', e.message);
      console.log('Raw event data:', event.data);
    }
  };

  eventSource.onerror = (error) => {
    console.error('✗ Stream error:', error.message || error);
    if (error.status) {
      console.error('Status:', error.status);
    }
    eventSource.close();
  };

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nClosing stream...');
    eventSource.close();
    process.exit(0);
  });

  console.log('Press Ctrl+C to stop monitoring\n');
}

function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function makeMentionId(match) {
  const canonicalKey = normalizeUrl(match?.url) || JSON.stringify(match);
  const hash = createHash('sha1').update(canonicalKey).digest('hex').slice(0, 24);
  return `brandMention-${hash}`;
}

function toBrandMentionDoc(match, tapId, mentionId, nowIso) {
  const url = typeof match?.url === 'string' ? match.url : '';
  const title = typeof match?.title === 'string' ? match.title : '';
  const domain = typeof match?.domain === 'string' ? match.domain : '';
  const publishedAt =
    (typeof match?.publish_time === 'string' && match.publish_time) ||
    (typeof match?.published === 'string' && match.published) ||
    null;
  const snippet =
    (typeof match?.snippet === 'string' && match.snippet) ||
    (typeof match?.added === 'string' && match.added) ||
    '';

  return {
    _id: mentionId,
    _type: 'brandMention',
    source: 'firehose',
    sourceTapId: tapId,
    url,
    title,
    domain,
    snippet,
    language: typeof match?.language === 'string' ? match.language : '',
    pageType: typeof match?.page_type === 'string' ? match.page_type : '',
    pageCategory: typeof match?.page_category === 'string' ? match.page_category : '',
    publishedAt,
    firstDetectedAt: nowIso,
    lastDetectedAt: nowIso,
    seenCount: 0,
    rawPayload: JSON.stringify(match),
    readOnly: true,
  };
}

function createSanityWriteClient() {
  if (!SANITY_WRITE_TOKEN) {
    throw new Error('Missing SANITY_WRITE_TOKEN (or SANITY_API_TOKEN) for Firehose ingestion.');
  }
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token: SANITY_WRITE_TOKEN,
    useCdn: false,
  });
}

async function upsertBrandMention(client, match, tapId) {
  const nowIso = new Date().toISOString();
  const mentionId = makeMentionId(match);
  const baseDoc = toBrandMentionDoc(match, tapId, mentionId, nowIso);

  try {
    await client
      .transaction()
      .createIfNotExists(baseDoc)
      .patch(mentionId, (patch) =>
        patch
          .set({
            title: baseDoc.title,
            domain: baseDoc.domain,
            snippet: baseDoc.snippet,
            language: baseDoc.language,
            pageType: baseDoc.pageType,
            pageCategory: baseDoc.pageCategory,
            publishedAt: baseDoc.publishedAt,
            lastDetectedAt: nowIso,
            rawPayload: baseDoc.rawPayload,
          })
          .inc({seenCount: 1})
      )
      .commit();
  } catch (error) {
    if (error?.statusCode === 403) {
      throw new Error(
        'Sanity write denied (403). Use a token with create/update permissions (set SANITY_WRITE_TOKEN).'
      );
    }
    throw error;
  }

  return mentionId;
}

function streamAndIngestMatches(tapId, baseUrl = API_CANDIDATES[0], maxMatches = 0) {
  const sanity = createSanityWriteClient();
  const streamUrl = `${baseUrl}/stream/${tapId}`;
  let received = 0;
  let stored = 0;
  let failed = 0;

  console.log(`Connecting to SSE stream for tap ${tapId}...\n`);
  console.log(`Stream URL: ${streamUrl}`);
  console.log(`Sanity target: ${SANITY_PROJECT_ID}/${SANITY_DATASET}`);
  if (maxMatches > 0) {
    console.log(`Auto-stop after ${maxMatches} matches.`);
  }
  console.log('');

  const eventSource = new EventSource(streamUrl, {
    headers: {
      Authorization: `Bearer ${MANAGEMENT_KEY}`,
    },
  });

  const closeWithSummary = (code = 0) => {
    eventSource.close();
    console.log('\n──────────────────────────────────────────');
    console.log('Ingestion summary');
    console.log('──────────────────────────────────────────');
    console.log(`Received: ${received}`);
    console.log(`Stored:   ${stored}`);
    console.log(`Failed:   ${failed}`);
    process.exit(code);
  };

  eventSource.onopen = () => {
    console.log('✓ Connected to Firehose stream');
    console.log('Streaming + writing mentions into Sanity...\n');
  };

  eventSource.onmessage = async (event) => {
    received += 1;
    try {
      const match = JSON.parse(event.data);
      const mentionId = await upsertBrandMention(sanity, match, tapId);
      stored += 1;
      console.log(`✓ [${stored}] ${match.url || 'N/A'} -> ${mentionId}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ [${received}] ingest failed: ${error.message}`);
    }

    if (maxMatches > 0 && received >= maxMatches) {
      closeWithSummary(0);
    }
  };

  eventSource.onerror = (error) => {
    console.error('✗ Stream error:', error.message || error);
    closeWithSummary(1);
  };

  process.on('SIGINT', () => {
    closeWithSummary(0);
  });

  console.log('Press Ctrl+C to stop ingestion\n');
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'help';

  // First, find a working API base for any command that calls the API
  let apiBase = API_CANDIDATES[0];
  const requiresApi = command !== 'help';

  if (requiresApi) {
    console.log('────────────────────────────────────────────────────────');
    console.log('Firehose Brand Monitoring - FAS Motorsports');
    console.log('────────────────────────────────────────────────────────\n');

    const detectedApiBase = await testConnectivity();
    if (!detectedApiBase) {
      process.exit(1);
    }
    apiBase = detectedApiBase;
  }

  switch (command) {
    case 'test':
      console.log(`Use this API base for future requests: ${apiBase}`);
      break;

    case 'list':
      await listTaps(apiBase);
      break;

    case 'create':
      const tap = await createFASMonitoringTap(apiBase);
      if (tap && (tap.id || tap.tap_id)) {
        const tapId = tap.id || tap.tap_id;
        console.log('──────────────────────────────────────────');
        console.log('Next steps:');
        console.log('──────────────────────────────────────────');
        console.log(`1. View tap details:   node scripts/firehose-monitor-fetch.js details ${tapId}`);
        console.log(`2. Start monitoring:   node scripts/firehose-monitor-fetch.js stream ${tapId}`);
        console.log('');
      }
      break;

    case 'details':
      const detailsTapId = process.argv[3];
      if (!detailsTapId) {
        console.error('Error: Tap ID required');
        console.log('Usage: node scripts/firehose-monitor-fetch.js details <tap-id>');
        process.exit(1);
      }
      await getTapDetails(detailsTapId, apiBase);
      break;

    case 'stream':
      const streamTapId = process.argv[3];
      if (!streamTapId) {
        console.error('Error: Tap ID required for streaming');
        console.log('Usage: node scripts/firehose-monitor-fetch.js stream <tap-id>');
        process.exit(1);
      }
      streamMatches(streamTapId, apiBase);
      break;

    case 'ingest':
      const ingestTapId = process.argv[3] || DEFAULT_TAP_ID;
      if (!ingestTapId) {
        console.error('Error: Tap ID required for ingestion');
        console.log('Usage: node scripts/firehose-monitor-fetch.js ingest <tap-id> [--max N]');
        process.exit(1);
      }
      const maxFlagIndex = process.argv.indexOf('--max');
      let maxMatches = 0;
      if (maxFlagIndex > -1 && process.argv[maxFlagIndex + 1]) {
        maxMatches = Number(process.argv[maxFlagIndex + 1]) || 0;
      }
      streamAndIngestMatches(ingestTapId, apiBase, maxMatches);
      break;

    case 'help':
    default:
      console.log('Firehose Brand Monitoring - FAS Motorsports\n');
      console.log('Usage:');
      console.log('  node scripts/firehose-monitor-fetch.js <command> [options]\n');
      console.log('Commands:');
      console.log('  test              Test API connectivity and find working endpoint');
      console.log('  create            Create new FAS Motorsports monitoring tap');
      console.log('  list              List all existing taps');
      console.log('  details <tap-id>  Get details for a specific tap');
      console.log('  stream <tap-id>   Connect to SSE stream and monitor matches');
      console.log('  ingest <tap-id>   Stream matches and upsert them into Sanity');
      console.log('  help              Show this help message\n');
      console.log('Examples:');
      console.log('  node scripts/firehose-monitor-fetch.js test');
      console.log('  node scripts/firehose-monitor-fetch.js create');
      console.log('  node scripts/firehose-monitor-fetch.js stream abc123');
      console.log('  node scripts/firehose-monitor-fetch.js ingest abc123 --max 5\n');
      console.log('Environment:');
      console.log(`  FIREHOSE_MANAGEMENT_KEY: ${MANAGEMENT_KEY ? '✓ Set' : '✗ Not set'}`);
      console.log(`  SANITY_WRITE_TOKEN: ${SANITY_WRITE_TOKEN ? '✓ Set' : '✗ Not set'}\n`);
  }
}

main().catch(console.error);
