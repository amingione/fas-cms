import type { MedusaCart } from './types';
import { getCallForShippingQuote, getRequiresShipping } from '@/lib/medusa-metadata';

export type ShippingIntent = {
  hasCallForQuote: boolean;
  hasShippableItems: boolean;
  hasUnknownShipping: boolean;
  requiresShipping: boolean;
};

export const resolveCartShippingIntent = (cart: MedusaCart | null | undefined): ShippingIntent => {
  const items = Array.isArray(cart?.items) ? cart!.items : [];

  let hasCallForQuote = false;
  let hasShippableItems = false;
  let hasUnknownShipping = false;

  for (const item of items) {
    const callForQuote = getCallForShippingQuote(item);
    if (callForQuote === true) {
      hasCallForQuote = true;
    }

    const requiresShipping = getRequiresShipping(item);
    if (requiresShipping === true) {
      hasShippableItems = true;
    } else if (requiresShipping === undefined) {
      hasUnknownShipping = true;
    }
  }

  const requiresShipping = hasShippableItems || hasUnknownShipping;

  return {
    hasCallForQuote,
    hasShippableItems,
    hasUnknownShipping,
    requiresShipping
  };
};
