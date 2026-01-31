/**
 * Checkout State Machine Types
 * Following specification: docs/checkout/checkout-flow-spec.md
 */

export type CheckoutState =
  | 'CART_LOADING'
  | 'CART_EMPTY'
  | 'ADDRESS_ENTRY'
  | 'SHIPPING_CALCULATION'
  | 'SHIPPING_SELECTION'
  | 'SHIPPING_APPLYING'
  | 'CART_FINALIZED'
  | 'PAYMENT_INTENT_CREATING'
  | 'PAYMENT_READY'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'SHIPPING_ERROR'
  | 'PAYMENT_INTENT_ERROR';

export type CheckoutAction =
  | { type: 'CART_LOADED'; cart: MedusaCart }
  | { type: 'CART_EMPTY' }
  | { type: 'ADDRESS_SUBMITTED'; cart: MedusaCart }
  | { type: 'SHIPPING_OPTIONS_LOADED'; options: ShippingOption[] }
  | { type: 'SHIPPING_OPTIONS_ERROR'; error: string }
  | { type: 'SHIPPING_SELECTED'; optionId: string }
  | { type: 'SHIPPING_APPLIED'; cart: MedusaCart }
  | { type: 'SHIPPING_APPLY_ERROR'; error: string }
  | { type: 'PROCEED_TO_PAYMENT' }
  | { type: 'PAYMENT_INTENT_CREATED'; clientSecret: string; paymentIntentId: string }
  | { type: 'PAYMENT_INTENT_ERROR'; error: string }
  | { type: 'PAYMENT_SUBMITTED' }
  | { type: 'PAYMENT_SUCCESS' }
  | { type: 'PAYMENT_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'EDIT_ADDRESS' }
  | { type: 'EDIT_SHIPPING' }
  | { type: 'START_OVER' };

export interface MedusaCart {
  id: string;
  email?: string;
  items: LineItem[];
  subtotal: number;
  shipping_total?: number;
  tax_total?: number;
  discount_total?: number;
  total: number;
  currency_code: string;
  shipping_address?: Address;
  shipping_methods?: ShippingMethod[];
  payment_session?: any;
}

export interface LineItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total: number;
  thumbnail?: string;
  variant_id?: string;
}

export interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
  phone?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  amount: number;
  provider_id?: string;
  data?: {
    carrier?: string;
    estimated_delivery?: string;
    [key: string]: any;
  };
}

export interface ShippingMethod {
  id: string;
  shipping_option_id: string;
  amount: number;
  data?: {
    carrier?: string;
    [key: string]: any;
  };
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

export interface CheckoutError {
  message: string;
  code?: string;
  details?: any;
}

export interface AddressFormData {
  email: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
  phone?: string;
}
