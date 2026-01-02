'use client';

import CartModal from '@components/cart/modal';
import { CartProvider } from '@components/cart/cart-context';

export default function CartEntry() {
  return (
    <CartProvider>
      <CartModal />
    </CartProvider>
  );
}
