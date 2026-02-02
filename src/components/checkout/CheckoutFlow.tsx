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

import AddressForm from './AddressForm';
import ShippingSelector from './ShippingSelector';
import OrderSummary from './OrderSummary';
import StripePayment from './StripePayment';

export default function CheckoutFlow() {
  const [state, dispatch] = useReducer(checkoutReducer, 'CART_LOADING' as CheckoutState);
  const [cart, setCart] = useState<MedusaCart | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string>('');
  const [paymentClientSecret, setPaymentClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // If the cart changes elsewhere (e.g., user removes an item from the cart modal),
  // refresh the Medusa cart so checkout doesn't keep showing stale line items.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onSynced = () => {
      if (isCartLocked(state)) return;

      const cartId = localStorage.getItem(MEDUSA_CART_ID_KEY);
      if (!cartId) {
        setCart(null);
        dispatch({ type: 'CART_EMPTY' });
        return;
      }

      Promise.all([fetchCart(cartId), validateCartForCheckout(cartId)])
        .then(([cartData, validation]) => {
          if (!validation.valid || cartData.items.length === 0) {
            setCart(cartData);
            setError(
              !validation.valid
                ? `Cart validation failed: ${validation.errors.join('; ')}`
                : 'Your cart is empty.'
            );
            dispatch({ type: 'CART_EMPTY' });
            return;
          }

          setError(null);
          setCart(cartData);
          dispatch({ type: 'CART_LOADED', cart: cartData });
        })
        .catch((err) => {
          console.error('[Checkout] Failed to refresh cart:', err);
        });
    };

    window.addEventListener('cart:medusa-synced', onSynced as EventListener);
    return () => window.removeEventListener('cart:medusa-synced', onSynced as EventListener);
  }, [state]);

  // Load cart on mount
  useEffect(() => {
    const cartId =
      typeof window !== 'undefined' ? localStorage.getItem(MEDUSA_CART_ID_KEY) : null;

    if (!cartId) {
      dispatch({ type: 'CART_EMPTY' });
      return;
    }

    Promise.all([
      fetchCart(cartId),
      validateCartForCheckout(cartId)
    ])
      .then(([cartData, validation]) => {
        if (!validation.valid) {
          console.error('[Checkout] Cart validation failed:', validation.errors);
          setError(`Cart validation failed: ${validation.errors.join('; ')}`);
          dispatch({ type: 'CART_EMPTY' });
          return;
        }

        // Log warnings (non-blocking)
        if (validation.warnings && validation.warnings.length > 0) {
          console.warn('[Checkout] Cart validation warnings:', validation.warnings);
        }

        setCart(cartData);
        if (cartData.items.length === 0) {
          dispatch({ type: 'CART_EMPTY' });
        } else {
          dispatch({ type: 'CART_LOADED', cart: cartData });
        }
      })
      .catch((err) => {
        console.error('Failed to load cart:', err);
        setError('Failed to load cart. Please try again.');
      });
  }, []);

  // Handle address submission
  const handleAddressSubmit = async (addressData: AddressFormData) => {
    if (!cart) return;

    try {
      dispatch({ type: 'ADDRESS_SUBMITTED', cart });
      const updatedCart = await updateCartAddress(cart.id, addressData);
      setCart(updatedCart);

      // Fetch shipping options
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

    // GUARD: Prevent duplicate PaymentIntent creation
    // This should never happen due to state machine, but guard defensively
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
      setError(err.message || 'Failed to create payment intent');
      dispatch({ type: 'PAYMENT_INTENT_ERROR', error: err.message });
    }
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    dispatch({ type: 'PAYMENT_SUBMITTED' });
    dispatch({ type: 'PAYMENT_SUCCESS' });
  };

  // Handle payment error
  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg);
    dispatch({ type: 'PAYMENT_FAILED', error: errorMsg });
  };

  // Handle retry
  // CRITICAL: This reuses the existing PaymentIntent (does NOT create a new one)
  // paymentClientSecret and paymentIntentId are preserved in state
  const handleRetry = () => {
    setError(null);
    dispatch({ type: 'RETRY' });
  };

  // Handle edit address
  const handleEditAddress = () => {
    if (isCartLocked(state)) {
      if (
        confirm(
          'Your order is secured for payment. To make changes, you must start over. Continue?'
        )
      ) {
        window.location.href = '/cart';
      }
      return;
    }

    if (state === 'CART_FINALIZED') {
      if (
        confirm('Changing your address will recalculate your order. Do you want to continue?')
      ) {
        dispatch({ type: 'EDIT_ADDRESS' });
        setShippingOptions([]);
        setSelectedShippingId('');
      }
      return;
    }

    dispatch({ type: 'EDIT_ADDRESS' });
  };

  // Handle edit shipping
  const handleEditShipping = () => {
    if (isCartLocked(state)) {
      alert('Your order is secured for payment. To make changes, you must start over.');
      return;
    }

    if (
      confirm('Changing your shipping method will recalculate your order. Do you want to continue?')
    ) {
      dispatch({ type: 'EDIT_SHIPPING' });
      setSelectedShippingId('');
    }
  };

  // Render based on state
  const renderContent = () => {
      switch (state) {
      case 'CART_LOADING':
        if (error) {
          return (
            <div className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="font-bold text-red-800 mb-2">Cart Load Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
                <button
                  onClick={() => (window.location.href = '/cart')}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400"
                >
                  Back to Cart
                </button>
              </div>
            </div>
          );
        }
        return (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading your cart...</p>
          </div>
        );

      case 'CART_EMPTY':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some items to get started!</p>
            <a
              href="/shop"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              Continue Shopping
            </a>
          </div>
        );

      case 'ADDRESS_ENTRY':
        return (
          <AddressForm
            initialData={
              cart?.shipping_address
                ? {
                    email: cart.email || '',
                    first_name: cart.shipping_address.first_name,
                    last_name: cart.shipping_address.last_name,
                    address_1: cart.shipping_address.address_1,
                    address_2: cart.shipping_address.address_2,
                    city: cart.shipping_address.city,
                    province: cart.shipping_address.province,
                    postal_code: cart.shipping_address.postal_code,
                    country_code: cart.shipping_address.country_code,
                    phone: cart.shipping_address.phone
                  }
                : undefined
            }
            onSubmit={handleAddressSubmit}
            disabled={false}
          />
        );

      case 'SHIPPING_CALCULATION':
        return (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Calculating shipping options...</p>
          </div>
        );

      case 'SHIPPING_SELECTION':
        return (
          <ShippingSelector
            options={shippingOptions}
            selectedOptionId={selectedShippingId}
            currencyCode={cart?.currency_code || 'USD'}
            onSelect={handleShippingSelect}
            onContinue={handleShippingContinue}
            onEditAddress={handleEditAddress}
            disabled={false}
          />
        );

      case 'SHIPPING_APPLYING':
        return (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Applying shipping method...</p>
          </div>
        );

      case 'CART_FINALIZED':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Review Your Order</h2>

            <div className="p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Shipping Address</h3>
                <button
                  onClick={handleEditAddress}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit
                </button>
              </div>
              {cart?.shipping_address && (
                <div className="text-sm text-gray-700">
                  <p>
                    {cart.shipping_address.first_name} {cart.shipping_address.last_name}
                  </p>
                  <p>{cart.shipping_address.address_1}</p>
                  {cart.shipping_address.address_2 && <p>{cart.shipping_address.address_2}</p>}
                  <p>
                    {cart.shipping_address.city}, {cart.shipping_address.province}{' '}
                    {cart.shipping_address.postal_code}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Shipping Method</h3>
                <button
                  onClick={handleEditShipping}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit
                </button>
              </div>
              {cart?.shipping_methods && cart.shipping_methods[0] && (
                <div className="text-sm text-gray-700">
                  <p>{cart.shipping_methods[0].data?.carrier || 'Shipping'}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleProceedToPayment}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium"
            >
              Proceed to Payment
            </button>
          </div>
        );

      case 'PAYMENT_INTENT_CREATING':
        // Internal transition state - user perceives this as "preparing payment"
        return (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Preparing payment...</p>
          </div>
        );

      case 'PAYMENT_READY':
      case 'PAYMENT_PROCESSING':
        // User-facing "Payment" phase - both states show payment form
        // PAYMENT_READY: form is interactive
        // PAYMENT_PROCESSING: form is disabled during submission
        return cart ? (
          <StripePayment
            clientSecret={paymentClientSecret}
            amount={cart.total}
            currencyCode={cart.currency_code}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            disabled={state === 'PAYMENT_PROCESSING'}
          />
        ) : null;

      case 'PAYMENT_SUCCESS':
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your order has been placed. You'll receive a confirmation email shortly.
            </p>
            <a
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              Continue Shopping
            </a>
          </div>
        );

      case 'PAYMENT_FAILED':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-bold text-red-800 mb-2">Payment Failed</h3>
              <p className="text-red-700 text-sm">{error || 'Unable to process payment'}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleRetry}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/cart')}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400"
              >
                Start Over
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Retrying will use the same payment session. No duplicate charges will occur.
            </p>
          </div>
        );

      case 'SHIPPING_ERROR':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="font-bold text-yellow-800 mb-2">Shipping Error</h3>
              <p className="text-yellow-700 text-sm">
                {error || 'Unable to calculate shipping for this address'}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleRetry}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={handleEditAddress}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400"
              >
                Edit Address
              </button>
            </div>
          </div>
        );

      case 'PAYMENT_INTENT_ERROR':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-bold text-red-800 mb-2">Payment Setup Error</h3>
              <p className="text-red-700 text-sm">
                {error || 'Unable to secure payment. Please try again.'}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleRetry}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/cart')}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400"
              >
                Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">{renderContent()}</div>
      <div className="lg:col-span-1">
        {cart && state !== 'CART_EMPTY' && state !== 'CART_LOADING' && (
          <OrderSummary cart={cart} isLocked={isCartLocked(state)} />
        )}
      </div>
    </div>
  );
}
