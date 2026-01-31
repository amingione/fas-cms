/**
 * Checkout State Machine Reducer
 * Following specification: docs/checkout/checkout-flow-spec.md
 */

import type { CheckoutState, CheckoutAction } from './types';

export function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction
): CheckoutState {
  console.log('[Checkout State]', state, '→', action.type);

  switch (state) {
    case 'CART_LOADING':
      if (action.type === 'CART_LOADED') {
        return action.cart.items.length > 0 ? 'ADDRESS_ENTRY' : 'CART_EMPTY';
      }
      if (action.type === 'CART_EMPTY') return 'CART_EMPTY';
      break;

    case 'CART_EMPTY':
      // Terminal state
      break;

    case 'ADDRESS_ENTRY':
      if (action.type === 'ADDRESS_SUBMITTED') {
        return 'SHIPPING_CALCULATION';
      }
      break;

    case 'SHIPPING_CALCULATION':
      if (action.type === 'SHIPPING_OPTIONS_LOADED') {
        return 'SHIPPING_SELECTION';
      }
      if (action.type === 'SHIPPING_OPTIONS_ERROR') {
        return 'SHIPPING_ERROR';
      }
      break;

    case 'SHIPPING_SELECTION':
      if (action.type === 'SHIPPING_SELECTED') {
        return 'SHIPPING_APPLYING';
      }
      if (action.type === 'EDIT_ADDRESS') {
        return 'ADDRESS_ENTRY';
      }
      break;

    case 'SHIPPING_APPLYING':
      if (action.type === 'SHIPPING_APPLIED') {
        return 'CART_FINALIZED';
      }
      if (action.type === 'SHIPPING_APPLY_ERROR') {
        return 'SHIPPING_ERROR';
      }
      break;

    case 'CART_FINALIZED':
      if (action.type === 'PROCEED_TO_PAYMENT') {
        return 'PAYMENT_INTENT_CREATING';
      }
      if (action.type === 'EDIT_ADDRESS') {
        return 'ADDRESS_ENTRY';
      }
      if (action.type === 'EDIT_SHIPPING') {
        return 'SHIPPING_SELECTION';
      }
      break;

    case 'PAYMENT_INTENT_CREATING':
      if (action.type === 'PAYMENT_INTENT_CREATED') {
        return 'PAYMENT_READY';
      }
      if (action.type === 'PAYMENT_INTENT_ERROR') {
        return 'PAYMENT_INTENT_ERROR';
      }
      break;

    case 'PAYMENT_READY':
      if (action.type === 'PAYMENT_SUBMITTED') {
        return 'PAYMENT_PROCESSING';
      }
      if (action.type === 'START_OVER') {
        return 'CART_LOADING';
      }
      break;

    case 'PAYMENT_PROCESSING':
      if (action.type === 'PAYMENT_SUCCESS') {
        return 'PAYMENT_SUCCESS';
      }
      if (action.type === 'PAYMENT_FAILED') {
        return 'PAYMENT_FAILED';
      }
      break;

    case 'PAYMENT_SUCCESS':
      // Terminal state
      break;

    case 'PAYMENT_FAILED':
      if (action.type === 'RETRY') {
        // CRITICAL: Return to PAYMENT_READY (NOT PAYMENT_INTENT_CREATING)
        // This reuses the existing PaymentIntent, preventing duplicate intents
        return 'PAYMENT_READY';
      }
      if (action.type === 'START_OVER') {
        return 'CART_LOADING';
      }
      break;

    case 'SHIPPING_ERROR':
      if (action.type === 'RETRY') {
        return 'SHIPPING_CALCULATION';
      }
      if (action.type === 'EDIT_ADDRESS') {
        return 'ADDRESS_ENTRY';
      }
      break;

    case 'PAYMENT_INTENT_ERROR':
      if (action.type === 'RETRY') {
        return 'PAYMENT_INTENT_CREATING';
      }
      if (action.type === 'START_OVER') {
        return 'CART_LOADING';
      }
      break;
  }

  return state;
}

export function isCartLocked(state: CheckoutState): boolean {
  return [
    'PAYMENT_INTENT_CREATING',
    'PAYMENT_READY',
    'PAYMENT_PROCESSING',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED'
  ].includes(state);
}

export function canEditAddress(state: CheckoutState): boolean {
  return [
    'ADDRESS_ENTRY',
    'SHIPPING_SELECTION',
    'CART_FINALIZED'
  ].includes(state);
}

export function canEditShipping(state: CheckoutState): boolean {
  return ['SHIPPING_SELECTION', 'CART_FINALIZED'].includes(state);
}
