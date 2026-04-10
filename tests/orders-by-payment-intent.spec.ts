/**
 * Tests for rate-limiting and caching behavior of GET /api/orders/by-payment-intent
 *
 * Each test re-imports the route with fresh module state so the in-memory
 * rate-limit buckets and order cache start empty.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the minimal Astro `APIContext`-like object the route needs. */
function makeCtx(paymentIntentId: string | null, clientAddress = '127.0.0.1') {
  const rawUrl =
    paymentIntentId != null
      ? `https://example.com/api/orders/by-payment-intent?id=${encodeURIComponent(paymentIntentId)}`
      : 'https://example.com/api/orders/by-payment-intent';
  return { url: new URL(rawUrl), clientAddress } as any;
}

/** Fake Medusa order whose payment session matches `paymentIntentId`. */
function fakeMedusaOrder(paymentIntentId: string) {
  return {
    id: 'order_test_123',
    display_id: 42,
    total: 9900,
    shipping_total: 500,
    email: 'customer@example.com',
    shipping_address: {
      first_name: 'Jane',
      last_name: 'Doe',
      address_1: '1 Main St',
      address_2: null,
      city: 'Anytown',
      province: 'CA',
      postal_code: '90210',
      country_code: 'US'
    },
    payment_sessions: [{ data: { id: paymentIntentId } }]
  };
}

/** Successful single-page Medusa admin API response. */
function medusaHit(paymentIntentId: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ orders: [fakeMedusaOrder(paymentIntentId)], count: 1 })
  };
}

/** Medusa response with no matching orders. */
function medusaMiss() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ orders: [], count: 0 })
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GET /api/orders/by-payment-intent', () => {
  let GET: (ctx: any) => Promise<Response>;

  beforeEach(async () => {
    // Fresh module state for every test (resets rate-limit buckets + cache).
    vi.resetModules();

    // Provide required environment variables.
    process.env.MEDUSA_BACKEND_URL = 'https://medusa.test';
    process.env.MEDUSA_SECRET_KEY = 'sk_test_secret';

    // Mock AWS secret retrieval so the route doesn't need real credentials.
    vi.doMock('@/server/aws-secrets', () => ({
      getSecret: vi.fn().mockResolvedValue(undefined) // falls back to MEDUSA_SECRET_KEY
    }));

    // Import the route with the fresh module graph.
    const mod = await import('../src/pages/api/orders/by-payment-intent');
    GET = (mod as any).GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.MEDUSA_BACKEND_URL;
    delete process.env.MEDUSA_SECRET_KEY;
  });

  // ── Input validation ───────────────────────────────────────────────────────

  it('returns 400 when the id query parameter is absent', async () => {
    const res = await GET(makeCtx(null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  // ── Per-payment-intent rate limiting ──────────────────────────────────────

  it('returns 429 after exceeding the per-payment-intent limit (10/min)', async () => {
    // Use fake timers so the route's retry delays don't slow the test.
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    try {
      const id = 'pi_rl_intent_test';
      // Exhaust the 10-request allowance.
      for (let i = 0; i < 10; i++) {
        const p = GET(makeCtx(id));
        await vi.runAllTimersAsync();
        const res = await p;
        expect(res.status).not.toBe(429);
      }

      // The 11th request must be rate-limited (returned synchronously before any fetch).
      const limited = await GET(makeCtx(id));
      expect(limited.status).toBe(429);
      expect(limited.headers.get('Retry-After')).toBeTruthy();
      const body = await limited.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/rate limit/i);
    } finally {
      vi.useRealTimers();
    }
  });

  // ── Per-client rate limiting ───────────────────────────────────────────────

  it('returns 429 after exceeding the per-client limit (30/min) across different payment intents', async () => {
    // Use fake timers so the route's retry delays don't slow the test.
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const clientIp = '192.0.2.1';

    try {
      // Exhaust the 30-request per-client allowance using unique payment intents
      // (so the per-intent limit is never individually hit).
      for (let i = 0; i < 30; i++) {
        const p = GET(makeCtx(`pi_client_cycle_${i}`, clientIp));
        await vi.runAllTimersAsync();
        const res = await p;
        expect(res.status).not.toBe(429);
      }

      // The 31st request from the same IP should be rate-limited.
      const limited = await GET(makeCtx('pi_client_cycle_new', clientIp));
      expect(limited.status).toBe(429);
      expect(limited.headers.get('Retry-After')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  // ── In-memory caching ─────────────────────────────────────────────────────

  it('returns X-Cache: MISS on first successful lookup', async () => {
    const id = 'pi_cache_miss_test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(medusaHit(id)));

    const res = await GET(makeCtx(id));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache')).toBe('MISS');
    const body = await res.json();
    expect(body.orderId).toBe('order_test_123');
    expect(body.email).toBe('customer@example.com');
  });

  it('returns X-Cache: HIT on a repeated lookup for the same payment intent', async () => {
    const id = 'pi_cache_hit_test';
    const fetchMock = vi.fn().mockResolvedValue(medusaHit(id));
    vi.stubGlobal('fetch', fetchMock);

    // Prime the cache.
    const first = await GET(makeCtx(id));
    expect(first.status).toBe(200);
    expect(first.headers.get('X-Cache')).toBe('MISS');

    // Cached response — fetch must not be called again.
    const second = await GET(makeCtx(id));
    expect(second.status).toBe(200);
    expect(second.headers.get('X-Cache')).toBe('HIT');
    // fetch was called exactly once (for the initial scan).
    expect(fetchMock).toHaveBeenCalledOnce();

    // Response body must match the cached data.
    const body = await second.json();
    expect(body.orderId).toBe('order_test_123');
    expect(body.displayId).toBe(42);
  });

  it('includes X-RateLimit-Remaining header on cache HIT', async () => {
    const id = 'pi_cache_header_test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(medusaHit(id)));

    await GET(makeCtx(id)); // prime cache
    const res = await GET(makeCtx(id)); // cache hit
    expect(res.headers.get('X-RateLimit-Remaining')).not.toBeNull();
  });
});
