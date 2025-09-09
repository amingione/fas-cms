'use client';

import { useEffect, useState } from 'react';
import OpenCart from './open-cart';
import { CART_EVENT, getCart } from '@/lib/cart';

export default function CartButton() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const compute = () => {
      const cart = getCart();
      const qty = cart.reduce((sum, it) => sum + (it.quantity || 0), 0);
      setTotal(qty);
    };
    compute();
    function onChange(ev: any) {
      try {
        const items = ev.detail.cart.items || [];
        const qty = items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
        setTotal(qty);
      } catch {
        compute();
      }
    }
    window.addEventListener(CART_EVENT as any, onChange as EventListener);
    return () => window.removeEventListener(CART_EVENT as any, onChange as EventListener);
  }, []);

  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-cart'));
    }
  };

  return (
    <button aria-label="Open cart" onClick={handleClick}>
      <OpenCart quantity={total} />
    </button>
  );
}
