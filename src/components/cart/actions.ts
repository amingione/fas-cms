// Cart actions for Astro + client-side cart (localStorage) + Stripe checkout
// These helpers are safe to import in client components. No Next.js/Shopify deps.

const CART_KEY = 'fas_cart_v1';

export type CartItem = {
  id: string; // product or variant id
  name?: string;
  price?: number; // unit price (for quick display; source of truth remains on server)
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
  installOnly?: boolean;
  shippingClass?: string;
  productUrl?: string;
  sku?: string;
  stripePriceId?: string;
  productId?: string;
  productSlug?: string;
  upgrades?: unknown;
};

export type Cart = { items: CartItem[] };

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

export function getCart(): Cart {
  if (!isBrowser()) return { items: [] };
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) return parsed as Cart;
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
  const cart = getCart();
  const idx = cart.items.findIndex((it) => it.id === id);
  if (idx >= 0) {
    cart.items[idx].quantity = Math.max(1, (cart.items[idx].quantity || 0) + qty);
    if (typeof payload === 'object') {
      if (typeof payload.installOnly === 'boolean') cart.items[idx].installOnly = payload.installOnly;
      if (typeof payload.shippingClass === 'string') cart.items[idx].shippingClass = payload.shippingClass;
      if (typeof payload.productUrl === 'string') cart.items[idx].productUrl = payload.productUrl;
      if (selectedOptions.length) cart.items[idx].selectedOptions = selectedOptions;
      if (selectedUpgrades.length) cart.items[idx].selectedUpgrades = selectedUpgrades;
      if (payload.options) cart.items[idx].options = payload.options;
      if (payload.sku) cart.items[idx].sku = payload.sku;
      if (payload.stripePriceId) cart.items[idx].stripePriceId = payload.stripePriceId;
      if (payload.productId) cart.items[idx].productId = payload.productId;
      if (payload.productSlug) cart.items[idx].productSlug = payload.productSlug;
      if (typeof payload.basePrice === 'number') cart.items[idx].basePrice = payload.basePrice;
      if (typeof payload.extra === 'number') cart.items[idx].extra = payload.extra;
      if (typeof payload.price === 'number') cart.items[idx].price = payload.price;
      if (typeof payload.originalPrice === 'number') cart.items[idx].originalPrice = payload.originalPrice;
      if (typeof payload.isOnSale === 'boolean') cart.items[idx].isOnSale = payload.isOnSale;
      if (typeof payload.saleLabel === 'string') cart.items[idx].saleLabel = payload.saleLabel;
    }
  } else {
    cart.items.push({
      id,
      name: typeof payload === 'object' ? payload.name : undefined,
      price: typeof payload === 'object' ? payload.price : undefined,
      originalPrice: typeof payload === 'object' ? payload.originalPrice : undefined,
      isOnSale: typeof payload === 'object' ? payload.isOnSale : undefined,
      saleLabel: typeof payload === 'object' ? payload.saleLabel : undefined,
      image: typeof payload === 'object' ? payload.image : undefined,
      options: typeof payload === 'object' ? payload.options : undefined,
      selectedOptions,
      selectedUpgrades,
      basePrice: typeof payload === 'object' ? payload.basePrice : undefined,
      extra: typeof payload === 'object' ? payload.extra : undefined,
      quantity: Math.max(1, qty),
      installOnly: typeof payload === 'object' ? payload.installOnly : undefined,
      shippingClass: typeof payload === 'object' ? payload.shippingClass : undefined,
      productUrl: typeof payload === 'object' ? payload.productUrl : undefined,
      sku: typeof payload === 'object' ? payload.sku : undefined,
      stripePriceId: typeof payload === 'object' ? payload.stripePriceId : undefined,
      productId: typeof payload === 'object' ? payload.productId : undefined,
      productSlug: typeof payload === 'object' ? payload.productSlug : undefined,
      upgrades: typeof payload === 'object' ? payload.upgrades ?? payload.selectedUpgrades : undefined
    });
  }
  saveCart(cart);
}

export async function removeItem(_prevState: any, id: string) {
  if (!id) return 'Error removing item from cart';
  const cart = getCart();
  const next: Cart = { items: cart.items.filter((it) => it.id !== id) };
  saveCart(next);
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
}

export async function clearCart() {
  saveCart({ items: [] });
}

// Creates/ensures a cart exists; kept for API compatibility with old code
export async function createCartAndSetCookie() {
  if (!getCart().items) saveCart({ items: [] });
}

// Redirect to the checkout page so the flow can complete on the dedicated checkout form.
export async function redirectToCheckout() {
  if (!isBrowser()) return;
  window.location.href = '/checkout';
}
