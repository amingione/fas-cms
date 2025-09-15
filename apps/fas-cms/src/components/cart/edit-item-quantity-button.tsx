'use client';

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import * as React from 'react';
import { useCart } from './cart-context';

function SubmitButton({ type }: { type: 'plus' | 'minus' }) {
  return (
    <button
      type="submit"
      aria-label={type === 'plus' ? 'Increase item quantity' : 'Reduce item quantity'}
      className={clsx(
        'ease size-20 flex relative items-center justify-center flex-none shrink-0 rounded-full text-primary dark:text-primary transition-all duration-200 hover:text-white'
      )}
    >
      {type === 'plus' ? <PlusIcon className="h-4 w-4" /> : <MinusIcon className="h-4 w-4" />}
    </button>
  );
}

// Accepts either the new local cart item shape { id, quantity } or the old Shopify shape with item.merchandise.id
export function EditItemQuantityButton({ item, type }: { item: any; type: 'plus' | 'minus' }) {
  const { updateCartItem } = useCart();
  const [loading, setLoading] = React.useState(false);

  const id: string | undefined = item?.id || item?.merchandise?.id;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      setLoading(true);
      await updateCartItem(id, type);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <SubmitButton type={type} />
    </form>
  );
}
