/**
 * Checkout API Utilities
 * Following specification: docs/checkout/checkout-flow-spec.md
 */

import { medusaFetch } from '../medusa';
import type {
  MedusaCart,
  ShippingOption,
  AddressFormData,
  PaymentIntentResponse
} from './types';

export async function fetchCart(cartId: string): Promise<MedusaCart> {
  const response = await medusaFetch(`/store/carts/${cartId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cart: ${response.statusText}`);
  }
  const data = await response.json();
  return data.cart;
}

export async function updateCartAddress(
  cartId: string,
  addressData: AddressFormData
): Promise<MedusaCart> {
  const response = await medusaFetch(`/store/carts/${cartId}`, {
    method: 'POST',
    body: JSON.stringify({
      email: addressData.email,
      shipping_address: {
        first_name: addressData.first_name,
        last_name: addressData.last_name,
        address_1: addressData.address_1,
        address_2: addressData.address_2 || '',
        city: addressData.city,
        province: addressData.province,
        postal_code: addressData.postal_code,
        country_code: addressData.country_code,
        phone: addressData.phone || ''
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update address');
  }

  const data = await response.json();
  return data.cart;
}

export async function fetchShippingOptions(
  cartId: string
): Promise<ShippingOption[]> {
  if (typeof window !== 'undefined') {
    const apiResponse = await fetch('/api/medusa/cart/shipping-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId })
    });

    const payload = await apiResponse.json().catch(() => ({}));

    if (apiResponse.ok) {
      return payload?.shippingOptions ?? payload?.shipping_options ?? [];
    }

    // If the API route is unavailable, fall back to the Medusa store endpoint.
    if (apiResponse.status !== 404 && apiResponse.status !== 405) {
      const errorMsg = payload?.error || payload?.message;
      throw new Error(errorMsg || 'Failed to calculate shipping options.');
    }
  }

  const response = await medusaFetch(`/store/shipping-options?cart_id=${cartId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.message || response.statusText;
    throw new Error(
      `Failed to fetch shipping options: ${errorMsg}. ` +
      `This may indicate missing weight/dimensions on product variants. ` +
      `Check Medusa Admin → Products → Variants for complete shipping data.`
    );
  }

  const data = await response.json();
  return data.shipping_options || [];
}

export async function applyShippingMethod(
  cartId: string,
  optionId: string
): Promise<MedusaCart> {
  const response = await medusaFetch(
    `/store/carts/${cartId}/shipping-methods`,
    {
      method: 'POST',
      body: JSON.stringify({
        option_id: optionId
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to apply shipping method');
  }

  const data = await response.json();
  return data.cart;
}

export async function createPaymentIntent(
  cartId: string
): Promise<PaymentIntentResponse> {
  const response = await fetch('/api/medusa/payments/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cartId })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.error || 'Failed to create payment intent'
    );
  }

  return response.json();
}

export function formatCurrency(amount: number, currencyCode: string): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return 'Price unavailable';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.toUpperCase()
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

/**
 * Service tiers shown to customers at checkout.
 *
 * Workers in fas-dash see the full carrier account menu when purchasing
 * a label — these restrictions apply to the storefront only.
 *
 * Each tier is matched against the option name (case-insensitive).
 * Medusa shipping option names are typically the UPS service level name
 * e.g. "UPS Ground", "UPS 3 Day Select", "UPS 2nd Day Air", "UPS Next Day Air".
 */
const STOREFRONT_SERVICE_TIERS: { label: string; pattern: RegExp }[] = [
  // Ground / Standard
  { label: 'Ground', pattern: /\bground\b|\bstandard\b/i },
  // 3-Day Select
  { label: '3-Day', pattern: /3[\s-]?day/i },
  // 2nd Day Air (includes A.M. variant)
  { label: '2nd Day', pattern: /2n?d[\s-]?day/i },
  // Next Day Air (includes Saver, Early A.M.)
  { label: 'Next Day', pattern: /next[\s-]?day/i },
];

function matchesStorefrontTier(name: string): boolean {
  return STOREFRONT_SERVICE_TIERS.some(({ pattern }) => pattern.test(name));
}

export function filterValidShippingOptions(
  options: ShippingOption[]
): ShippingOption[] {
  const filtered = options.filter((option) => {
    const carrier = (option.data?.carrier || '').toUpperCase();
    const name = option.name || '';

    // Carrier must be UPS
    if (carrier !== 'UPS') {
      return false;
    }

    // Service must match one of the 4 customer tiers
    if (!matchesStorefrontTier(name)) {
      return false;
    }

    // Price must be present (fixed) or dynamic (calculated)
    const hasAmount =
      typeof option.amount === 'number' && Number.isFinite(option.amount);
    const hasCalculated =
      typeof option.calculated_price === 'number' &&
      Number.isFinite(option.calculated_price);

    return hasAmount || hasCalculated;
  });

  // Sort: Ground → 3-Day → 2nd Day → Next Day
  const tierOrder = (name: string): number => {
    for (let i = 0; i < STOREFRONT_SERVICE_TIERS.length; i++) {
      if (STOREFRONT_SERVICE_TIERS[i].pattern.test(name)) return i;
    }
    return STOREFRONT_SERVICE_TIERS.length;
  };

  return filtered.sort((a, b) => tierOrder(a.name || '') - tierOrder(b.name || ''));
}
