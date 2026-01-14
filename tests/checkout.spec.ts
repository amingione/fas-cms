import fs from 'fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { redirectToCheckout } from '../src/components/cart/actions';
import { POST as checkoutHandler } from '../src/pages/api/stripe/create-checkout-session';

describe('redirectToCheckout helper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the cart payload and navigates to Stripe Checkout', async () => {
    const fakeWindow = {
      location: {
        href: ''
      }
    };
    vi.stubGlobal('window', fakeWindow as any);
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({
          items: [
            {
              id: 'item-1',
              name: 'Widget',
              price: 1000,
              quantity: 1
            }
          ]
        }),
      setItem: () => null
    } as any);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://checkout.stripe.com/pay/cs_test_123#fid_test' })
    });
    vi.stubGlobal('fetch', fetchMock as any);

    await redirectToCheckout();

    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall[0]).toBe('/api/stripe/create-checkout-session');
    const fetchOptions = fetchCall[1];
    expect(fetchOptions?.method).toBe('POST');
    expect(fetchOptions?.headers?.['Content-Type']).toBe('application/json');
    const parsedBody = JSON.parse(fetchOptions?.body ?? '{}');
    expect(parsedBody.cart).toHaveLength(1);
    expect(fakeWindow.location.href).toBe('https://checkout.stripe.com/pay/cs_test_123#fid_test');
  });
});

describe('checkout API validation', () => {
  it('rejects requests without cart items', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await checkoutHandler({ request } as any);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });
});

describe('checkout API file', () => {
  it('never references label purchase helpers', async () => {
    const file = await fs.readFile(
      new URL('../src/pages/api/stripe/create-checkout-session.ts', import.meta.url),
      'utf-8'
    );
    expect(file).not.toMatch(/create-shipping-label/i);
  });
});
