import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';

export type CartItem = {
  id: string;
  name: string;
  price: number; // cents
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
  shippingWeight?: number;
  shippingDimensions?: { length?: number; width?: number; height?: number };
  productUrl?: string;
  sku?: string;
  productSlug?: string;
  productId?: string;
  stripePriceId?: string;
  medusaVariantId?: string;
  options?: Record<string, string>;
  selectedOptions?: string[];
  selectedUpgrades?: string[];
  selectedUpgradesDetailed?: Array<{
    label: string;
    priceCents: number;
    medusaOptionValueId: string;
  }>;
  upgrades?: unknown;
};

export const CART_KEY = 'fas_cart_v1';
export const CART_EVENT = 'cart:changed';

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function normalizeLegacyUpgradeCents(item: CartItem): { item: CartItem; changed: boolean } {
  const entries = Array.isArray(item.selectedUpgradesDetailed) ? item.selectedUpgradesDetailed : [];
  if (!entries.length) return { item, changed: false };
  let changed = false;
  const normalized = entries.map((entry) => {
    const cents = Number.isFinite(entry?.priceCents) ? Math.round(entry.priceCents) : 0;
    if (cents > 0 && cents < 100) {
      changed = true;
      return { ...entry, priceCents: cents * 100 };
    }
    return { ...entry, priceCents: cents };
  });
  if (!changed) return { item, changed: false };
  return {
    item: {
      ...item,
      selectedUpgradesDetailed: normalized,
      upgrades: normalized.map((entry) => ({
        label: entry.label,
        value: entry.label,
        price: entry.priceCents,
        priceCents: entry.priceCents,
        medusaOptionValueId: entry.medusaOptionValueId
      }))
    },
    changed: true
  };
}

export async function ensureMedusaCartId(): Promise<string | null> {
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

export type SyncMedusaCartResult = { ok: boolean; error?: string };

export async function syncMedusaCart(cart: CartItem[]): Promise<SyncMedusaCartResult> {
  if (!isBrowser()) return { ok: false, error: 'Browser context is required.' };
  const cartId = await ensureMedusaCartId();
  if (!cartId) return { ok: false, error: 'Failed to initialize Medusa cart.' };

  try {
    const response = await fetch('/api/medusa/cart/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, cart: { items: cart } })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.warn('[lib/cart] Medusa cart sync failed', {
        status: response.status,
        error: payload?.error,
        missingItems: payload?.missingItems
      });
      return { ok: false, error: payload?.error || 'Failed to sync cart with checkout.' };
    }
    return { ok: true };
  } catch (error) {
    console.warn('[lib/cart] Medusa cart sync exception', error);
    return { ok: false, error: 'Failed to sync cart with checkout.' };
  }
}

export function getCart(): CartItem[] {
  try {
    if (!isBrowser()) return [];
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const parsedItems = parsed && Array.isArray(parsed.items) ? parsed.items : [];
    let healed = false;
    const items = parsedItems.map((item: CartItem) => {
      const normalized = normalizeLegacyUpgradeCents(item);
      if (normalized.changed) healed = true;
      return normalized.item;
    });
    
    // ✅ MEDUSA-FIRST PRICING VALIDATION
    // Filter out any cart items with invalid pricing
    const validItems = items.filter((item: any) => {
      const hasValidPrice =
        typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0;
      
      if (!hasValidPrice) {
        console.warn('[cart] Removing item with invalid price from cart', {
          id: item.id,
          name: item.name,
          price: item.price,
          priceType: typeof item.price
        });
        return false;
      }
      return true;
    });
    
    // If we filtered out invalid items, save the cleaned cart
    if (validItems.length !== items.length || healed) {
      const removed = items.length - validItems.length;
      if (removed > 0) {
        console.log(`[cart] Cleaned ${removed} invalid items from cart`);
      }
      if (isBrowser()) {
        localStorage.setItem(CART_KEY, JSON.stringify({ items: validItems }));
        if (healed) {
          queueMicrotask(() => {
            void syncMedusaCart(validItems as CartItem[]);
          });
        }
      }
    }
    
    return validItems as CartItem[];
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
