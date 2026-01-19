/**
 * Stripe Embedded Checkout Component
 *
 * This component:
 * 1. Reads cart from localStorage
 * 2. Creates a checkout session via API
 * 3. Embeds Stripe Checkout form directly on the page
 * 4. Handles real-time shipping rate updates via Parcelcraft
 *
 * Customer flow:
 * - Enters address ONCE in the embedded form
 * - Sees shipping rates update in real-time as they type
 * - Completes payment without leaving your site
 * - Redirects to /checkout/return on success
 */

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { getCart, type CartItem as StoreCartItem } from '@/lib/cart';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(
  import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_live_51QVZPDIlHCPvGTm2i8hhRw1KWvdvO1D9S33BGcOIAaV7xN2dV1EXjlxqPbHHPWrj7KMLMlOzBCTKAKf3rTVYhKH800IcjRFRWE'
);

interface CheckoutSessionResponse {
  clientSecret: string;
  sessionId: string;
}

export default function EmbeddedCheckout() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutReady, setCheckoutReady] = useState(false);

  useEffect(() => {
    // Load existing session from sessionStorage (created by cart)
    console.log('[EmbeddedCheckout] Component mounted, loading session...');
    loadCheckoutSession();
  }, []);

  useEffect(() => {
    if (clientSecret) {
      console.log('[EmbeddedCheckout] ✅ Client secret loaded, Stripe should initialize now');
      // Set a timeout to detect if checkout is stuck loading
      const timeout = setTimeout(() => {
        if (!checkoutReady) {
          console.warn('[EmbeddedCheckout] ⚠️ Checkout taking longer than expected to load. This might indicate a Parcelcraft configuration issue.');
        }
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    }
  }, [clientSecret, checkoutReady]);

  const loadCheckoutSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have a session already created by the cart
      const sessionJson = sessionStorage.getItem('stripe_checkout_session');
      if (sessionJson) {
        console.log('[EmbeddedCheckout] Loading existing session from sessionStorage');
        const sessionData = JSON.parse(sessionJson);

        if (sessionData.clientSecret) {
          console.log('[EmbeddedCheckout] Using session:', sessionData.sessionId);
          setClientSecret(sessionData.clientSecret);
          setLoading(false);
          // Clear it so refresh doesn't reuse stale session
          sessionStorage.removeItem('stripe_checkout_session');
          return;
        }
      }

      // Fallback: Create new session (in case user navigates directly to /checkout)
      console.log('[EmbeddedCheckout] No existing session, creating new one');

      // Read cart from localStorage
      const cartFromStore = getCart();
      let cart: StoreCartItem[] = Array.isArray(cartFromStore) ? cartFromStore : [];

      if (!cart.length) {
        const legacyCartJson = localStorage.getItem('cart');
        const legacyCart = legacyCartJson ? JSON.parse(legacyCartJson) : [];
        cart = Array.isArray(legacyCart) ? legacyCart : [];
      }

      if (!cart.length) {
        throw new Error('Your cart is empty');
      }

      console.log('[EmbeddedCheckout] Creating session for cart:', cart);

      // Call API to create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart,
          // No shippingAddress needed - customer enters it in the embedded form
          // Parcelcraft will fetch rates automatically as they type
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data: CheckoutSessionResponse = await response.json();

      if (!data.clientSecret) {
        throw new Error('No client secret returned from server');
      }

      console.log('[EmbeddedCheckout] Session created:', data.sessionId);
      setClientSecret(data.clientSecret);
      setLoading(false);
    } catch (err) {
      console.error('[EmbeddedCheckout] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);

      // Show error UI
      const loadingEl = document.getElementById('checkout-loading');
      const errorEl = document.getElementById('checkout-error');
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) {
        errorEl.style.display = 'block';
        const errorMsg = errorEl.querySelector('p');
        if (errorMsg) errorMsg.textContent = errorMessage;
      }
    }
  };

  // Show loading state
  if (loading || !clientSecret) {
    console.log('[EmbeddedCheckout] RENDER: Still loading...', { loading, hasClientSecret: !!clientSecret });
    // Keep loading UI visible in Astro page
    return null;
  }

  // Show error state
  if (error) {
    console.error('[EmbeddedCheckout] RENDER: Error state', error);
    // Show error UI in Astro page
    const loadingEl = document.getElementById('checkout-loading');
    const errorEl = document.getElementById('checkout-error');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      const errorMsg = errorEl.querySelector('p');
      if (errorMsg) errorMsg.textContent = error;
    }
    return null;
  }

  // Render Stripe Embedded Checkout
  console.log('[EmbeddedCheckout] RENDER: Rendering Stripe Embedded Checkout', {
    hasClientSecret: !!clientSecret,
    clientSecretLength: clientSecret?.length
  });

  return (
    <div id="stripe-embedded-checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{
          clientSecret,
          onComplete: () => {
            console.log('[EmbeddedCheckout] ✅ Payment complete - redirecting to return_url');
            // Stripe will automatically redirect to return_url
          },
          onReady: () => {
            console.log('[EmbeddedCheckout] ✅ Checkout is ready');
            setCheckoutReady(true);
            // Hide loading UI
            const loadingEl = document.getElementById('checkout-loading');
            if (loadingEl) loadingEl.style.display = 'none';
          },
        }}
      >
        <StripeEmbeddedCheckout
          onError={(error) => {
            console.error('[EmbeddedCheckout] ❌ Stripe checkout error:', error);
            setError(error.message || 'Failed to load checkout form. Please check your Parcelcraft configuration in Stripe Dashboard.');
            setLoading(false);
            const loadingEl = document.getElementById('checkout-loading');
            const errorEl = document.getElementById('checkout-error');
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) {
              errorEl.style.display = 'block';
              const errorMsg = errorEl.querySelector('p');
              if (errorMsg) {
                errorMsg.textContent = error.message || 'Failed to load checkout form. If shipping is required, please verify Parcelcraft is configured in your Stripe Dashboard.';
              }
            }
          }}
        />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
