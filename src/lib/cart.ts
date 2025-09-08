export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  categories?: string[];
  image?: string;
};

export const CART_KEY = 'fas_cart_v1';
export const CART_EVENT = 'cart:changed';

export function getCart(): CartItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CART_KEY, JSON.stringify({ items: cart }));
    }
    emitCartUpdated(cart);
  } catch {}
}

export function emitCartUpdated(cart: CartItem[]): void {
  try {
    const detail = { cart: { items: cart } } as any;
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(CART_EVENT, { detail }));
    }
  } catch {}
}

export function addItem(item: CartItem): CartItem[] {
  const cart = getCart();
  const idx = cart.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    cart[idx].quantity = (cart[idx].quantity || 0) + (item.quantity || 1);
  } else {
    cart.push({ ...item, quantity: item.quantity || 1 });
  }
  saveCart(cart);
  return cart;
}
