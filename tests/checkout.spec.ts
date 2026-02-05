import { afterEach, describe, expect, it, vi } from 'vitest';
import { redirectToCheckout } from '../src/components/cart/actions';

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
