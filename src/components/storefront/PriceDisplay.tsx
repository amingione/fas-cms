import * as React from 'react';
import {
  formatPrice,
  getActivePrice,
  getCompareAtPrice,
  getSaleBadgeText,
  isOnSale
} from '@/lib/saleHelpers';

export type PricingShape = {
  price?: number;
  salePrice?: number;
  onSale?: boolean;
  compareAtPrice?: number;
  discountPercentage?: number;
  discountPercent?: number;
  saleActive?: boolean;
  saleStartDate?: string;
  saleEndDate?: string;
  saleLabel?: string;
};

export function PriceDisplay({ pricing }: { pricing: PricingShape }) {
  const activePrice = getActivePrice(pricing as any);
  const comparePrice = getCompareAtPrice(pricing as any);
  const onSale = isOnSale(pricing as any);
  const saleBadge = getSaleBadgeText(pricing as any);

  return (
    <div className="price">
      {onSale ? (
        <>
          <span className="sale-price text-2xl font-bold text-red-600">
            {formatPrice(activePrice)}
          </span>
          {comparePrice && (
            <span className="original-price text-lg line-through text-gray-500 ml-2">
              {formatPrice(comparePrice)}
            </span>
          )}
          {saleBadge && (
            <span className="discount-badge ml-2 bg-red-100 text-red-800 px-2 py-1 rounded">
              {saleBadge}
            </span>
          )}
        </>
      ) : (
        <span className="regular-price text-2xl font-bold">{formatPrice(activePrice)}</span>
      )}

      {comparePrice && !onSale && (
        <span className="compare-price text-lg line-through text-gray-500 ml-2">
          {formatPrice(comparePrice)}
        </span>
      )}
    </div>
  );
}

export default PriceDisplay;
