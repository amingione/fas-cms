import {
  CART_EVENT,
  CART_KEY,
  addItem as addCanonicalItem,
  ensureMedusaCartId,
  getCart as getCanonicalCart,
  saveCart as saveCanonicalCart,
  syncMedusaCart,
  type SyncMedusaCartResult,
  type CartItem as CanonicalCartItem
} from '@/lib/cart';
import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';

const CHECKOUT_DISCOUNT_STATE_KEY = 'fas_checkout_discount_state_v1';

export type SelectedUpgradeDetailed = {
  label: string;
  priceCents: number;
  medusaOptionValueId: string;
};

export type CartItem = CanonicalCartItem & {
  medusaLineItemId?: string;
};

export type CartTotals = {
  subtotal?: number;
  tax_total?: number;
  shipping_total?: number;
  discount_total?: number;
  total?: number;
  original_total?: number;
};

export type Cart = { items: CartItem[]; totals?: CartTotals };

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

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === 'string'
          ? entry
          : entry && typeof entry === 'object'
            ? String((entry as any).value ?? (entry as any).label ?? '')
            : ''
      )
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function ensureSelectedUpgradesDetailed(value: unknown): SelectedUpgradeDetailed[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const rec = entry as Record<string, unknown>;
      const label = String(rec.label ?? rec.value ?? '').trim();
      const priceCentsRaw = rec.priceCents;
      const parsedPrice =
        typeof priceCentsRaw === 'number'
          ? priceCentsRaw
          : typeof priceCentsRaw === 'string'
            ? Number(priceCentsRaw)
            : NaN;
      if (!Number.isFinite(parsedPrice) || !label) return null;
      const priceCents = Math.round(parsedPrice);
      const medusaOptionValueId = String(rec.medusaOptionValueId ?? '').trim();
      return { label, priceCents, medusaOptionValueId };
    })
    .filter((entry): entry is SelectedUpgradeDetailed => Boolean(entry));
}

function emitCartChanged(cart: Cart) {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { cart } }));
  } catch {
    // no-op
  }
}

function writeCartState(cart: Cart) {
  if (!isBrowser()) return;
  const normalized = toDisplayCart(cart.items as CanonicalCartItem[]);
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(normalized));
  } catch {
    // no-op
  }
  emitCartChanged(normalized);
}

function toDisplayCart(items: CanonicalCartItem[]): Cart {
  const subtotal = items.reduce((sum, item) => {
    const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0;
    const qty = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 0;
    return sum + price * Math.max(0, qty);
  }, 0);
  return {
    items: items as CartItem[],
    totals: {
      subtotal,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      total: subtotal
    }
  };
}

export function getCart(): Cart {
  return toDisplayCart(getCanonicalCart());
}

async function syncDisplayCart(cart: Cart): Promise<SyncMedusaCartResult> {
  console.info('[cart-debug] before medusa sync', { itemCount: cart.items.length, source: 'actions' });
  const result = await syncMedusaCart(cart.items as CanonicalCartItem[]);
  console.info('[cart-debug] after medusa sync response', {
    ok: result.ok,
    source: 'actions',
    hasError: Boolean(result.error)
  });
  return result;
}

function normalizeId(input: any): string | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') return normalizeLocalItemId(input);
  if (typeof input === 'object') {
    return normalizeLocalItemId(input.id || input.selectedVariantId || input.productId);
  }
}

export async function addItem(
  _prevState: any,
  payload:
    | string
    | (Partial<CartItem> & { id?: string; selectedVariantId?: string; quantity?: number })
) {
  const id = normalizeId(payload);
  if (!id) return 'Error adding item to cart';
  if (typeof payload !== 'object') {
    return 'Please select a product variant before adding this item to your cart.';
  }

  const medusaVariantId = payload.medusaVariantId;
  if (!medusaVariantId || typeof medusaVariantId !== 'string') {
    return 'Please select a product variant before adding this item to your cart.';
  }

  if (typeof payload.price !== 'number' || !Number.isFinite(payload.price) || payload.price <= 0) {
    return 'This product cannot be added to cart. Price information is missing or invalid.';
  }

  const qty = typeof payload.quantity === 'number' ? payload.quantity : 1;
  const selectedOptions = ensureStringArray(payload.selectedOptions ?? (payload as any)?.options);
  const selectedUpgrades = ensureStringArray(payload.selectedUpgrades ?? (payload as any)?.upgrades);
  const selectedUpgradesDetailed = ensureSelectedUpgradesDetailed(
    (payload as any).selectedUpgradesDetailed
  );
  if (selectedUpgrades.length > 0 && selectedUpgradesDetailed.length === 0) {
    return 'One of the options you selected is not available for checkout right now. Please remove that option and try again.';
  }

  const nextItem: CartItem = {
    id,
    name: payload.name || 'Item',
    price: payload.price,
    originalPrice: typeof payload.originalPrice === 'number' ? payload.originalPrice : undefined,
    basePrice: typeof payload.basePrice === 'number' ? payload.basePrice : undefined,
    extra: typeof payload.extra === 'number' ? payload.extra : undefined,
    isOnSale: typeof payload.isOnSale === 'boolean' ? payload.isOnSale : undefined,
    saleLabel: typeof payload.saleLabel === 'string' ? payload.saleLabel : undefined,
    quantity: Math.max(1, qty),
    image: payload.image,
    options: payload.options,
    selectedOptions,
    selectedUpgrades,
    selectedUpgradesDetailed,
    installOnly: typeof payload.installOnly === 'boolean' ? payload.installOnly : undefined,
    shippingClass: typeof payload.shippingClass === 'string' ? payload.shippingClass : undefined,
    shippingWeight: typeof payload.shippingWeight === 'number' ? payload.shippingWeight : undefined,
    shippingDimensions:
      payload.shippingDimensions && typeof payload.shippingDimensions === 'object'
        ? payload.shippingDimensions
        : undefined,
    productUrl: payload.productUrl,
    sku: payload.sku,
    stripePriceId: payload.stripePriceId,
    medusaVariantId,
    productId: payload.productId,
    productSlug: payload.productSlug,
    upgrades: payload.upgrades ?? payload.selectedUpgrades
  };

  console.info('[cart-debug] cart write', { action: 'add', itemId: nextItem.id });
  try {
    addCanonicalItem(nextItem as CanonicalCartItem);
  } catch (error: any) {
    return error?.message || 'Failed to add item to cart.';
  }

  const syncResult = await syncDisplayCart(getCart());
  if (!syncResult.ok) return syncResult.error || 'Failed to sync your cart.';
}

export async function removeItem(_prevState: any, id: string) {
  if (!id) return 'Error removing item from cart';
  const cart = getCart();
  const next: Cart = { ...cart, items: cart.items.filter((it) => it.id !== id) };
  console.info('[cart-debug] cart write', { action: 'remove', itemId: id, itemCount: next.items.length });
  writeCartState(next);
  const syncResult = await syncDisplayCart(next);
  if (!syncResult.ok) return syncResult.error || 'Failed to sync your cart.';
}

export async function updateItemQuantity(
  _prevState: any,
  payload: { id: string; quantity: number }
) {
  const { id, quantity } = payload || ({} as any);
  if (!id || typeof quantity !== 'number') return 'Error updating item quantity';

  const cart = getCart();
  const idx = cart.items.findIndex((it) => it.id === id);
  if (idx < 0) {
    if (quantity > 0) {
      return 'Item not found in cart.';
    }
    return;
  }

  if (quantity <= 0) {
    cart.items.splice(idx, 1);
  } else {
    cart.items[idx] = { ...cart.items[idx], quantity: Math.max(1, Math.floor(quantity)) };
  }

  console.info('[cart-debug] cart write', { action: 'quantity', itemId: id, quantity });
  writeCartState(cart);
  const syncResult = await syncDisplayCart(cart);
  if (!syncResult.ok) return syncResult.error || 'Failed to sync your cart.';
}

export async function clearCart() {
  const empty: Cart = { items: [] };
  console.info('[cart-debug] cart write', { action: 'clear' });
  // Remove the Medusa cart ID so the next checkout session gets a fresh cart.
  // Without this, ensureMedusaCartId() would reuse a stale/completed cart ID
  // and cause silent sync failures on the next visit.
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(MEDUSA_CART_ID_KEY);
    window.localStorage.removeItem(CHECKOUT_DISCOUNT_STATE_KEY);
  }
  writeCartState(empty);
  const syncResult = await syncDisplayCart(empty);
  if (!syncResult.ok) return syncResult.error || 'Failed to sync your cart.';
}

export async function createCartAndSetCookie() {
  await ensureMedusaCartId();
}

function buildIdentityQuantitySignature(entries: Array<{ key: string; qty: number }>): string {
  const quantities = new Map<string, number>();
  for (const entry of entries) {
    const key = normalizeLocalItemId(entry.key);
    const qty = Math.max(1, Number(entry.qty) || 1);
    if (!key) continue;
    quantities.set(key, (quantities.get(key) || 0) + qty);
  }
  return Array.from(quantities.entries())
    .map(([key, qty]) => `${key}|${qty}`)
    .sort()
    .join('::');
}

function buildLocalSignature(items: CartItem[]): string {
  return buildIdentityQuantitySignature(
    items.map((item) => ({
      key: item.id || item.medusaVariantId || '',
      qty: item.quantity
    }))
  );
}

function buildCheckoutSignature(checkoutCart: any): string {
  const items = Array.isArray(checkoutCart?.items) ? checkoutCart.items : [];
  return buildIdentityQuantitySignature(
    items.map((item: any) => ({
      key:
        item?.local_item_id ||
        item?.metadata?.local_item_id ||
        item?.medusa_variant_id ||
        item?.variant_id ||
        item?.metadata?.resolved_variant_id ||
        item?.metadata?.base_variant_id ||
        '',
      qty: item?.quantity
    }))
  );
}

async function fetchAuthoritativeCheckoutCart(cartId: string): Promise<any | null> {
  const response = await fetch(`/api/cart/${encodeURIComponent(cartId)}`);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  return payload?.cart ?? null;
}

export async function redirectToCheckout() {
  if (!isBrowser()) return;

  const localCart = getCart();
  if (!Array.isArray(localCart.items) || localCart.items.length === 0) {
    return 'Your cart is empty.';
  }

  const cartId = await ensureMedusaCartId();
  if (!cartId) {
    return 'Failed to initialize checkout. Please try again.';
  }

  console.info('[cart-debug] before medusa sync', {
    source: 'redirectToCheckout',
    itemCount: localCart.items.length
  });
  const firstSync = await syncDisplayCart(localCart);
  if (!firstSync.ok) {
    return firstSync.error || 'Failed to sync your cart. Please try again.';
  }

  let authoritative = firstSync.cart ?? (await fetchAuthoritativeCheckoutCart(cartId));
  if (!authoritative) {
    return 'Unable to validate cart for checkout. Please try again.';
  }

  const localSignature = buildLocalSignature(localCart.items);
  let serverSignature = buildCheckoutSignature(authoritative);
  const hasServerItems = Array.isArray(authoritative.items) && authoritative.items.length > 0;
  const driftDetected = localSignature !== serverSignature;

  if (!hasServerItems || driftDetected) {
    if (driftDetected) {
      console.warn('[cart-debug] checkout signature drift (pre-retry)', {
        localSignature,
        serverSignature
      });
    }
    const retrySync = await syncDisplayCart(getCart());
    if (!retrySync.ok) {
      return retrySync.error || 'Unable to prepare checkout cart. Please try again.';
    }
    authoritative = retrySync.cart ?? (await fetchAuthoritativeCheckoutCart(cartId));
    if (!authoritative) {
      return 'Unable to validate cart for checkout. Please try again.';
    }
    serverSignature = buildCheckoutSignature(authoritative);

    if (!Array.isArray(authoritative.items) || authoritative.items.length === 0) {
      return 'Checkout cart is empty after sync. Please refresh your cart and try again.';
    }
    if (localSignature !== serverSignature) {
      console.warn('[cart-debug] checkout signature drift (post-retry)', {
        localSignature,
        serverSignature
      });
      return 'Your cart could not be reconciled for checkout. Please refresh and try again.';
    }
  }

  console.info('[cart-debug] before redirect checkout', {
    itemCount: authoritative.items.length,
    driftDetected: driftDetected
  });

  window.location.href = '/checkout';
}
