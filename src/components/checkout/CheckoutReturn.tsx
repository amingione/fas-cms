/**
 * Checkout Return Component
 *
 * Verifies the checkout session and displays the appropriate message.
 * Handles:
 * - Payment success
 * - Payment processing
 * - Payment failed
 * - Missing session ID
 */

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_live_51QVZPDIlHCPvGTm2i8hhRw1KWvdvO1D9S33BGcOIAaV7xN2dV1EXjlxqPbHHPWrj7KMLMlOzBCTKAKf3rTVYhKH800IcjRFRWE'
);

type SessionStatus = 'open' | 'complete' | 'expired';
type PaymentStatus = 'paid' | 'unpaid' | 'no_payment_required';

interface SessionInfo {
  id: string;
  status: SessionStatus;
  payment_status: PaymentStatus;
  customer_email?: string;
  amount_total?: number;
}

export default function CheckoutReturn() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'processing'>('loading');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifySession();
  }, []);

  const verifySession = async () => {
    try {
      // Get session_id from URL
      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setStatus('error');
        setError('No session ID found in URL');
        return;
      }

      console.log('[CheckoutReturn] Verifying session:', sessionId);

      // Retrieve the session from Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: retrieveError, session } = await stripe.checkout.sessions.retrieve(sessionId) as any;

      if (retrieveError) {
        throw new Error(retrieveError.message);
      }

      console.log('[CheckoutReturn] Session retrieved:', session);
      setSessionInfo(session);

      // Check payment status
      if (session.status === 'complete' && session.payment_status === 'paid') {
        setStatus('success');
        // Clear cart from localStorage
        localStorage.removeItem('cart');
        console.log('[CheckoutReturn] Payment successful, cart cleared');
      } else if (session.status === 'complete' && session.payment_status === 'unpaid') {
        setStatus('processing');
      } else if (session.status === 'open') {
        setStatus('processing');
      } else {
        setStatus('error');
        setError('Payment was not completed');
      }
    } catch (err) {
      console.error('[CheckoutReturn] Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-lg text-gray-600">Verifying your payment...</p>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-green-900 mb-2">Payment Successful!</h1>
        <p className="text-lg text-green-800 mb-6">
          Thank you for your order. We've received your payment and will begin processing your order shortly.
        </p>
        {sessionInfo?.customer_email && (
          <p className="text-green-700 mb-6">
            A confirmation email has been sent to <strong>{sessionInfo.customer_email}</strong>
          </p>
        )}
        <div className="space-x-4">
          <a
            href="/checkout/success?session_id={sessionInfo?.id}"
            className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            View Order Details
          </a>
          <a
            href="/"
            className="inline-block bg-white text-green-600 border border-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition"
          >
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  // Processing state
  if (status === 'processing') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-yellow-900 mb-2">Payment Processing</h1>
        <p className="text-lg text-yellow-800 mb-6">
          Your payment is being processed. This may take a few moments.
        </p>
        <p className="text-yellow-700 mb-6">
          You'll receive a confirmation email once your payment is complete.
        </p>
        <button
          onClick={() => verifySession()}
          className="bg-yellow-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition"
        >
          Check Status Again
        </button>
      </div>
    );
  }

  // Error state
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-16 w-16 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-red-900 mb-2">Payment Error</h1>
      <p className="text-lg text-red-800 mb-4">
        We encountered an error processing your payment.
      </p>
      {error && (
        <p className="text-red-700 mb-6 font-mono text-sm bg-red-100 p-3 rounded">
          {error}
        </p>
      )}
      <div className="space-x-4">
        <a
          href="/cart"
          className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
        >
          Return to Cart
        </a>
        <a
          href="/contact"
          className="inline-block bg-white text-red-600 border border-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
