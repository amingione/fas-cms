'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  type Cart as LocalCart,
  type CartItem,
  type CheckoutOptions,
  getCart as getLocalCart,
  addItem as addItemAction,
  removeItem as removeItemAction,
  updateItemQuantity as updateQtyAction,
  clearCart as clearCartAction,
  redirectToCheckout as checkoutAction
} from '@components/cart/actions';

/**
 * Cart Context — FAS (Astro + Sanity + localStorage)
 *
 * - Removes Shopify/Next server cart semantics
 * - Keeps a reactive client cart sourced from localStorage
 * - Listens to `cart:changed` events emitted by actions.ts
 */

type UpdateType = 'plus' | 'minus' | 'delete';

export type Cart = LocalCart; // { items: CartItem[] }

type CartContextType = {
  cart: Cart;
  totalQuantity: number;
  subtotal: number; // display-only subtotal from item.price * qty (server remains source of truth)
  addCartItem: (item: Partial<CartItem> & { id: string; quantity?: number }) => Promise<void>;
  updateCartItem: (id: string, updateType: UpdateType) => Promise<void>;
  setItemQuantity: (id: string, quantity: number) => Promise<void>;
  removeCartItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  redirectToCheckout: (options?: CheckoutOptions) => Promise<void | string>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function computeTotals(cart: Cart) {
  const totalQuantity = cart.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const subtotal = cart.items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
  return { totalQuantity, subtotal };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(() => getLocalCart());

  // Stay in sync with any add/remove/update via actions.ts
  useEffect(() => {
    function onChanged(ev: any) {
      try {
        setCart(ev.detail.cart);
      } catch (error) {
        void error;
      }
    }
    window.addEventListener('cart:changed', onChanged as EventListener);
    return () => window.removeEventListener('cart:changed', onChanged as EventListener);
  }, []);

  async function addCartItem(item: Partial<CartItem> & { id: string; quantity?: number }) {
    await addItemAction(null as any, item);
    // actions.ts will emit cart:changed; no need to manually setCart
  }

  async function updateCartItem(id: string, updateType: UpdateType) {
    const current = getLocalCart();
    const existing = current.items.find((x) => x.id === id);
    const nextQty = (existing?.quantity || 0) + (updateType === 'plus' ? 1 : -1);
    await updateQtyAction(null as any, { id, quantity: nextQty });
  }

  async function setItemQuantity(id: string, quantity: number) {
    await updateQtyAction(null as any, { id, quantity });
  }

  async function removeCartItem(id: string) {
    await removeItemAction(null as any, id);
  }

  async function clearCart() {
    await clearCartAction();
  }

  async function redirectToCheckout(options?: CheckoutOptions) {
    return await checkoutAction(options);
  }

  const { totalQuantity, subtotal } = useMemo(() => computeTotals(cart), [cart]);

  const value: CartContextType = useMemo(
    () => ({
      cart,
      totalQuantity,
      subtotal,
      addCartItem,
      updateCartItem,
      setItemQuantity,
      removeCartItem,
      clearCart,
      redirectToCheckout
    }),
    [cart, totalQuantity, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
