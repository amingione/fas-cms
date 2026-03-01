import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';

// Cart actions for Astro + client-side cart (localStorage).
// These helpers are safe to import in client components. No Next.js/Shopify deps.

const CART_KEY = 'fas_cart_v1';

export type SelectedUpgradeDetailed = {
  label: string;
  priceCents: number;
  medusaOptionValueId: string;
};

export type CartItem = {
  id: string; // product or variant id
  name?: string;
  price?: number; // unit price in cents (display-only; source of truth remains on server)
  originalPrice?: number;
  basePrice?: number;
  extra?: number;
  isOnSale?: boolean;
  saleLabel?: string;
  quantity: number;
  image?: string;
  options?: Record<string, string>; // e.g., { color: 'Red', size: 'L' }
  selectedOptions?: string[];
  selectedUpgrades?: string[];
  selectedUpgradesDetailed?: SelectedUpgradeDetailed[];
  installOnly?: boolean;
  shippingClass?: string;
  shippingWeight?: number;
  shippingDimensions?: { length?: number; width?: number; height?: number };
  productUrl?: string;
  sku?: string;
  stripePriceId?: string;
  medusaVariantId?: string;
  productId?: string;
  productSlug?: string;
  upgrades?: unknown;
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

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry : entry && typeof entry === 'object' ? String((entry as any).value ?? (entry as any).label ?? '') : ''))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entry]) => {
        if (typeof entry === 'string') return `${key}: ${entry}`;
        if (entry && typeof entry === 'object') {
          const normalized = (entry as any).label ?? (entry as any).value;
          return normalized ? `${key}: ${String(normalized)}` : '';
        }
        return '';
      })
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
      const priceCentsRaw = rec.priceCents ?? rec.price ?? rec.priceDelta;
      const parsedPrice =
        typeof priceCentsRaw === 'number'
          ? priceCentsRaw
          : typeof priceCentsRaw === 'string'
            ? Number(priceCentsRaw)
            : NaN;
      const priceCents = Number.isFinite(parsedPrice) ? Math.round(parsedPrice) : 0;
      const medusaOptionValueId = String(rec.medusaOptionValueId ?? '').trim();
      if (!label) return null;
      return { label, priceCents, medusaOptionValueId };
    })
    .filter((entry): entry is SelectedUpgradeDetailed => Boolean(entry));
}

function normalizeCartItemUpgrades(item: CartItem): { item: CartItem; changed: boolean } {
  const detailed = ensureSelectedUpgradesDetailed((item as any).selectedUpgradesDetailed);
  if (!detailed.length) return { item, changed: false };

  let changed = false;
  const normalized = detailed.map((entry) => {
    let next = entry.priceCents;
    // Legacy bad state used dollars in a cents field (e.g. 60 interpreted/displayed as $0.60).
    if (next > 0 && next < 100) {
      next = next * 100;
      changed = true;
    }
    return next === entry.priceCents ? entry : { ...entry, priceCents: next };
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

function sumSelectedUpgradeCents(item: CartItem): number {
  const detailed = ensureSelectedUpgradesDetailed((item as any).selectedUpgradesDetailed);
  return detailed.reduce((sum, entry) => {
    const cents = Number.isFinite(entry.priceCents) ? Math.round(entry.priceCents) : 0;
    return sum + (cents > 0 ? cents : 0);
  }, 0);
}

export function getCart(): Cart {
  if (!isBrowser()) return { items: [] };
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) {
      const base = parsed as Cart;
      let changed = false;
      const nextItems = base.items.map((item) => {
        const normalized = normalizeCartItemUpgrades(item as CartItem);
        if (normalized.changed) changed = true;
        return normalized.item;
      });
      if (changed) {
        const healed = { ...base, items: nextItems };
        localStorage.setItem(CART_KEY, JSON.stringify(healed));
        queueMicrotask(() => {
          void syncMedusaCart(healed);
        });
        return healed;
      }
      return base;
    }
    return { items: [] };
  } catch {
    return { items: [] };
  }
}

function saveCart(cart: Cart) {
  if (!isBrowser()) return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  // Notify listeners (e.g., floating cart) that cart has changed
  try {
    window.dispatchEvent(new CustomEvent('cart:changed', { detail: { cart } }));
  } catch (error) {
    void error;
  }
}

function readMedusaCartId(): string | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(MEDUSA_CART_ID_KEY);
  return raw && raw.trim() ? raw.trim() : null;
}

function writeMedusaCartId(cartId: string) {
  if (!isBrowser()) return;
  localStorage.setItem(MEDUSA_CART_ID_KEY, cartId);
}

async function ensureMedusaCartId(): Promise<string | null> {
  const existing = readMedusaCartId();
  if (existing) return existing;
  try {
    const response = await fetch('/api/medusa/cart/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => null);
    const cartId = data?.cartId;
    if (response.ok && typeof cartId === 'string' && cartId.trim()) {
      writeMedusaCartId(cartId.trim());
      return cartId.trim();
    }
  } catch (error) {
    void error;
  }
  return null;
}

type SyncMedusaCartResult = { ok: boolean; error?: string };

async function syncMedusaCart(cart: Cart): Promise<SyncMedusaCartResult> {
  if (!isBrowser()) return { ok: false, error: 'Cart is unavailable in this environment.' };
  const cartId = await ensureMedusaCartId();
  if (!cartId) {
    console.error('[Cart] Failed to get or create Medusa cart ID');
    return { ok: false, error: 'Failed to initialize cart.' };
  }

  try {
    console.log('[Cart] Syncing to Medusa cart:', cartId, 'Items:', cart.items.length);
    const response = await fetch('/api/medusa/cart/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, cart })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('[Cart] Medusa sync failed:', response.status, payload);
      return { ok: false, error: payload?.error || 'Failed to sync cart with checkout.' };
    }

    console.log('[Cart] Medusa sync successful');
    try {
      window.dispatchEvent(new CustomEvent('cart:medusa-synced', { detail: { cartId } }));
    } catch (error) {
      void error;
    }
    const mappings = Array.isArray(payload?.mappings) ? payload.mappings : [];
    const next = getCart();

    if (mappings.length) {
      let changed = false;
      for (const map of mappings) {
        const idx = next.items.findIndex((item) => item.id === map.id);
        if (idx >= 0 && !next.items[idx].medusaVariantId) {
          next.items[idx].medusaVariantId = map.medusaVariantId;
          changed = true;
        }
      }
      if (changed) saveCart(next);
    }

    // ✅ Medusa is authoritative: pull prices + totals from server cart response
    const serverCart = payload?.cart;
    if (serverCart && Array.isArray(serverCart.items)) {
      const byVariant = new Map<string, any>();
      const byLocalId = new Map<string, any>();
      for (const item of serverCart.items) {
        if (typeof item?.variant_id === 'string') {
          byVariant.set(item.variant_id, item);
        }
        const localId = item?.metadata?.local_item_id;
        if (typeof localId === 'string') {
          byLocalId.set(localId, item);
        }
      }

      let changed = false;
      next.items = next.items.map((item) => {
        const serverItem =
          (item.medusaVariantId ? byVariant.get(item.medusaVariantId) : undefined) ??
          byLocalId.get(item.id);
        if (!serverItem) return item;

        const serverUnitPrice =
          typeof serverItem.unit_price === 'number' ? serverItem.unit_price : item.price;
        const addOnTotalCents = sumSelectedUpgradeCents(item);
        const unitPrice =
          typeof serverUnitPrice === 'number'
            ? serverUnitPrice + (addOnTotalCents > 0 ? addOnTotalCents : 0)
            : item.price;
        const quantity = typeof serverItem.quantity === 'number' ? serverItem.quantity : item.quantity;
        const name = typeof serverItem.title === 'string' ? serverItem.title : item.name;
        const medusaLineItemId =
          typeof serverItem.id === 'string' ? serverItem.id : item.medusaLineItemId;

        if (unitPrice !== item.price || quantity !== item.quantity || name !== item.name || medusaLineItemId !== item.medusaLineItemId) {
          changed = true;
        }

        return {
          ...item,
          price: unitPrice,
          quantity,
          name,
          medusaLineItemId
        };
      });

      const derivedSubtotal = next.items.reduce((sum, entry) => {
        const unit = typeof entry.price === 'number' && Number.isFinite(entry.price) ? entry.price : 0;
        const qty = typeof entry.quantity === 'number' && Number.isFinite(entry.quantity) ? entry.quantity : 0;
        return sum + unit * qty;
      }, 0);
      const serverSubtotal =
        typeof serverCart.subtotal === 'number' && Number.isFinite(serverCart.subtotal)
          ? serverCart.subtotal
          : 0;
      const subtotal = Math.max(serverSubtotal, derivedSubtotal);
      const shippingTotal =
        typeof serverCart.shipping_total === 'number' && Number.isFinite(serverCart.shipping_total)
          ? serverCart.shipping_total
          : 0;
      const taxTotal =
        typeof serverCart.tax_total === 'number' && Number.isFinite(serverCart.tax_total)
          ? serverCart.tax_total
          : 0;
      const hasExplicitDiscounts =
        (Array.isArray((serverCart as any)?.discounts) && (serverCart as any).discounts.length > 0) ||
        (Array.isArray((serverCart as any)?.promotions) && (serverCart as any).promotions.length > 0);
      const rawDiscountTotal =
        typeof serverCart.discount_total === 'number' && Number.isFinite(serverCart.discount_total)
          ? serverCart.discount_total
          : 0;
      const discountTotal = hasExplicitDiscounts ? rawDiscountTotal : 0;
      const total = subtotal + shippingTotal + taxTotal - discountTotal;

      next.totals = {
        subtotal,
        tax_total: taxTotal,
        shipping_total: shippingTotal,
        discount_total: discountTotal,
        total,
        original_total: serverCart.original_total
      };

      saveCart(next);
    }
    return { ok: true };
  } catch (error) {
    console.error('[Cart] Medusa sync exception:', error);
    return { ok: false, error: 'Failed to sync cart with checkout.' };
  }
}

function normalizeId(input: any): string | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  if (typeof input === 'object') return input.id || input.selectedVariantId || input.productId;
}

// Add item: accepts either a string id or a payload object
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

  // ✅ MEDUSA-FIRST PRICING ENFORCEMENT
  // Block cart additions if price is undefined, null, 0, or invalid
  if (
    typeof payload.price !== 'number' ||
    !Number.isFinite(payload.price) ||
    payload.price <= 0
  ) {
    console.error('[cart/actions] BLOCKED: Invalid price for cart item', {
      id,
      price: payload.price,
      priceType: typeof payload.price,
      medusaVariantId,
      name: payload.name
    });
    return 'This product cannot be added to cart. Price information is missing or invalid.';
  }

  const qty =
    typeof payload === 'object' && typeof payload.quantity === 'number' ? payload.quantity! : 1;
  const selectedOptions = ensureStringArray(
    typeof payload === 'object'
      ? payload.selectedOptions ?? ensureStringArray((payload as any)?.options)
      : []
  );
  const selectedUpgrades = ensureStringArray(
    typeof payload === 'object' ? payload.selectedUpgrades ?? (payload as any)?.upgrades : []
  );
  const selectedUpgradesDetailed = ensureSelectedUpgradesDetailed(
    typeof payload === 'object' ? (payload as any).selectedUpgradesDetailed : []
  );
  if (selectedUpgrades.length > 0 && selectedUpgradesDetailed.length === 0) {
    return 'One or more upgrades are missing Medusa mapping data. Please reselect options.';
  }
  const missingMappedUpgrade = selectedUpgradesDetailed.find(
    (entry) => !entry.medusaOptionValueId
  );
  if (missingMappedUpgrade) {
    return `Upgrade "${missingMappedUpgrade.label}" is not mapped for checkout yet.`;
  }
  const cart = getCart();
  const idx = cart.items.findIndex((it) => it.id === id);
  if (idx >= 0) {
    cart.items[idx].quantity = Math.max(1, (cart.items[idx].quantity || 0) + qty);
    if (typeof payload === 'object') {
      if (typeof payload.installOnly === 'boolean') cart.items[idx].installOnly = payload.installOnly;
      if (typeof payload.shippingClass === 'string') cart.items[idx].shippingClass = payload.shippingClass;
      if (typeof payload.shippingWeight === 'number') cart.items[idx].shippingWeight = payload.shippingWeight;
      if (payload.shippingDimensions && typeof payload.shippingDimensions === 'object') {
        cart.items[idx].shippingDimensions = payload.shippingDimensions as CartItem['shippingDimensions'];
      }
      if (typeof payload.productUrl === 'string') cart.items[idx].productUrl = payload.productUrl;
      if (selectedOptions.length) cart.items[idx].selectedOptions = selectedOptions;
      if (selectedUpgrades.length) cart.items[idx].selectedUpgrades = selectedUpgrades;
      if (selectedUpgradesDetailed.length) {
        cart.items[idx].selectedUpgradesDetailed = selectedUpgradesDetailed;
      }
      if (payload.options) cart.items[idx].options = payload.options;
      if (payload.sku) cart.items[idx].sku = payload.sku;
      if (payload.stripePriceId) cart.items[idx].stripePriceId = payload.stripePriceId;
      if (payload.medusaVariantId) cart.items[idx].medusaVariantId = payload.medusaVariantId;
      if (payload.productId) cart.items[idx].productId = payload.productId;
      if (payload.productSlug) cart.items[idx].productSlug = payload.productSlug;
      if (typeof payload.basePrice === 'number') cart.items[idx].basePrice = payload.basePrice;
      if (typeof payload.extra === 'number') cart.items[idx].extra = payload.extra;
      // ✅ Price is already validated above - only update if valid
      if (typeof payload.price === 'number' && payload.price > 0) {
        cart.items[idx].price = payload.price;
      }
      if (typeof payload.originalPrice === 'number') cart.items[idx].originalPrice = payload.originalPrice;
      if (typeof payload.isOnSale === 'boolean') cart.items[idx].isOnSale = payload.isOnSale;
      if (typeof payload.saleLabel === 'string') cart.items[idx].saleLabel = payload.saleLabel;
    }
  } else {
    // ✅ New item - price is guaranteed valid from validation above
    cart.items.push({
      id,
      name: typeof payload === 'object' ? payload.name : undefined,
      price: payload.price, // ✅ Guaranteed to be valid number > 0
      originalPrice: typeof payload === 'object' ? payload.originalPrice : undefined,
      isOnSale: typeof payload === 'object' ? payload.isOnSale : undefined,
      saleLabel: typeof payload === 'object' ? payload.saleLabel : undefined,
      image: typeof payload === 'object' ? payload.image : undefined,
      options: typeof payload === 'object' ? payload.options : undefined,
      selectedOptions,
      selectedUpgrades,
      selectedUpgradesDetailed,
      basePrice: typeof payload === 'object' ? payload.basePrice : undefined,
      extra: typeof payload === 'object' ? payload.extra : undefined,
      quantity: Math.max(1, qty),
      installOnly: typeof payload === 'object' ? payload.installOnly : undefined,
      shippingClass: typeof payload === 'object' ? payload.shippingClass : undefined,
      shippingWeight: typeof payload === 'object' ? payload.shippingWeight : undefined,
      shippingDimensions: typeof payload === 'object' ? payload.shippingDimensions : undefined,
      productUrl: typeof payload === 'object' ? payload.productUrl : undefined,
      sku: typeof payload === 'object' ? payload.sku : undefined,
      stripePriceId: typeof payload === 'object' ? payload.stripePriceId : undefined,
      medusaVariantId: typeof payload === 'object' ? payload.medusaVariantId : undefined,
      productId: typeof payload === 'object' ? payload.productId : undefined,
      productSlug: typeof payload === 'object' ? payload.productSlug : undefined,
      upgrades: typeof payload === 'object' ? payload.upgrades ?? payload.selectedUpgrades : undefined
    });
  }
  saveCart(cart);
  const syncResult = await syncMedusaCart(cart);
  if (!syncResult.ok) return syncResult.error || 'Failed to sync your cart.';
}

export async function removeItem(_prevState: any, id: string) {
  if (!id) return 'Error removing item from cart';
  const cart = getCart();
  const next: Cart = { items: cart.items.filter((it) => it.id !== id) };
  saveCart(next);
  await syncMedusaCart(next);
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
      cart.items.push({ id, quantity });
    }
  } else {
    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = Math.floor(quantity);
    }
  }
  saveCart(cart);
  await syncMedusaCart(cart);
}

export async function clearCart() {
  saveCart({ items: [] });
  await syncMedusaCart({ items: [] });
}

// Creates/ensures a cart exists; kept for API compatibility with old code
export async function createCartAndSetCookie() {
  if (!getCart().items) saveCart({ items: [] });
}

// Attempt to start checkout; currently a placeholder until the new flow lands.
export async function redirectToCheckout() {
  if (!isBrowser()) return;

  const cart = getCart();
  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    return 'Your cart is empty.';
  }

  console.log('[Cart] Starting checkout process...');

  // Ensure Medusa cart exists
  const medusaCartId = await ensureMedusaCartId();
  if (!medusaCartId) {
    console.error('[Cart] Failed to create Medusa cart');
    return 'Failed to initialize checkout. Please try again.';
  }

  // Sync cart to Medusa and wait for success
  const syncResult = await syncMedusaCart(cart);
  if (!syncResult.ok) {
    console.error('[Cart] Failed to sync cart to Medusa');
    return syncResult.error || 'Failed to sync your cart. Please try again or contact support.';
  }

  // Verify all items have Medusa variant IDs
  const refreshed = getCart();
  const missingMedusa = refreshed.items.filter((item) => !item.medusaVariantId);
  if (missingMedusa.length) {
    console.error('[Cart] Items missing Medusa variant IDs:', missingMedusa);
    return 'Some items in your cart are missing required variant selections. Please update your cart before checkout.';
  }

  console.log('[Cart] Redirecting to checkout with Medusa cart:', medusaCartId);
  window.location.href = '/checkout';
}
