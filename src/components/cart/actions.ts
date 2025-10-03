// Cart actions for Astro + client-side cart (localStorage) + Stripe checkout
// These helpers are safe to import in client components. No Next.js/Shopify deps.

const CART_KEY = 'fas_cart_v1';

export type CartItem = {
  id: string; // product or variant id
  name?: string;
  price?: number; // unit price (for quick display; source of truth remains on server)
  quantity: number;
  image?: string;
  options?: Record<string, string>; // e.g., { color: 'Red', size: 'L' }
  installOnly?: boolean;
  shippingClass?: string;
};

export type Cart = { items: CartItem[] };

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
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
  const cart = getCart();
  const idx = cart.items.findIndex((it) => it.id === id);
  if (idx >= 0) {
    cart.items[idx].quantity = Math.max(1, (cart.items[idx].quantity || 0) + qty);
    if (typeof payload === 'object') {
      if (typeof payload.installOnly === 'boolean') cart.items[idx].installOnly = payload.installOnly;
      if (typeof payload.shippingClass === 'string') cart.items[idx].shippingClass = payload.shippingClass;
    }
  } else {
    cart.items.push({
      id,
      name: typeof payload === 'object' ? payload.name : undefined,
      price: typeof payload === 'object' ? payload.price : undefined,
      image: typeof payload === 'object' ? payload.image : undefined,
      options: typeof payload === 'object' ? payload.options : undefined,
      quantity: Math.max(1, qty),
      installOnly: typeof payload === 'object' ? payload.installOnly : undefined,
      shippingClass: typeof payload === 'object' ? payload.shippingClass : undefined
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

// Redirect to checkout using your existing Netlify/Vercel function at /api/checkout
// Expects the endpoint to return { url: string } to redirect (e.g., Stripe session URL)
export type CheckoutShippingInput = {
  name?: string;
  email?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type CheckoutShippingRate = {
  carrierId?: string;
  carrier?: string;
  serviceCode?: string;
  service?: string;
  serviceName?: string;
  amount: number;
  currency: string;
  deliveryDays?: number | null;
  estimatedDeliveryDate?: string | null;
};

export type CheckoutOptions = {
  shipping?: CheckoutShippingInput;
  shippingRate?: CheckoutShippingRate;
};

export async function redirectToCheckout(options?: CheckoutOptions) {
  try {
    const cart = getCart();
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // API expects an array of cart items; send cart.items instead of entire cart object
      body: JSON.stringify({
        cart: cart.items,
        ...(options?.shipping ? { shipping: options.shipping } : {}),
        ...(options?.shippingRate ? { shippingRate: options.shippingRate } : {})
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as any)?.error || 'Checkout failed');
    }
    if (data?.url) {
      window.location.href = data.url as string;
      return;
    }
    throw new Error('No checkout URL returned');
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message) return e.message;
    return 'Error starting checkout';
  }
}
