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
        className="flex h-5 w-5 items-center justify-center rounded-full bg-black disabled:opacity-50"
      >
        <XMarkIcon className="h-3 w-3 text-red-500" />
      </button>
    </form>
  );
}
