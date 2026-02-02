'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

interface StripePaymentProps {
  clientSecret: string;
  cartId?: string;
  paymentIntentId?: string;
  amount?: number;
  currencyCode?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

function PaymentForm({
  amount,
  currencyCode,
  onSuccess,
  onError,
  disabled = false
}: Omit<StripePaymentProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`
        }
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        onError?.(error.message || 'Payment failed');
      } else {
        onSuccess?.();
      }
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred';
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const currency = (currencyCode || 'usd').toUpperCase();
  const totalAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing || disabled}
        className={`w-full rounded-full px-6 py-3 text-base font-medium transition ${
          !stripe || isProcessing || disabled
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : 'bg-primary hover:bg-primary-hover text-white'
        }`}
      >
        {isProcessing ? (
          <>
            <span className="inline-block animate-spin mr-2">⏳</span>
            Processing...
          </>
        ) : (
          `Pay ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
          }).format(totalAmount / 100)}`
        )}
      </button>

      {isProcessing && (
        <p className="text-sm text-white/70 text-center">
          Please do not close this page...
        </p>
      )}
    </form>
  );
}

export default function StripePayment({
  clientSecret,
  amount,
  currencyCode,
  onSuccess,
  onError,
  disabled = false
}: StripePaymentProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    const publishableKey =
      import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('Stripe publishable key not found');
      onError?.('Payment system not configured');
      return;
    }

    setStripePromise(loadStripe(publishableKey));
  }, [onError]);

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <p className="text-white/70">Loading payment form...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-ethno text-white">Payment Details</h2>

      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-4">
        <p className="text-sm text-emerald-400">
          🔒 <strong>Your order is secured.</strong> To make changes, you'll need to
          start over.
        </p>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#ea1d26',
              colorBackground: '#0b0b0c',
              colorText: '#ffffff',
              colorDanger: '#ff4444',
              fontFamily: 'American Captain, sans-serif',
              borderRadius: '8px'
            }
          }
        }}
      >
        <PaymentForm
          amount={amount}
          currencyCode={currencyCode}
          onSuccess={onSuccess}
          onError={onError}
          disabled={disabled}
        />
      </Elements>

      <div className="pt-6 border-t border-white/10">
        <button
          onClick={() => {
            if (
              confirm(
                'Starting over will abandon this payment session. Are you sure?'
              )
            ) {
              window.location.href = '/cart';
            }
          }}
          className="text-sm text-white/70 hover:text-white transition"
          disabled={disabled}
        >
          ← Start Over
        </button>
      </div>
    </div>
  );
}
