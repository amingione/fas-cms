'use client';

import { useEffect, useState } from 'react';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { CART_EVENT, getCart } from '@/lib/cart';

export default function HomepageCartButton() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const compute = () => {
      const cart = getCart();
      const qty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setTotal(qty);
    };

    compute();

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ cart?: { items?: Array<{ quantity?: number }> } }>).detail;
      const items = Array.isArray(detail?.cart?.items) ? detail.cart.items : null;
      if (items) {
        setTotal(items.reduce((sum, item) => sum + (item.quantity || 0), 0));
        return;
      }
      compute();
    };

    window.addEventListener(CART_EVENT as any, onChange as EventListener);
    return () => window.removeEventListener(CART_EVENT as any, onChange as EventListener);
  }, []);

  const handleOpen = () => {
    window.dispatchEvent(new Event('open-cart'));
  };

  return (
    <button className="homepage-cart-button" type="button" aria-label="Open cart" onClick={handleOpen}>
      <ShoppingBagIcon aria-hidden="true" />
      <span>Cart</span>
      <strong>{total}</strong>
    </button>
  );
}
