import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  basePrice?: number;
  extra?: number;
  isOnSale?: boolean;
  saleLabel?: string;
  quantity: number;
  categories?: string[];
  image?: string;
  installOnly?: boolean;
  shippingClass?: string;
  productUrl?: string;
  sku?: string;
  productSlug?: string;
  productId?: string;
  stripePriceId?: string;
  medusaVariantId?: string;
  options?: Record<string, string>;
  selectedOptions?: string[];
  selectedUpgrades?: string[];
  upgrades?: unknown;
};

export const CART_KEY = 'fas_cart_v1';
export const CART_EVENT = 'cart:changed';

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

async function ensureMedusaCartId(): Promise<string | null> {
  if (!isBrowser()) return null;
  const existing = localStorage.getItem(MEDUSA_CART_ID_KEY);
  if (existing && existing.trim()) return existing.trim();

  try {
    const response = await fetch('/api/medusa/cart/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => null);
    const cartId = data?.cartId;
    if (response.ok && typeof cartId === 'string' && cartId.trim()) {
      localStorage.setItem(MEDUSA_CART_ID_KEY, cartId.trim());
      return cartId.trim();
    }
  } catch (error) {
    void error;
  }

  return null;
}

async function syncMedusaCart(cart: CartItem[]) {
  if (!isBrowser()) return;
  const cartId = await ensureMedusaCartId();
  if (!cartId) return;

  try {
    await fetch('/api/medusa/cart/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, cart: { items: cart } })
    });
  } catch (error) {
    void error;
  }
}

export function getCart(): CartItem[] {
  try {
    if (!isBrowser()) return [];
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const items = parsed && Array.isArray(parsed.items) ? parsed.items : [];
    return items as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  try {
    if (isBrowser()) {
      localStorage.setItem(CART_KEY, JSON.stringify({ items: cart }));
    }
    emitCartUpdated(cart);
    void syncMedusaCart(cart);
  } catch (error) {
    void error;
  }
}

export function emitCartUpdated(cart: CartItem[]): void {
  try {
    const detail = { cart: { items: cart } } as any;
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(CART_EVENT, { detail }));
    }
  } catch (error) {
    void error;
  }
}

export function addItem(item: CartItem): CartItem[] {
  if (!item.medusaVariantId || typeof item.medusaVariantId !== 'string') {
    throw new Error('Please select a product variant before adding this item to your cart.');
  }
  const cart = getCart();
  const idx = cart.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    const existing = cart[idx];
    cart[idx] = {
      ...existing,
      ...item,
      quantity: (existing.quantity || 0) + (item.quantity || 1)
    };
  } else {
    cart.push({ ...item, quantity: item.quantity || 1 });
  }
  saveCart(cart);
  return cart;
}
