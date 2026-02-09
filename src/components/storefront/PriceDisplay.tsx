import { formatCents } from '@/lib/pricing';
import {
  resolveProductCalculatedOriginalAmount,
  resolveProductCalculatedPriceAmount
} from '@/lib/medusa-storefront-pricing';

export type PricingShape = Record<string, unknown>;

export function PriceDisplay({ pricing }: { pricing: PricingShape }) {
  const activePrice = resolveProductCalculatedPriceAmount(pricing as any);
  const comparePrice = resolveProductCalculatedOriginalAmount(pricing as any);
  const onSale =
    typeof comparePrice === 'number' &&
    typeof activePrice === 'number' &&
    comparePrice > activePrice;

  return (
    <div className="price">
      {onSale ? (
        <>
          <span className="sale-price text-2xl font-bold text-red-600">
            {formatCents(activePrice)}
          </span>
          {comparePrice && (
            <span className="original-price text-lg line-through text-gray-500 ml-2">
              {formatCents(comparePrice)}
            </span>
          )}
        </>
      ) : (
        <span className="regular-price text-2xl font-bold">
          {typeof activePrice === 'number' ? formatCents(activePrice) : '—'}
        </span>
      )}

      {comparePrice && !onSale && (
        <span className="compare-price text-lg line-through text-gray-500 ml-2">
          {formatCents(comparePrice)}
        </span>
      )}
    </div>
  );
}

export default PriceDisplay;
