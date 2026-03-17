import type { Handler } from '@netlify/functions';
import 'dotenv/config';
import { createClient } from '@sanity/client';
import * as EventSourceModule from 'eventsource';
import { createHash } from 'node:crypto';

const EventSource =
  (EventSourceModule as any).EventSource || (EventSourceModule as any).default || EventSourceModule;

export const config = {
  // Every 15 minutes
  schedule: '*/15 * * * *'
};

const FIREHOSE_BASE_URL = process.env.FIREHOSE_API_BASE_URL || 'https://api.firehose.com/v1';
const FIREHOSE_MANAGEMENT_KEY = process.env.FIREHOSE_MANAGEMENT_KEY || '';
const FIREHOSE_TAP_ID = process.env.FIREHOSE_TAP_ID || '';
const FIREHOSE_TAP_TOKEN = process.env.FIREHOSE_TAP_TOKEN || '';

const SANITY_PROJECT_ID =
  process.env.SANITY_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID || 'r4og35qd';
const SANITY_DATASET = process.env.SANITY_DATASET || process.env.PUBLIC_SANITY_DATASET || 'production';
const SANITY_API_VERSION = process.env.SANITY_API_VERSION || '2024-10-01';
const SANITY_WRITE_TOKEN =
  process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || process.env.SANITY_TOKEN || '';

const INGEST_MAX_EVENTS = Number(process.env.FIREHOSE_INGEST_MAX_EVENTS || 25);
const INGEST_WINDOW_MS = Number(process.env.FIREHOSE_INGEST_WINDOW_MS || 45000);

interface FirehoseMatch {
  url?: string;
  title?: string;
  domain?: string;
  snippet?: string;
  added?: string;
  language?: string;
  page_type?: string;
  page_category?: string;
  publish_time?: string;
  published?: string;
}

function normalizeUrl(value?: string): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function mentionIdFromMatch(match: FirehoseMatch): string {
  const canonical = normalizeUrl(match.url) || JSON.stringify(match);
  const hash = createHash('sha1').update(canonical).digest('hex').slice(0, 24);
  return `brandMention-${hash}`;
}

function toMentionDoc(match: FirehoseMatch, tapId: string, mentionId: string, nowIso: string) {
  return {
    _id: mentionId,
    _type: 'brandMention',
    source: 'firehose',
    sourceTapId: tapId,
    url: typeof match.url === 'string' ? match.url : '',
    title: typeof match.title === 'string' ? match.title : '',
    domain: typeof match.domain === 'string' ? match.domain : '',
    snippet:
      (typeof match.snippet === 'string' && match.snippet) ||
      (typeof match.added === 'string' && match.added) ||
      '',
    language: typeof match.language === 'string' ? match.language : '',
    pageType: typeof match.page_type === 'string' ? match.page_type : '',
    pageCategory: typeof match.page_category === 'string' ? match.page_category : '',
    publishedAt:
      (typeof match.publish_time === 'string' && match.publish_time) ||
      (typeof match.published === 'string' && match.published) ||
      null,
    firstDetectedAt: nowIso,
    lastDetectedAt: nowIso,
    seenCount: 0,
    rawPayload: JSON.stringify(match),
    readOnly: true
  };
}

function createSanityWriteClient() {
  if (!SANITY_WRITE_TOKEN) {
    throw new Error('Missing SANITY_WRITE_TOKEN (or SANITY_API_TOKEN).');
  }
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token: SANITY_WRITE_TOKEN,
    useCdn: false
  });
}

async function upsertMention(client: ReturnType<typeof createClient>, tapId: string, match: FirehoseMatch) {
  const nowIso = new Date().toISOString();
  const mentionId = mentionIdFromMatch(match);
  const baseDoc = toMentionDoc(match, tapId, mentionId, nowIso);

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
          rawPayload: baseDoc.rawPayload
        })
        .inc({ seenCount: 1 })
    )
    .commit();

  return mentionId;
}

export const handler: Handler = async (event) => {
  const isManual = event.httpMethod === 'GET' || event.httpMethod === 'POST';
  const label = isManual ? '[firehose-brand-ingest-cron][manual]' : '[firehose-brand-ingest-cron][scheduled]';

  if (!FIREHOSE_TAP_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Missing FIREHOSE_TAP_ID' })
    };
  }

  if (!FIREHOSE_MANAGEMENT_KEY && !FIREHOSE_TAP_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Missing FIREHOSE_MANAGEMENT_KEY or FIREHOSE_TAP_TOKEN' })
    };
  }

  const authToken = FIREHOSE_TAP_TOKEN || FIREHOSE_MANAGEMENT_KEY;
  const streamUrl = `${FIREHOSE_BASE_URL.replace(/\/$/, '')}/stream/${FIREHOSE_TAP_ID}`;
  const sanity = createSanityWriteClient();

  let received = 0;
  let stored = 0;
  let failed = 0;
  let terminationReason = 'window_elapsed';
  let pending = Promise.resolve();
  let streamError: string | null = null;

  console.log(`${label} start tap=${FIREHOSE_TAP_ID} maxEvents=${INGEST_MAX_EVENTS} windowMs=${INGEST_WINDOW_MS}`);

  await new Promise<void>((resolve) => {
    let done = false;
    const source = new EventSource(streamUrl, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const finish = async (reason: string) => {
      if (done) return;
      done = true;
      terminationReason = reason;
      clearTimeout(timer);
      source.close();
      await pending.catch(() => undefined);
      resolve();
    };

    const timer = setTimeout(() => {
      void finish('window_elapsed');
    }, Math.max(1000, INGEST_WINDOW_MS));

    source.onopen = () => {
      console.log(`${label} stream opened`);
    };

    source.onmessage = (message: MessageEvent) => {
      received += 1;
      pending = pending.then(async () => {
        try {
          const parsed = JSON.parse(message.data) as FirehoseMatch;
          await upsertMention(sanity, FIREHOSE_TAP_ID, parsed);
          stored += 1;
        } catch (err: any) {
          failed += 1;
          const msg = err?.message || String(err);
          console.error(`${label} ingest failed`, msg);
          if (err?.statusCode === 403 && msg.includes('permission')) {
            streamError = 'Sanity token lacks write permissions';
          }
        }
      });

      if (INGEST_MAX_EVENTS > 0 && received >= INGEST_MAX_EVENTS) {
        void finish('max_events_reached');
      }
    };

    source.onerror = (err: any) => {
      const maybeMessage = err?.message || 'stream_error';
      console.error(`${label} stream error`, maybeMessage);
      streamError = maybeMessage;
      void finish('stream_error');
    };
  });

  const ok = !streamError || (terminationReason !== 'stream_error' && stored > 0);
  const statusCode = ok ? 200 : 500;
  const body = {
    ok,
    tapId: FIREHOSE_TAP_ID,
    received,
    stored,
    failed,
    terminationReason,
    ...(streamError ? { streamError } : {})
  };

  console.log(`${label} done`, body);
  return {
    statusCode,
    body: JSON.stringify(body)
  };
};

export default { handler, config };
