/**
 * FAS API Flow Logger + Failure Map
 *
 * Provides structured JSON logging and a failure → remediation map
 * for the full integration chain:
 *   fas-cms-fresh → Medusa → Stripe → Shippo → fulfillment
 *
 * Usage:
 *   import { logFlow, withFlowLog } from '@/lib/logger'
 *
 *   // Simple log
 *   logFlow({ service: 'fas-cms-fresh', phase: 'cart-create', status: 'success', correlationId: cartId })
 *
 *   // Wrap an async op
 *   const result = await withFlowLog(
 *     { service: 'fas-cms-fresh', phase: 'cart-create', correlationId: cartId ?? 'new' },
 *     () => medusaFetch('/store/carts', { method: 'POST', body: JSON.stringify({ region_id }) })
 *   )
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlowService =
  | 'fas-cms-fresh'
  | 'fas-medusa'
  | 'fas-dash'
  | 'fas-sanity';

export type FlowPhase =
  | 'cart-create'
  | 'cart-add-item'
  | 'address-update'
  | 'shipping-options'
  | 'shipping-select'
  | 'payment-intent-create'
  | 'payment-submit'
  | 'order-complete'
  | 'stripe-webhook'
  | 'shippo-fulfillment'
  | 'sanity-product-sync'
  | 'vendor-event';

export type FlowStatus = 'start' | 'success' | 'failure' | 'skip';

export interface FlowLogEntry {
  level: 'info' | 'error' | 'warn';
  ts: string;
  service: FlowService;
  phase: FlowPhase;
  status: FlowStatus;
  /** cartId, orderId, or stripePaymentIntentId — links logs across services */
  correlationId: string;
  durationMs?: number;
  error?: string;
  errorCode?: string;
  meta?: Record<string, unknown>;
}

// ─── Failure Map ─────────────────────────────────────────────────────────────

export interface FailureEntry {
  code: string;
  pattern: RegExp;
  service: string;
  phase: FlowPhase;
  severity: 'fatal' | 'error' | 'warning';
  summary: string;
  steps: string[];
  autoFixable: boolean;
  docsRef?: string;
}

export const FAILURE_MAP: FailureEntry[] = [
  // ── Medusa ──────────────────────────────────────────────────────────────
  {
    code: 'MEDUSA_PUBLISHABLE_KEY_INVALID',
    pattern: /400.*publishable|unauthorized.*store/i,
    service: 'medusa',
    phase: 'cart-create',
    severity: 'fatal',
    summary: 'Medusa publishable key invalid or not linked to sales channel',
    steps: [
      'SSH Railway → run: npx medusa exec ./src/scripts/diagnose-publishable-key-state.ts',
      'Run: npx medusa exec ./src/scripts/fix-publishable-key-links.ts',
      'Run: scripts/propagate-publishable-key.sh <NEW_PK> to update Netlify env',
      'Full runbook: fas-medusa/docs/ops-runbook-webhook-and-key-setup.md',
    ],
    autoFixable: false,
    docsRef: 'fas-medusa/docs/ops-runbook-webhook-and-key-setup.md',
  },
  {
    code: 'MEDUSA_BACKEND_NOT_CONFIGURED',
    pattern: /medusa backend not configured|invalid medusa base url/i,
    service: 'fas-cms-fresh',
    phase: 'cart-create',
    severity: 'fatal',
    summary: 'PUBLIC_MEDUSA_BACKEND_URL or PUBLIC_MEDUSA_PUBLISHABLE_KEY env var missing',
    steps: [
      'Set Netlify env: PUBLIC_MEDUSA_BACKEND_URL=https://api.fasmotorsports.com',
      'Set Netlify env: PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...',
      'Trigger Netlify redeploy after setting vars',
    ],
    autoFixable: false,
  },
  {
    code: 'MEDUSA_CART_NOT_FOUND',
    pattern: /cart.*not found|404.*carts/i,
    service: 'fas-cms-fresh',
    phase: 'cart-add-item',
    severity: 'error',
    summary: 'Cart ID invalid or expired',
    steps: [
      "Clear stored cart ID and create a new cart via POST /store/carts",
      "Cart IDs expire — never store them server-side beyond session",
    ],
    autoFixable: true,
  },
  {
    code: 'MEDUSA_SHIPPING_OPTIONS_EMPTY',
    pattern: /no.*shipping.*options|shipping_options.*\[\]/i,
    service: 'fas-cms-fresh',
    phase: 'shipping-options',
    severity: 'error',
    summary: 'No shipping options returned — Shippo fulfillment may not be configured',
    steps: [
      'Check Shippo fulfillment module config in fas-medusa/medusa-config.ts',
      'Run: npm run repair-shipping-profiles (fas-medusa)',
      'Verify product weight/dimensions are set — Shippo requires them',
      'Run: npm run check-shipping-dimensions (fas-medusa)',
    ],
    autoFixable: false,
    docsRef: 'fas-medusa/docs/SHIPPING_RULES.md',
  },
  {
    code: 'MEDUSA_VARIANT_PRICE_MISSING',
    pattern: /price.*undefined|no.*price.*variant/i,
    service: 'fas-cms-fresh',
    phase: 'cart-add-item',
    severity: 'error',
    summary: 'Variant has no price in current region/currency',
    steps: [
      'Run: npm run check-actual-prices (fas-medusa)',
      'Run: npm run repair-prices (fas-medusa)',
      'Ensure price_set is attached to each variant in the correct region',
    ],
    autoFixable: false,
  },
  // ── Stripe ──────────────────────────────────────────────────────────────
  {
    code: 'STRIPE_WEBHOOK_SIG_FAIL',
    pattern: /no signatures found|webhook.*signature/i,
    service: 'fas-cms-fresh',
    phase: 'stripe-webhook',
    severity: 'fatal',
    summary: 'Stripe webhook signature verification failed',
    steps: [
      'Verify STRIPE_WEBHOOK_SECRET matches signing secret in Stripe Dashboard',
      'Ensure raw body is passed to stripe.webhooks.constructEvent() — no pre-parsing',
      "Stripe signing secret starts with 'whsec_'",
    ],
    autoFixable: false,
    docsRef: 'https://stripe.com/docs/webhooks/signatures',
  },
  {
    code: 'STRIPE_PAYMENT_INTENT_CREATE_FAIL',
    pattern: /failed to create payment intent|payment_intent.*error/i,
    service: 'fas-cms-fresh',
    phase: 'payment-intent-create',
    severity: 'error',
    summary: 'Payment intent creation failed — Medusa payment session may not be initialized',
    steps: [
      'Ensure POST /store/carts/:id/payment-sessions is called before payment intent creation',
      'Verify Stripe payment provider is enabled in Medusa medusa-config.ts',
      'Check STRIPE_SECRET_KEY is set in Railway env',
    ],
    autoFixable: false,
  },
  // ── Sanity Sync ──────────────────────────────────────────────────────────
  {
    code: 'SANITY_SYNC_WEBHOOK_NOT_TRIGGERED',
    pattern: /sanity.*webhook.*timeout|sanity.*sync.*no.*response/i,
    service: 'fas-cms-fresh',
    phase: 'sanity-product-sync',
    severity: 'warning',
    summary: 'Sanity → Medusa product sync webhook not firing',
    steps: [
      'Register webhook in Sanity Dashboard → Project → API → Webhooks',
      'URL: https://api.fasmotorsports.com/api/webhooks/sanity-product-sync',
      'Trigger: Document published, type: product',
      'Secret: SANITY_WEBHOOK_SECRET (match Railway env)',
      'See: fas-medusa/docs/ops-runbook-webhook-and-key-setup.md §1',
    ],
    autoFixable: false,
  },
  // ── Vendor Events ─────────────────────────────────────────────────────────
  {
    code: 'VENDOR_WEBHOOK_SECRET_MISMATCH',
    pattern: /vendor.*webhook.*invalid|unauthorized.*vendor/i,
    service: 'fas-cms-fresh',
    phase: 'vendor-event',
    severity: 'error',
    summary: 'VENDOR_WEBHOOK_SECRET mismatch between Medusa and Sanity',
    steps: [
      'Generate new secret: openssl rand -base64 32',
      'Set VENDOR_WEBHOOK_SECRET in Railway (fas-medusa)',
      'Set VENDOR_WEBHOOK_SECRET in Netlify env (fas-sanity)',
      'Redeploy both services',
    ],
    autoFixable: false,
  },
];

// ─── Matcher ─────────────────────────────────────────────────────────────────

export function matchFailure(error: unknown): FailureEntry | null {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : JSON.stringify(error);

  return FAILURE_MAP.find((entry) => entry.pattern.test(message)) ?? null;
}

// ─── Core logger ─────────────────────────────────────────────────────────────

export function logFlow(entry: Omit<FlowLogEntry, 'ts' | 'level'>): void {
  const level: FlowLogEntry['level'] =
    entry.status === 'failure' ? 'error' :
    entry.status === 'skip'    ? 'warn'  : 'info';

  const log: FlowLogEntry = {
    level,
    ts: new Date().toISOString(),
    ...entry,
  };

  // Structured JSON for log aggregators (Grafana, Datadog, Netlify Log Drains)
  console.log(JSON.stringify(log));

  // On failure, emit matched remediation if available
  if (entry.status === 'failure' && entry.error) {
    const mapped = matchFailure(entry.error);
    if (mapped) {
      console.error(
        JSON.stringify({
          level: 'error',
          ts: log.ts,
          service: entry.service,
          errorCode: mapped.code,
          summary: mapped.summary,
          remediation: mapped.steps,
          autoFixable: mapped.autoFixable,
          docsRef: mapped.docsRef,
        })
      );
    }
  }
}

// ─── Async wrapper ───────────────────────────────────────────────────────────

/**
 * Wraps any async operation with structured flow logging.
 *
 * @example
 * const res = await withFlowLog(
 *   { service: 'fas-cms-fresh', phase: 'cart-create', correlationId: 'new' },
 *   () => medusaFetch('/store/carts', { method: 'POST', body: JSON.stringify({ region_id }) })
 * )
 */
export async function withFlowLog<T>(
  opts: {
    service: FlowService;
    phase: FlowPhase;
    correlationId: string;
    meta?: Record<string, unknown>;
  },
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  logFlow({
    service: opts.service,
    phase: opts.phase,
    status: 'start',
    correlationId: opts.correlationId,
    meta: opts.meta,
  });

  try {
    const result = await fn();

    logFlow({
      service: opts.service,
      phase: opts.phase,
      status: 'success',
      correlationId: opts.correlationId,
      durationMs: Date.now() - start,
    });

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    logFlow({
      service: opts.service,
      phase: opts.phase,
      status: 'failure',
      correlationId: opts.correlationId,
      durationMs: Date.now() - start,
      error: message,
    });

    throw error;
  }
}
