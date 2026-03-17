// =============================================================================
// Sanity → Medusa reconciliation cron
// =============================================================================
// Runs every 6 hours. Finds Sanity products that are published but have no
// medusaProductId (i.e. the initial webhook was missed or failed) and re-fires
// the sync by POSTing each product ID to the Medusa sanity-product-sync webhook.
//
// Required env vars on Netlify:
//   SANITY_PROJECT_ID / PUBLIC_SANITY_PROJECT_ID
//   SANITY_DATASET   / PUBLIC_SANITY_DATASET
//   SANITY_API_TOKEN
//   MEDUSA_API_BASE_URL   (e.g. https://api.fasmotorsports.com)
//   SANITY_WEBHOOK_SECRET (shared with fas-medusa for HMAC signing)
// =============================================================================

import type { Handler } from '@netlify/functions';
import { createHmac } from 'crypto';
import { sanity } from './_sanity';

// ── Config ────────────────────────────────────────────────────────────────────

export const config = { schedule: '0 */6 * * *' };

const MEDUSA_API_BASE =
  (process.env.MEDUSA_API_BASE_URL || 'https://api.fasmotorsports.com').replace(/\/$/, '');

const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET || '';

/** Max products to re-sync per run — prevents thundering-herd if Sanity has many unpublished */
const BATCH_LIMIT = 50;
/** Delay between individual product syncs (ms) — avoids overloading Railway */
const THROTTLE_MS = 300;

// ── HMAC helper ───────────────────────────────────────────────────────────────

const signPayload = (body: string, secret: string): string =>
  createHmac('sha256', secret).update(Buffer.from(body, 'utf8')).digest('hex');

// ── Throttle helper ───────────────────────────────────────────────────────────

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// ── Types ─────────────────────────────────────────────────────────────────────

interface SanityProductStub {
  _id: string;
  title?: string;
  contentStatus?: string;
  medusaProductId?: string | null;
}

interface SyncResult {
  sanityId: string;
  title?: string;
  ok: boolean;
  status?: number;
  error?: string;
}

// ── Core logic ────────────────────────────────────────────────────────────────

/** Fetch published Sanity products that have never been synced to Medusa */
const fetchUnsynced = async (): Promise<SanityProductStub[]> => {
  // Query for published products with no medusaProductId written back yet
  const results = await sanity.fetch<SanityProductStub[]>(
    `*[
      _type == "product" &&
      contentStatus == "published" &&
      !defined(medusaProductId)
    ] | order(_updatedAt desc) [0...$limit] {
      _id,
      title,
      contentStatus,
      medusaProductId
    }`,
    { limit: BATCH_LIMIT }
  );
  return results || [];
};

/** POST a single Sanity product ID to the Medusa sync webhook */
const triggerSync = async (sanityId: string): Promise<SyncResult & { sanityId: string }> => {
  const endpoint = `${MEDUSA_API_BASE}/webhooks/sanity-product-sync`;

  // Payload mirrors what Sanity sends on publish
  const payload = JSON.stringify({
    _type: 'product',
    _id: sanityId,
    documentId: sanityId,
    operation: 'upsert',
    // Include a synthetic `after` document so the webhook can validate contentStatus
    after: { _id: sanityId, _type: 'product', contentStatus: 'published' }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Allow the Medusa webhook to correlate reconciler-sourced events
    'x-fas-reconcile': 'true',
    'x-fas-forwarded-event-id': `reconcile-${sanityId}-${Date.now()}`
  };

  if (SANITY_WEBHOOK_SECRET) {
    headers['x-sanity-signature'] = signPayload(payload, SANITY_WEBHOOK_SECRET);
  }

  try {
    const res = await fetch(endpoint, { method: 'POST', headers, body: payload });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        sanityId,
        ok: false,
        status: res.status,
        error: (body as { error?: string }).error || `HTTP ${res.status}`
      };
    }
    return { sanityId, ok: true, status: res.status };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { sanityId, ok: false, error: message };
  }
};

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  const isManualTrigger = event?.httpMethod === 'POST' || event?.httpMethod === 'GET';
  const label = isManualTrigger ? '[sanity-medusa-reconcile-cron][manual]' : '[sanity-medusa-reconcile-cron][scheduled]';

  try {
    const unsynced = await fetchUnsynced();
    console.log(`${label} Found ${unsynced.length} unsynced published products`);

    if (unsynced.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, reconciled: 0, message: 'No unsynced products found' })
      };
    }

    const results: SyncResult[] = [];

    for (const product of unsynced) {
      const result = await triggerSync(product._id);
      results.push({ ...result, title: product.title });

      if (result.ok) {
        console.log(`${label} ✓ Triggered sync for ${product._id} (${product.title ?? 'no title'})`);
      } else {
        console.error(
          `${label} ✗ Failed to trigger sync for ${product._id}: ${result.error ?? result.status}`
        );
      }

      // Throttle to avoid overloading Railway / Medusa
      if (unsynced.indexOf(product) < unsynced.length - 1) {
        await sleep(THROTTLE_MS);
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    console.log(`${label} Done — ${succeeded} triggered, ${failed} failed`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        total: unsynced.length,
        triggered: succeeded,
        failed,
        results: results.map((r) => ({
          sanityId: r.sanityId,
          title: r.title,
          ok: r.ok,
          ...(r.error ? { error: r.error } : {}),
          ...(r.status ? { status: r.status } : {})
        }))
      })
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${label} Unhandled error:`, message);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: message })
    };
  }
};

export default { handler, config };
