import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../src/pages/api/medusa/webhooks/payment-intent';

const makeEventPayload = (overrides?: Record<string, unknown>) =>
  JSON.stringify({
    id: 'evt_test_1',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        metadata: {
          medusa_cart_id: 'cart_test_123'
        },
        ...(overrides || {})
      }
    }
  });

const callRoute = async (body: string) => {
  const request = new Request('https://example.com/api/medusa/webhooks/payment-intent', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body
  });
  return await POST({ request } as any);
};

describe('payment-intent webhook endpoint deprecation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_URL;
    delete process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED;
    delete process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_FAIL_OPEN;
    delete process.env.PAYMENT_INTENT_WEBHOOK_LOCAL_PROCESS_ENABLED;
  });

  it('returns 410 Gone with canonical Medusa webhook URL', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock as any);
    const response = await callRoute(makeEventPayload());
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.error).toContain('deprecated');
    expect(json.canonical_webhook).toBe('https://api.fasmotorsports.com/webhooks/stripe');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stays deprecated even when legacy forwarding env flags are set', async () => {
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_URL = 'https://relay.example.dev/stripe';
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED = 'true';
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_FAIL_OPEN = 'true';
    process.env.PAYMENT_INTENT_WEBHOOK_LOCAL_PROCESS_ENABLED = 'true';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock as any);
    const response = await callRoute(makeEventPayload());
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.message).toContain('api.fasmotorsports.com/webhooks/stripe');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
