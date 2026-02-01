/**
 * NEW Redesigned Checkout Flow - Split-Screen Dark Theme
 *
 * Layout: Left = Forms, Right = Sticky Order Summary
 * Mobile: Summary as bottom popover
 * Theme: FAS dark theme with red primary colors
 *
 * Safety: Original preserved in checkout-legacy/CheckoutFlow.tsx
 */

'use client';

import React, { useReducer, useEffect, useState } from 'react';
import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';
import {
  checkoutReducer,
  isCartLocked,
  canEditAddress,
  canEditShipping
} from '@/lib/checkout/state-machine';
import type {
  CheckoutState,
  MedusaCart,
  ShippingOption,
  AddressFormData
} from '@/lib/checkout/types';
import {
  fetchCart,
  updateCartAddress,
  fetchShippingOptions,
  applyShippingMethod,
  createPaymentIntent,
  filterValidShippingOptions
} from '@/lib/checkout/utils';
import { validateCartForCheckout } from '@/lib/checkout/validation';

// Import redesigned components
import AddressFormNew from './AddressFormNew';
import ShippingSelectorNew from './ShippingSelectorNew';
import OrderSummaryNew from './OrderSummaryNew';
import StripePayment from './StripePayment';

export default function CheckoutFlowNew() {
  const [state, dispatch] = useReducer(checkoutReducer, 'CART_LOADING' as CheckoutState);
  const [cart, setCart] = useState<MedusaCart | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string>('');
  const [paymentClientSecret, setPaymentClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load cart on mount
  useEffect(() => {
    const cartId =
      typeof window !== 'undefined' ? localStorage.getItem(MEDUSA_CART_ID_KEY) : null;

    console.log('[Checkout] Initializing checkout with cart ID:', cartId);

    if (!cartId) {
      console.warn('[Checkout] No Medusa cart ID found in localStorage');
      setError('No cart found. Please add items to your cart first.');
      dispatch({ type: 'CART_EMPTY' });
      return;
    }

    Promise.all([
      fetchCart(cartId),
      validateCartForCheckout(cartId)
    ])
      .then(([cartData, validation]) => {
        console.log('[Checkout] Cart fetched:', cartData);
        console.log('[Checkout] Validation result:', validation);

        if (!validation.valid) {
          console.error('[Checkout] Cart validation failed:', validation.errors);
          setError(`Cart validation failed: ${validation.errors.join('; ')}`);
          dispatch({ type: 'CART_EMPTY' });
          return;
        }

        if (validation.warnings && validation.warnings.length > 0) {
          console.warn('[Checkout] Cart validation warnings:', validation.warnings);
        }

        setCart(cartData);
        if (cartData.items.length === 0) {
          console.warn('[Checkout] Cart is empty');
          dispatch({ type: 'CART_EMPTY' });
        } else {
          console.log('[Checkout] Cart loaded successfully with', cartData.items.length, 'items');
          dispatch({ type: 'CART_LOADED', cart: cartData });
        }
      })
      .catch((err) => {
        console.error('[Checkout] Failed to load cart:', err);
        setError('Failed to load cart. Please try again.');
        dispatch({ type: 'CART_EMPTY' });
      });
  }, []);

  // Handle address submission
  const handleAddressSubmit = async (addressData: AddressFormData) => {
    if (!cart) return;

    try {
      dispatch({ type: 'ADDRESS_SUBMITTED', cart });
      const updatedCart = await updateCartAddress(cart.id, addressData);
      setCart(updatedCart);

      const options = await fetchShippingOptions(cart.id);
      const validOptions = filterValidShippingOptions(options);
      setShippingOptions(validOptions);

      if (validOptions.length === 0) {
        dispatch({ type: 'SHIPPING_OPTIONS_ERROR', error: 'No shipping options available' });
      } else {
        dispatch({ type: 'SHIPPING_OPTIONS_LOADED', options: validOptions });
      }
    } catch (err: any) {
      console.error('Address submission failed:', err);
      setError(err.message || 'Failed to update address');
      dispatch({
        type: 'SHIPPING_OPTIONS_ERROR',
        error: err.message || 'Failed to load shipping options'
      });
    }
  };

  // Handle shipping selection
  const handleShippingSelect = (optionId: string) => {
    setSelectedShippingId(optionId);
  };

  // Handle shipping confirmation
  const handleShippingContinue = async () => {
    if (!cart || !selectedShippingId) return;

    try {
      dispatch({ type: 'SHIPPING_SELECTED', optionId: selectedShippingId });
      const updatedCart = await applyShippingMethod(cart.id, selectedShippingId);
      setCart(updatedCart);
      dispatch({ type: 'SHIPPING_APPLIED', cart: updatedCart });
    } catch (err: any) {
      console.error('Shipping application failed:', err);
      setError(err.message || 'Failed to apply shipping method');
      dispatch({ type: 'SHIPPING_APPLY_ERROR', error: err.message });
    }
  };

  // Handle proceed to payment
  const handleProceedToPayment = async () => {
    if (!cart) return;

    if (paymentClientSecret) {
      console.warn('[Checkout] PaymentIntent already exists, skipping creation');
      dispatch({
        type: 'PAYMENT_INTENT_CREATED',
        clientSecret: paymentClientSecret,
        paymentIntentId: paymentIntentId
      });
      return;
    }

    try {
      dispatch({ type: 'PROCEED_TO_PAYMENT' });
      const paymentIntent = await createPaymentIntent(cart.id);
      setPaymentClientSecret(paymentIntent.client_secret);
      setPaymentIntentId(paymentIntent.payment_intent_id);
      dispatch({
        type: 'PAYMENT_INTENT_CREATED',
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.payment_intent_id
      });
    } catch (err: any) {
      console.error('Payment intent creation failed:', err);
      setError(err.message || 'Failed to initialize payment');
      dispatch({ type: 'PAYMENT_INTENT_ERROR', error: err.message });
    }
  };

  // Empty cart state
  if (state === 'CART_EMPTY') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-ethno text-white mb-4">Your cart is empty</h2>
        <p className="text-white/70 mb-8">Add some products to get started.</p>
        <a
          href="/shop"
          className="inline-block rounded-full bg-primary hover:bg-primary-hover px-8 py-3 text-white font-medium transition"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  // Loading state
  if (state === 'CART_LOADING' || !cart) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
        <p className="text-white/70">Loading your cart...</p>
      </div>
    );
  }

  // Error state
  if (error && state === 'CART_EMPTY') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-ethno text-white mb-4">Something went wrong</h2>
        <p className="text-white/70 mb-8">{error}</p>
        <a
          href="/cart"
          className="inline-block rounded-full bg-primary hover:bg-primary-hover px-8 py-3 text-white font-medium transition"
        >
          Return to Cart
        </a>
      </div>
    );
  }

  return (
    <div className="checkout-flow-new min-h-screen">
      {/* Split-screen layout */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-x-16 lg:grid-cols-2 lg:px-8 xl:gap-x-24">

        {/* Left Column: Form Sections */}
        <section className="px-4 pt-8 pb-36 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-0 lg:pb-16">
          <div className="mx-auto max-w-lg lg:max-w-none">

            {/* Address Form Section */}
            {canEditAddress(state) && (
              <AddressFormNew
                initialData={cart.shipping_address || undefined}
                onSubmit={handleAddressSubmit}
                disabled={!canEditAddress(state)}
              />
            )}

            {/* Shipping Options Section */}
            {state !== 'CART_LOADING' && state !== 'CART_EMPTY' && state !== 'ADDRESS_ENTRY' && (
              <ShippingSelectorNew
                options={shippingOptions}
                selectedId={selectedShippingId}
                onSelect={handleShippingSelect}
                onContinue={handleShippingContinue}
                disabled={!canEditShipping(state)}
                loading={state === 'SHIPPING_OPTIONS_LOADING'}
              />
            )}

            {/* Payment Section */}
            {state === 'PAYMENT_READY' || state === 'PROCESSING_PAYMENT' ? (
              <div className="mt-10">
                <button
                  onClick={handleProceedToPayment}
                  disabled={state === 'PROCESSING_PAYMENT'}
                  className="w-full rounded-full bg-primary hover:bg-primary-hover px-6 py-3 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state === 'PROCESSING_PAYMENT' ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            ) : null}

            {paymentClientSecret && (
              <div className="mt-10">
                <StripePayment
                  clientSecret={paymentClientSecret}
                  cartId={cart.id}
                  paymentIntentId={paymentIntentId}
                />
              </div>
            )}

            {/* Error Display */}
            {error && state !== 'CART_EMPTY' && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Order Summary (Sticky Sidebar) */}
        <section className="bg-transparent px-4 pt-8 pb-10 sm:px-6 lg:col-start-2 lg:row-start-1 lg:bg-transparent lg:px-0 lg:pb-16">
          <div className="mx-auto max-w-lg lg:max-w-none">
            <OrderSummaryNew
              cart={cart}
              isLocked={isCartLocked(state)}
            />
          </div>
        </section>
      </div>

      {/* Dev Mode Indicator - only show when checkout is actually working */}
      {import.meta.env.DEV && cart && state !== 'CART_EMPTY' && state !== 'CART_LOADING' && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-50">
          🆕 NEW CHECKOUT UI
        </div>
      )}
    </div>
  );
}
