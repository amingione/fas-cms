'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from './cart-context';
import * as React from 'react';

export function DeleteItemButton({ id }: { id: string }) {
  const { removeCartItem } = useCart();
  const [loading, setLoading] = React.useState(false);

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await removeCartItem(id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onDelete}>
      <button
        type="submit"
        aria-label="Remove cart item"
        disabled={loading}
        className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-neutral-500 disabled:opacity-50"
      >
        <XMarkIcon className="mx-[1px] h-4 w-4 text-white dark:text-black" />
      </button>
    </form>
  );
}
