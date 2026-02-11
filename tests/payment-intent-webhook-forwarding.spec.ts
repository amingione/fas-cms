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

describe('payment-intent webhook forwarding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_URL;
    delete process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED;
    delete process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_FAIL_OPEN;
    delete process.env.PAYMENT_INTENT_WEBHOOK_LOCAL_PROCESS_ENABLED;
  });

  it('forwards to downstream URL when configured and stops local processing on success', async () => {
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_URL = 'https://relay.example.dev/stripe';
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED = 'true';

    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://relay.example.dev/stripe') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const response = await callRoute(makeEventPayload());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.forwarded).toBe(true);
    expect(json.local_processed).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://relay.example.dev/stripe');
  });

  it('falls back to local completion when forwarding fails and fail-open is enabled', async () => {
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_URL = 'https://relay.example.dev/stripe';
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED = 'true';
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_FAIL_OPEN = 'true';

    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://relay.example.dev/stripe') {
        throw new Error('relay unavailable');
      }
      if (url === 'https://example.com/api/complete-order') {
        return new Response(JSON.stringify({ success: true, order_id: 'order_123' }), { status: 200 });
      }
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const response = await callRoute(makeEventPayload());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.forwarded).toBe(true);
    expect(json.local_processed).toBe(true);
    expect(json.local_result?.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://example.com/api/complete-order');
  });

  it('rejects forward failures when fail-open is disabled', async () => {
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_URL = 'https://relay.example.dev/stripe';
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_ENABLED = 'true';
    process.env.PAYMENT_INTENT_WEBHOOK_FORWARD_FAIL_OPEN = 'false';

    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://relay.example.dev/stripe') {
        return new Response('downstream error', { status: 500 });
      }
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const response = await callRoute(makeEventPayload());
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.received).toBe(false);
    expect(json.forwarded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
