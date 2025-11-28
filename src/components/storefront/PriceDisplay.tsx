import * as React from 'react';

export type PricingShape = {
  price?: number;
  salePrice?: number;
  onSale?: boolean;
  compareAtPrice?: number;
  discountPercentage?: number;
  saleActive?: boolean;
};

export function PriceDisplay({ pricing }: { pricing: PricingShape }) {
  const activePrice = pricing.onSale && pricing.saleActive ? pricing.salePrice : pricing.price;

  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="price">
      {pricing.onSale && pricing.saleActive ? (
        <>
          <span className="sale-price text-2xl font-bold text-red-600">{formatCurrency(pricing.salePrice)}</span>
          <span className="original-price text-lg line-through text-gray-500 ml-2">
            {formatCurrency(pricing.price)}
          </span>
          {pricing.discountPercentage && (
            <span className="discount-badge ml-2 bg-red-100 text-red-800 px-2 py-1 rounded">
              Save {Math.round(pricing.discountPercentage)}%
            </span>
          )}
        </>
      ) : (
        <span className="regular-price text-2xl font-bold">{formatCurrency(activePrice)}</span>
      )}

      {pricing.compareAtPrice && !pricing.onSale && (
        <span className="compare-price text-lg line-through text-gray-500 ml-2">
          {formatCurrency(pricing.compareAtPrice)}
        </span>
      )}
    </div>
  );
}

export default PriceDisplay;
