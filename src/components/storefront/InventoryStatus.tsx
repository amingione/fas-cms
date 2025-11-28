import * as React from 'react';

type InventoryShape = {
  trackInventory?: boolean;
  inStock?: boolean;
  quantity?: number;
  allowBackorder?: boolean;
  lowStock?: boolean;
  lowStockThreshold?: number;
  backorderMessage?: string;
  restockDate?: string;
};

type Props = {
  product: { inventory?: InventoryShape };
  selectedVariant?: { inventory?: InventoryShape } | null;
};

export function InventoryStatus({ product, selectedVariant }: Props) {
  const inventory = selectedVariant?.inventory || product.inventory || {};

  if (!inventory.trackInventory) {
    return <span className="text-green-600">In Stock</span>;
  }

  if (!inventory.inStock && !inventory.allowBackorder) {
    return (
      <div className="text-red-600">
        Out of Stock
        {inventory.restockDate && (
          <span className="text-sm"> • Expected {new Date(inventory.restockDate).toLocaleDateString()}</span>
        )}
      </div>
    );
  }

  if (!inventory.inStock && inventory.allowBackorder) {
    return (
      <div className="text-yellow-600">
        Backorder Available
        {inventory.backorderMessage && <p className="text-sm">{inventory.backorderMessage}</p>}
      </div>
    );
  }

  if (inventory.lowStock) {
    return <span className="text-yellow-600">Only {inventory.quantity} left in stock!</span>;
  }

  return <span className="text-green-600">In Stock</span>;
}

export default InventoryStatus;
