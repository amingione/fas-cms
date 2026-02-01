import fs from 'fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { redirectToCheckout } from '../src/components/cart/actions';
import { POST as checkoutHandler } from '../src/pages/api/legacy/stripe/create-checkout-session';

describe('redirectToCheckout helper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('syncs cart to Medusa and navigates to checkout', async () => {
    const storage = new Map<string, string>();
    const fakeWindow = {
      location: {
        href: ''
      },
      dispatchEvent: vi.fn()
    };
    vi.stubGlobal('window', fakeWindow as any);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value)
    } as any);

    storage.set(
      'fas_cart_v1',
      JSON.stringify({
        items: [
          {
            id: 'item-1',
            name: 'Widget',
            price: 1000,
            quantity: 1,
            medusaVariantId: 'variant_1'
          }
        ]
      })
    );

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/medusa/cart/create') {
        return { ok: true, status: 200, json: async () => ({ cartId: 'cart_123' }) } as any;
      }
      if (url === '/api/medusa/cart/add-item') {
        return { ok: true, status: 200, json: async () => ({ mappings: [] }) } as any;
      }
      return { ok: false, status: 500, json: async () => ({}) } as any;
    });
    vi.stubGlobal('fetch', fetchMock as any);

    await redirectToCheckout();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/medusa/cart/create');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/medusa/cart/add-item');
    expect(fakeWindow.location.href).toBe('/checkout');
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
      new URL('../src/pages/api/legacy/stripe/create-checkout-session.ts', import.meta.url),
      'utf-8'
    );
    expect(file).not.toMatch(/create-shipping-label/i);
  });
});
