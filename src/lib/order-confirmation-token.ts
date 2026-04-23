// apps/web/src/lib/order-confirmation-token.ts
//
// Task 3 — PII mitigation helper.
//
// Problem: `/api/orders/by-payment-intent` returns full customer PII (email,
// shipping address, total) keyed only by `orderCode`. Any caller holding an
// orderCode — legitimate or not — can fetch that data. Order codes live in
// Stripe return URLs, browser history, referrer headers, server logs, and
// analytics pixels; treating them as a secret is fragile.
//
// Hybrid fix (Option C from the 2026-04-22 security scoping doc):
//   1. PRIMARY  — short-lived HMAC-signed token embedded in the Stripe
//                 return_url alongside the payment_intent. Token payload:
//                 { orderCode, exp }, signed with AUTH_SECRET via HMAC-SHA256,
//                 default 30-minute expiry. Verify first; unsign-and-match
//                 `orderCode` against the query to prevent token-reuse with
//                 a different code.
//   2. SECONDARY — legitimate authenticated Vendure session cookie. Covers
//                 the logged-in account flow where the page was reached
//                 without going through the Stripe return URL.
//   3. FALLBACK  — masked response (order number only, no email/address) so
//                 the page still shows "Order ABC123 received — check your
//                 email" instead of 401/500. Prevents footgun UX while
//                 denying PII to unauthenticated callers.
//
// This module ships as a STAGED scaffold — endpoint wiring lands in the
// same commit but the Stripe return_url update is a follow-up (requires
// coordinated change with `stripe-intent.ts` return_url builder + the
// confirmation page script that consumes it).
//
// Signing primitive: `jsonwebtoken` (already a direct dep via
// `server/auth/session.ts`). JWT HS256 is HMAC-SHA256 under the hood —
// same primitive the Sanity vendor-tier webhook uses. Avoids introducing
// a new crypto dependency.

import jwt from 'jsonwebtoken';

const env = typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {};
const penv = typeof process !== 'undefined' ? (process as any).env ?? {} : {};

const readEnv = (key: string, fallback?: string): string | undefined => {
  const value = env[key] ?? penv[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

/**
 * Signing secret for order-confirmation tokens. Reuses AUTH_SECRET (already
 * typed in env.d.ts and provisioned in the Netlify dashboard (production) or .env.local (dev).
 * Falls through to SESSION_SECRET / JWT_SECRET so local dev doesn't need a
 * second rotation to work — prod still mandates AUTH_SECRET.
 */
const TOKEN_SECRET =
  readEnv('AUTH_SECRET') ||
  readEnv('SESSION_SECRET') ||
  readEnv('JWT_SECRET') ||
  '';

const isProd = readEnv('NODE_ENV') === 'production';

if (isProd && !readEnv('AUTH_SECRET')) {
  console.warn(
    '[order-confirmation-token] AUTH_SECRET not configured. Falling back to SESSION_SECRET/JWT_SECRET.'
  );
}

/**
 * Default expiry window for a freshly-minted confirmation token.
 * 30 minutes covers the worst-case user flow: Stripe redirect → page load →
 * user-takes-a-phone-call → page reload. Short enough that a leaked return
 * URL in browser history ages out of usefulness before most log harvesters
 * get to it.
 */
export const DEFAULT_TOKEN_TTL_SECONDS = 30 * 60;

export interface OrderConfirmationTokenPayload {
  /** Vendure order code this token authorizes. */
  orderCode: string;
  /** Optional payment intent ID — bound into the token so re-use across
   *  orders is harder even if the signing key leaks short-term. */
  paymentIntentId?: string;
}

export interface SignOrderConfirmationTokenOptions {
  /** Override the default 30-minute expiry. Accepts seconds. */
  expiresInSeconds?: number;
}

/**
 * Mint a signed order-confirmation token. Called server-side by the Stripe
 * return_url builder (`lib/checkout/stripe-intent.ts` — follow-up wire-up).
 *
 * Never call this from the browser. The signing key must stay server-only.
 */
export function signOrderConfirmationToken(
  payload: OrderConfirmationTokenPayload,
  options: SignOrderConfirmationTokenOptions = {}
): string {
  if (!TOKEN_SECRET) {
    throw new Error(
      '[order-confirmation-token] Missing AUTH_SECRET — set it in the Netlify dashboard (production) or .env.local (dev).'
    );
  }
  if (!payload?.orderCode || typeof payload.orderCode !== 'string') {
    throw new Error('[order-confirmation-token] orderCode is required and must be a string.');
  }
  const expiresIn = options.expiresInSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;
  return jwt.sign(
    {
      orderCode: payload.orderCode,
      ...(payload.paymentIntentId ? { pi: payload.paymentIntentId } : {}),
    },
    TOKEN_SECRET,
    { expiresIn, algorithm: 'HS256' }
  );
}

/**
 * Verification result. Callers MUST branch on `ok` — never assume a verified
 * token until after the explicit check. `reason` is safe to surface in logs
 * but NOT in user-facing error text (it can leak whether an orderCode
 * exists).
 */
export type VerifyOrderConfirmationTokenResult =
  | {
      ok: true;
      payload: OrderConfirmationTokenPayload & { iat?: number; exp?: number };
    }
  | {
      ok: false;
      reason: 'missing' | 'malformed' | 'expired' | 'invalid_signature' | 'code_mismatch' | 'no_secret';
    };

export interface VerifyOrderConfirmationTokenInput {
  /** Raw token string from the `t=` query param or `Authorization: Bearer ...` header. */
  token: string | null | undefined;
  /** The orderCode from the query string. If present, token payload MUST match. */
  expectedOrderCode?: string | null;
  /** Optional payment intent ID to match against the token's `pi` claim. */
  expectedPaymentIntentId?: string | null;
}

/**
 * Verify a signed order-confirmation token. Does NOT fetch Vendure — just
 * validates signature + expiry + claim match. Endpoint handler still pulls
 * the order from Vendure on success.
 *
 * Intentionally returns a discriminated union instead of throwing — the
 * endpoint needs to distinguish "no token supplied → fall through to
 * session/masked" vs. "token supplied and invalid → 401".
 */
export function verifyOrderConfirmationToken(
  input: VerifyOrderConfirmationTokenInput
): VerifyOrderConfirmationTokenResult {
  if (!TOKEN_SECRET) {
    return { ok: false, reason: 'no_secret' };
  }
  const token = typeof input.token === 'string' ? input.token.trim() : '';
  if (!token) {
    return { ok: false, reason: 'missing' };
  }
  try {
    const decoded = jwt.verify(token, TOKEN_SECRET, { algorithms: ['HS256'] }) as
      | (OrderConfirmationTokenPayload & { iat?: number; exp?: number; pi?: string })
      | string;

    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
      return { ok: false, reason: 'malformed' };
    }
    if (!decoded.orderCode || typeof decoded.orderCode !== 'string') {
      return { ok: false, reason: 'malformed' };
    }
    if (input.expectedOrderCode && decoded.orderCode !== input.expectedOrderCode) {
      return { ok: false, reason: 'code_mismatch' };
    }
    if (input.expectedPaymentIntentId && decoded.pi && decoded.pi !== input.expectedPaymentIntentId) {
      return { ok: false, reason: 'code_mismatch' };
    }
    return {
      ok: true,
      payload: {
        orderCode: decoded.orderCode,
        paymentIntentId: decoded.pi,
        iat: decoded.iat,
        exp: decoded.exp,
      },
    };
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      return { ok: false, reason: 'expired' };
    }
    if (err?.name === 'JsonWebTokenError') {
      return { ok: false, reason: 'invalid_signature' };
    }
    return { ok: false, reason: 'malformed' };
  }
}

/**
 * Produce a PII-stripped response shape for the masked-fallback branch.
 *
 * Philosophy: the page never 500s on a legitimate-looking request; it just
 * degrades. The user still sees their order number (which is not PII — it
 * goes in their email anyway). The email, shipping address, and totals are
 * omitted so an attacker who just guesses an orderCode learns nothing new.
 */
export interface MaskedOrderResponse {
  orderCode: string | null;
  displayId: string | null;
  total: null;
  shippingTotal: null;
  email: null;
  shippingAddress: null;
  /** Signals to the client that the response is intentionally masked, not
   *  a Vendure lookup error. The confirmation page can show a generic
   *  "check your email" state. */
  masked: true;
}

export function buildMaskedOrderResponse(orderCode: string | null): MaskedOrderResponse {
  return {
    orderCode: orderCode || null,
    displayId: orderCode || null,
    total: null,
    shippingTotal: null,
    email: null,
    shippingAddress: null,
    masked: true,
  };
}
