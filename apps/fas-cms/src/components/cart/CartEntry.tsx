'use client';

import React from 'react';
import CartModal from '@components/cart/modal';
import { CartProvider } from '@components/cart/cart-context';

export default function CartEntry() {
  return (
    <CartProvider>
      <CartModal />
    </CartProvider>
  );
}

