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
  const response = await medusaFetch(
    `/store/shipping-options?cart_id=${cartId}`
  );

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

export function filterValidShippingOptions(
  options: ShippingOption[]
): ShippingOption[] {
  // UPS only - carrier filter
  const validCarriers = ['UPS'];

	  console.log('[ShippingFilter] Filtering shipping options:', {
	    total: options.length,
	    options: options.map((o) => ({
	      name: o.name,
	      carrier: o.data?.carrier,
	      amount: o.amount,
	      price_type: o.price_type,
	      calculated_price: o.calculated_price
	    }))
	  });

  const filtered = options.filter((option) => {
    const carrier = option.data?.carrier?.toUpperCase();
    
    // Step 1: Check carrier is UPS
    if (!carrier || !validCarriers.includes(carrier)) {
      console.log(`[ShippingFilter] ❌ Rejected ${option.name}: Wrong carrier (${carrier})`);
      return false;
    }

    // Step 2: Check price validity
    // For Medusa v2 with Shippo "live rates":
    // - price_type: "calculated" means dynamic pricing
    // - amount might be 0 or undefined initially
    // - Shippo returns all available UPS services (Ground, 2-Day, etc.) dynamically
    // - No need to filter by service level here - Shippo handles that
    
    // Accept if:
    // 1. Has amount > 0 (fixed price), OR
    // 2. price_type is "calculated" (dynamic Shippo pricing)
    const hasValidPrice = 
      (typeof option.amount === 'number' && option.amount > 0) ||
      option.price_type === 'calculated';
    
    if (!hasValidPrice) {
      console.log(`[ShippingFilter] ❌ Rejected ${option.name}: Invalid price (amount=${option.amount}, type=${option.price_type})`);
      return false;
    }

    console.log(`[ShippingFilter] ✅ Accepted ${option.name} (carrier=${carrier}, price_type=${option.price_type})`);
    return true;
  });

  console.log(`[ShippingFilter] Result: ${filtered.length} of ${options.length} options passed filter`);
  return filtered;
}
