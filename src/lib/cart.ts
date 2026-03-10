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
let hasLoggedCartCleanupThisPage = false;

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function normalizeLocalItemId(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) return raw;
  if (raw.endsWith('::[]')) return raw.slice(0, -4);
  if (raw.endsWith('::')) return raw.slice(0, -2);
  return raw;
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

type CartSanitization = {
  items: CartItem[];
  removedMissingVariant: number;
  removedInvalidPrice: number;
  removedInvalidQuantity: number;
};

function sanitizeCartItems(items: CartItem[]): CartSanitization {
  let removedMissingVariant = 0;
  let removedInvalidPrice = 0;
  let removedInvalidQuantity = 0;

  const sanitized = items.filter((item) => {
    const hasVariant =
      typeof item.medusaVariantId === 'string' && item.medusaVariantId.trim().length > 0;
    if (!hasVariant) {
      removedMissingVariant += 1;
      return false;
    }

    const hasValidPrice =
      typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0;
    if (!hasValidPrice) {
      removedInvalidPrice += 1;
      return false;
    }

    const hasValidQuantity =
      typeof item.quantity === 'number' &&
      Number.isFinite(item.quantity) &&
      Math.floor(item.quantity) > 0;
    if (!hasValidQuantity) {
      removedInvalidQuantity += 1;
      return false;
    }

    return true;
  });

  return { items: sanitized, removedMissingVariant, removedInvalidPrice, removedInvalidQuantity };
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

export type SyncMedusaCartResult = { ok: boolean; error?: string; cart?: any | null };

export async function syncMedusaCart(cart: CartItem[]): Promise<SyncMedusaCartResult> {
  return syncMedusaCartAttempt(cart, 0);
}

async function syncMedusaCartAttempt(
  cart: CartItem[],
  attempt: number
): Promise<SyncMedusaCartResult> {
  if (!isBrowser()) return { ok: false, error: 'Browser context is required.' };

  const sanitized = sanitizeCartItems(cart);
  const sanitizedCart = sanitized.items;
  const removedCount =
    sanitized.removedMissingVariant + sanitized.removedInvalidPrice + sanitized.removedInvalidQuantity;
  if (removedCount > 0) {
    localStorage.setItem(CART_KEY, JSON.stringify({ items: sanitizedCart }));
    emitCartUpdated(sanitizedCart);
  }

  const cartId = await ensureMedusaCartId();
  if (!cartId) return { ok: false, error: 'Failed to initialize Medusa cart.' };
  console.info('[cart-debug] before medusa sync', {
    itemCount: sanitizedCart.length,
    attempt
  });

  try {
    const response = await fetch('/api/medusa/cart/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, cart: { items: sanitizedCart } })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn('[lib/cart] Medusa cart sync failed', {
        status: response.status,
        error: payload?.error,
        missingItems: payload?.missingItems
      });

      if (attempt === 0 && Array.isArray(payload?.missingItems) && payload.missingItems.length > 0) {
        const missingIds = new Set(
          payload.missingItems
            .map((entry: unknown) => normalizeLocalItemId(entry))
            .filter((entry: string) => entry.length > 0)
        );
        const recovered = sanitizedCart.filter((item) => !missingIds.has(normalizeLocalItemId(item.id)));
        if (recovered.length !== sanitizedCart.length) {
          localStorage.setItem(CART_KEY, JSON.stringify({ items: recovered }));
          emitCartUpdated(recovered);
          return syncMedusaCartAttempt(recovered, attempt + 1);
        }
      }

      return { ok: false, error: payload?.error || 'Failed to sync cart with checkout.' };
    }
    console.info('[cart-debug] after medusa sync response', {
      ok: true,
      itemCount: Array.isArray(payload?.cart?.items) ? payload.cart.items.length : undefined
    });
    return { ok: true, cart: payload?.cart ?? null };
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
      const normalizedId = normalizeLocalItemId(item?.id);
      const withNormalizedId = {
        ...item,
        id: normalizedId || String(item?.id || '')
      };
      if (normalizedId !== String(item?.id || '')) healed = true;
      const normalized = normalizeLegacyUpgradeCents(withNormalizedId);
      if (normalized.changed) healed = true;
      return normalized.item;
    });
    
    const sanitized = sanitizeCartItems(items as CartItem[]);
    const validItems = sanitized.items;
    
    // If we filtered out invalid items, save the cleaned cart
    if (validItems.length !== items.length || healed) {
      const removed = items.length - validItems.length;
      if (removed > 0 && !hasLoggedCartCleanupThisPage) {
        console.log('[cart] Cleaned invalid items from cart', {
          removed,
          removedMissingVariant: sanitized.removedMissingVariant,
          removedInvalidPrice: sanitized.removedInvalidPrice,
          removedInvalidQuantity: sanitized.removedInvalidQuantity
        });
        hasLoggedCartCleanupThisPage = true;
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
    persistCartLocally(cart);
    void syncMedusaCart(cart);
  } catch (error) {
    void error;
  }
}

export function persistCartLocally(cart: CartItem[]): void {
  if (isBrowser()) {
    localStorage.setItem(CART_KEY, JSON.stringify({ items: cart }));
  }
  console.info('[cart-debug] cart write', { itemCount: cart.length });
  emitCartUpdated(cart);
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
  const normalizedItem: CartItem = {
    ...item,
    id: normalizeLocalItemId(item.id)
  };
  const cart = getCart();
  const idx = cart.findIndex((c) => c.id === normalizedItem.id);
  if (idx >= 0) {
    const existing = cart[idx];
    cart[idx] = {
      ...existing,
      ...normalizedItem,
      quantity: (existing.quantity || 0) + (normalizedItem.quantity || 1)
    };
  } else {
    cart.push({ ...normalizedItem, quantity: normalizedItem.quantity || 1 });
  }
  console.info('[cart-debug] cart write', {
    action: 'add',
    itemId: normalizedItem.id,
    itemCount: cart.length
  });
  saveCart(cart);
  return cart;
}
