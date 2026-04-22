// apps/web/src/lib/api-rate-limit.ts
//
// Task 3 — DoS defense-in-depth helper.
//
// Scope: simple per-IP in-memory token bucket for Astro API routes that
// front expensive downstream calls (Vendure Shop API, Sanity GROQ). Small,
// dependency-free, and stateless enough to be safe in serverless (Netlify
// Function instance reuse gives us best-effort rate-limiting per region;
// the first request through a cold instance always succeeds, which is
// acceptable for the threat model — we're limiting sustained abuse, not
// single-request misuse).
//
// This is NOT a replacement for a real edge-rate-limiter (Netlify Edge,
// Cloudflare, etc.) for sustained high-volume attacks. It's a cheap
// last-mile layer that keeps a single misbehaving caller from saturating
// the Vendure/Sanity tier when the edge layer is bypassed or misconfigured.
//
// Threat model this addresses:
//   - Scripted enumeration of `check-by-payment-intent` to probe for
//     valid payment_intent IDs (unauthenticated scan vector).
//   - Repeat hits on `by-payment-intent` with brute-forced orderCodes
//     trying to land on a real one to mint PII responses.
//   - Accidental infinite-retry loops in client code (seen in the wild
//     when a confirmation page mishandles 202/425 responses).
//
// Not addressed by this module (intentional):
//   - Cryptographic signing / token auth — see `order-confirmation-token.ts`
//   - Distributed rate limiting across instances — use an edge layer
//   - Authentication — see `server/auth/session.ts`

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  max: number;
  /** Window size in milliseconds. Tokens refill linearly across the window. */
  windowMs: number;
  /** Namespace prefix — pick a short slug per endpoint to keep buckets isolated. */
  namespace: string;
}

export interface RateLimitResult {
  /** True if the request is allowed; false if rate-limit exceeded. */
  allowed: boolean;
  /** Remaining tokens in the current window after this check. */
  remaining: number;
  /** When (in ms since epoch) the bucket fully refills. Use for `Retry-After` / `X-RateLimit-Reset`. */
  resetsAt: number;
  /** Identifier used for the bucket lookup — useful for logging abuse patterns. */
  key: string;
}

interface BucketState {
  /** Tokens currently in the bucket (can be fractional after refill). */
  tokens: number;
  /** Timestamp (ms) of the last refill calculation. */
  lastRefillAt: number;
}

/**
 * In-memory bucket store. Key = `${namespace}:${ip}`.
 *
 * Node/V8 retains this across warm function invocations on the same
 * instance — that's the mechanism that makes the limiter useful. On cold
 * starts the map is empty and the first burst slips through; we accept
 * that tradeoff to avoid a Redis dependency for a defense-in-depth layer.
 */
const buckets: Map<string, BucketState> = new Map();

/**
 * Naive LRU-ish eviction: cap the map at 10k entries to prevent unbounded
 * memory growth from a rotating-IP attack. When we hit the cap, drop the
 * oldest quarter (by lastRefillAt). Simple and predictable.
 */
const MAX_BUCKETS = 10_000;
const EVICTION_FRACTION = 0.25;

function evictIfNecessary(): void {
  if (buckets.size <= MAX_BUCKETS) return;
  const entries = Array.from(buckets.entries()).sort(
    ([, a], [, b]) => a.lastRefillAt - b.lastRefillAt
  );
  const evictCount = Math.ceil(entries.length * EVICTION_FRACTION);
  for (let i = 0; i < evictCount; i++) {
    buckets.delete(entries[i]![0]);
  }
}

/**
 * Extract the client IP from request headers, preferring the forwarded
 * header chain that Netlify / Vercel / Railway populate. Falls back to a
 * stable "unknown" sentinel that shares a bucket — which is the correct
 * failure mode (one misconfigured deploy shouldn't accidentally bypass
 * rate-limiting for everyone).
 */
export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) return clientIp.trim();
  return 'unknown';
}

/**
 * Check and decrement the bucket for this request. If the bucket has a
 * token, consume it and return `allowed: true`. If empty, return
 * `allowed: false` — the caller should respond with 429.
 */
export function checkRateLimit(
  request: Request,
  options: RateLimitOptions
): RateLimitResult {
  const ip = extractClientIp(request);
  const key = `${options.namespace}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: options.max, lastRefillAt: now };
    evictIfNecessary();
    buckets.set(key, bucket);
  }

  // Linear refill: tokens regenerate proportionally to time elapsed.
  const elapsed = now - bucket.lastRefillAt;
  if (elapsed > 0) {
    const refillRate = options.max / options.windowMs; // tokens per ms
    bucket.tokens = Math.min(options.max, bucket.tokens + elapsed * refillRate);
    bucket.lastRefillAt = now;
  }

  const allowed = bucket.tokens >= 1;
  if (allowed) {
    bucket.tokens -= 1;
  }

  const tokensShort = Math.max(0, options.max - bucket.tokens);
  const msToFullRefill = (tokensShort / options.max) * options.windowMs;
  const resetsAt = now + Math.ceil(msToFullRefill);

  return {
    allowed,
    remaining: Math.max(0, Math.floor(bucket.tokens)),
    resetsAt,
    key,
  };
}

/**
 * Build standard rate-limit response headers for an allowed OR denied
 * request. Callers should spread these into their response headers so
 * clients get actionable feedback.
 */
export function buildRateLimitHeaders(
  result: RateLimitResult,
  options: RateLimitOptions
): Record<string, string> {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetsAt - Date.now()) / 1000));
  return {
    'X-RateLimit-Limit': String(options.max),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetsAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(retryAfterSec) }),
  };
}

/**
 * Convenience: run `checkRateLimit` once and return a discriminated result
 * the caller can branch on WITHOUT re-checking (and accidentally double-
 * decrementing) the bucket when building response headers.
 *
 *   const gate = enforceRateLimit(request, opts);
 *   if (gate.limited) return gate.response;
 *   // ...build normal response, use gate.headers for rate metadata
 */
export type EnforcedRateLimit =
  | { limited: true; response: Response; result: RateLimitResult; headers: Record<string, string> }
  | { limited: false; result: RateLimitResult; headers: Record<string, string> };

export function enforceRateLimit(
  request: Request,
  options: RateLimitOptions
): EnforcedRateLimit {
  const result = checkRateLimit(request, options);
  const headers = buildRateLimitHeaders(result, options);
  if (result.allowed) {
    return { limited: false, result, headers };
  }
  const response = new Response(
    JSON.stringify({
      error: 'Too many requests',
      resetsAt: result.resetsAt,
    }),
    {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...headers },
    }
  );
  return { limited: true, response, result, headers };
}

/**
 * Test-only helper for resetting the shared bucket map. Not exported in
 * any production path — unit tests import via the module boundary.
 */
export function __resetBuckets(): void {
  buckets.clear();
}
