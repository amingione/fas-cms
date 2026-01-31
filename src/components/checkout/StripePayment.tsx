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
  amount: number;
  currencyCode: string;
  onSuccess: () => void;
  onError: (error: string) => void;
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
        onError(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred';
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing || disabled}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          !stripe || isProcessing || disabled
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'
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
            currency: currencyCode.toUpperCase()
          }).format(amount / 100)}`
        )}
      </button>

      {isProcessing && (
        <p className="text-sm text-gray-600 text-center">
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
      onError('Payment system not configured');
      return;
    }

    setStripePromise(loadStripe(publishableKey));
  }, [onError]);

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading payment form...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Payment</h2>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
        <p className="text-sm text-blue-800">
          🔒 <strong>Your order is secured.</strong> To make changes, you'll need to
          start over.
        </p>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#2563eb'
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

      <div className="pt-4 border-t">
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
          className="text-sm text-gray-600 hover:underline"
          disabled={disabled}
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
