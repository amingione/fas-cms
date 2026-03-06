import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addItem,
  getCart,
  redirectToCheckout,
  removeItem,
  updateItemQuantity
} from '../src/components/cart/actions';
import { MEDUSA_CART_ID_KEY } from '../src/lib/medusa';

function createBrowserHarness() {
  const storage = new Map<string, string>();
  const fakeWindow = {
    location: {
      href: ''
    },
    dispatchEvent: vi.fn()
  };

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/medusa/cart/create') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ cartId: 'cart_e2e_123' })
      } as any;
    }

    if (url === '/api/medusa/cart/add-item') {
      const payload =
        typeof init?.body === 'string' ? JSON.parse(init.body) : (init?.body as any) || {};
      const cartItems = Array.isArray(payload?.cart?.items) ? payload.cart.items : [];
      const subtotal = cartItems.reduce((sum: number, item: any) => {
        const qty = typeof item?.quantity === 'number' ? Math.max(1, item.quantity) : 1;
        const price = typeof item?.price === 'number' ? item.price : 0;
        return sum + qty * price;
      }, 0);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          mappings: cartItems
            .filter((item: any) => typeof item?.medusaVariantId === 'string')
            .map((item: any) => ({
              id: item.id,
              medusaVariantId: item.medusaVariantId
            })),
          cart: {
            items: cartItems.map((item: any) => ({
              id: `line_${item.id}`,
              title: item.name || item.id,
              unit_price: item.price ?? 0,
              quantity: item.quantity ?? 1,
              variant_id: item.medusaVariantId,
              metadata: {
                local_item_id: item.id
              }
            })),
            subtotal,
            tax_total: 0,
            shipping_total: 0,
            discount_total: 0,
            total: subtotal,
            original_total: subtotal
          }
        })
      } as any;
    }

    if (url === '/api/cart/cart_e2e_123') {
      const raw = storage.get('fas_cart_v1');
      const parsed = raw ? JSON.parse(raw) : { items: [] };
      const localItems = Array.isArray(parsed?.items) ? parsed.items : [];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          cart: {
            id: 'cart_e2e_123',
            items: localItems.map((item: any) => ({
              id: `line_${item.id}`,
              local_item_id: item.id,
              medusa_variant_id: item.medusaVariantId,
              quantity: item.quantity ?? 1
            }))
          }
        })
      } as any;
    }

    return {
      ok: false,
      status: 500,
      json: async () => ({ error: `Unhandled URL: ${url}` })
    } as any;
  });

  vi.stubGlobal('window', fakeWindow as any);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key)
  } as any);
  vi.stubGlobal('fetch', fetchMock as any);

  return { storage, fakeWindow, fetchMock };
}

describe('cart end-to-end flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('validates add/update/remove and checkout handoff against Medusa cart APIs', async () => {
    const { storage, fakeWindow, fetchMock } = createBrowserHarness();

    await addItem(null, {
      id: 'item-1',
      name: 'Test Product',
      price: 1000,
      quantity: 1,
      medusaVariantId: 'variant_1'
    });

    await updateItemQuantity(null, { id: 'item-1', quantity: 3 });

    await addItem(null, {
      id: 'item-2',
      name: 'Secondary Product',
      price: 2500,
      quantity: 1,
      medusaVariantId: 'variant_2'
    });

    await removeItem(null, 'item-2');

    const cartBeforeCheckout = getCart();
    expect(cartBeforeCheckout.items).toHaveLength(1);
    expect(cartBeforeCheckout.items[0]?.id).toBe('item-1');
    expect(cartBeforeCheckout.items[0]?.quantity).toBe(3);
    expect(cartBeforeCheckout.totals?.subtotal).toBe(3000);

    await redirectToCheckout();

    expect(storage.get(MEDUSA_CART_ID_KEY)).toBe('cart_e2e_123');
    expect(fakeWindow.location.href).toBe('/checkout');
    expect(fetchMock).toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some((entry) => entry[0] === '/api/medusa/cart/create')
    ).toBe(true);
    expect(
      fetchMock.mock.calls.filter((entry) => entry[0] === '/api/medusa/cart/add-item').length
    ).toBeGreaterThanOrEqual(4);
  });

  it('blocks checkout when cart is empty', async () => {
    const { fetchMock } = createBrowserHarness();

    const result = await redirectToCheckout();

    expect(result).toBe('Your cart is empty.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
