export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  categories?: string[];
  image?: string;
};

export const CART_KEY = 'cart';
export const CART_EVENT = 'cart:updated';

export function getCart(): CartItem[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CART_KEY) : null;
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
    emitCartUpdated(cart);
  } catch {}
}

export function emitCartUpdated(cart: CartItem[]): void {
  try {
    const detail = { cart } as any;
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

