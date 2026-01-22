/**
 * Stripe Embedded Checkout Component
 *
 * This component:
 * 1. Reads cart from localStorage
 * 2. Creates a checkout session via API
 * 3. Embeds Stripe Checkout form directly on the page
 * 4. Handles real-time shipping rate updates
 *
 * Customer flow:
 * - Enters address in the embedded form
 * - Sees shipping rates update in real-time as they complete address
 * - Completes payment without leaving your site
 * - Redirects to /checkout/return on success
 */
import { useEffect, useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { StripeEmbeddedCheckoutShippingDetailsChangeEvent, ResultAction } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout
} from '@stripe/react-stripe-js';
import { getCart, type CartItem as StoreCartItem } from '@/lib/cart';

// Initialize Stripe (replace with your publishable key)
const stripePublishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null);

interface CheckoutSessionResponse {
  clientSecret: string;
  sessionId: string;
}

const CLIENT_SECRET_PATTERN = /^cs_(?:live|test)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/;

const isValidClientSecret = (secret: unknown): secret is string =>
  typeof secret === 'string' && CLIENT_SECRET_PATTERN.test(secret);

export default function EmbeddedCheckout() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutReady, setCheckoutReady] = useState(false);

  // Memoize onComplete callback to prevent prop change warnings
  const handleComplete = useCallback(() => {
    console.log('[EmbeddedCheckout] ✅ Payment complete - redirecting to return_url');
    // Stripe will automatically redirect to return_url
  }, []);

  const handleShippingDetailsChange = useCallback(
    async (_event: StripeEmbeddedCheckoutShippingDetailsChangeEvent): Promise<ResultAction> => {
      // Required when permissions.update_shipping_details is server_only.
      return { type: 'accept' };
    },
    []
  );

  useEffect(() => {
    if (!stripePublishableKey) {
      console.error('[EmbeddedCheckout] ❌ Missing PUBLIC_STRIPE_PUBLISHABLE_KEY');
      setError('Stripe publishable key is missing. Please set PUBLIC_STRIPE_PUBLISHABLE_KEY.');
      setLoading(false);
      return;
    }
    // Load existing session from sessionStorage (created by cart)
    console.log('[EmbeddedCheckout] Component mounted, loading session...');
    loadCheckoutSession();
  }, []);

  // Watch for checkout iframe to appear (indicates checkout is ready)
  useEffect(() => {
    if (!clientSecret) return;

    console.log('[EmbeddedCheckout] ✅ Client secret loaded, Stripe should initialize now');

    // Watch for Stripe checkout iframe to appear
    const checkoutContainer = document.getElementById('stripe-embedded-checkout');
    if (!checkoutContainer) return;

    const observer = new MutationObserver((mutations) => {
      // Check if Stripe iframe has been added
      const iframe = checkoutContainer.querySelector('iframe[src*="stripe.com"]');
      if (iframe && !checkoutReady) {
        console.log('[EmbeddedCheckout] ✅ Checkout iframe detected - checkout is ready');
        setCheckoutReady(true);
        // Hide loading UI
        const loadingEl = document.getElementById('checkout-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        observer.disconnect();
      }
    });

    // Start observing
    observer.observe(checkoutContainer, {
      childList: true,
      subtree: true
    });

    // Also check immediately in case iframe is already there
    const existingIframe = checkoutContainer.querySelector('iframe[src*="stripe.com"]');
    if (existingIframe && !checkoutReady) {
      console.log('[EmbeddedCheckout] ✅ Checkout iframe already present - checkout is ready');
      setCheckoutReady(true);
      const loadingEl = document.getElementById('checkout-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      observer.disconnect();
    }

    // Set a timeout to detect if checkout is stuck loading
    const timeout = setTimeout(() => {
      if (!checkoutReady) {
        console.warn(
          '[EmbeddedCheckout] ⚠️ Checkout taking longer than expected to load. This might indicate a shipping configuration issue.'
        );
        // Show a warning but don't fail - checkout might still be loading
        const loadingEl = document.getElementById('checkout-loading');
        if (loadingEl) {
          const loadingText = loadingEl.querySelector('p');
          if (loadingText) {
            loadingText.textContent =
              'Loading checkout... (This may take a moment if shipping rates are being calculated)';
          }
        }
      }
    }, 10000); // 10 second timeout

    // Set a longer timeout to show an error if checkout never loads
    const errorTimeout = setTimeout(() => {
      if (!checkoutReady) {
        console.error('[EmbeddedCheckout] ❌ Checkout failed to load after 30 seconds');
        setError(
          'Checkout is taking too long to load. This may indicate a configuration issue with shipping rates. Please verify Stripe dynamic rates are configured.'
        );
        setLoading(false);
        const loadingEl = document.getElementById('checkout-loading');
        const errorEl = document.getElementById('checkout-error');
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
          errorEl.style.display = 'block';
          const errorMsg = errorEl.querySelector('p');
          if (errorMsg) {
            errorMsg.textContent =
              'Checkout is taking too long to load. This may indicate a configuration issue with shipping rates. Please verify Stripe dynamic rates are configured.';
          }
        }
        observer.disconnect();
      }
    }, 30000); // 30 second error timeout

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      clearTimeout(errorTimeout);
    };
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

        if (isValidClientSecret(sessionData.clientSecret)) {
          console.log('[EmbeddedCheckout] Using session:', sessionData.sessionId);
          setClientSecret(sessionData.clientSecret);
          setLoading(false);
          // Clear it so refresh doesn't reuse stale session
          sessionStorage.removeItem('stripe_checkout_session');
          return;
        }

        if (sessionData?.clientSecret) {
          console.warn(
            '[EmbeddedCheckout] Discarding invalid client secret from sessionStorage',
            sessionData.sessionId
          );
          sessionStorage.removeItem('stripe_checkout_session');
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cart
          // No shippingAddress needed - customer enters it in the embedded form
          // Stripe Checkout will fetch rates after address entry
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data: CheckoutSessionResponse = await response.json();

      if (!isValidClientSecret(data.clientSecret)) {
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

  // Show loading state
  if (loading || !clientSecret) {
    console.log('[EmbeddedCheckout] RENDER: Still loading...', {
      loading,
      hasClientSecret: !!clientSecret
    });
    // Keep loading UI visible in Astro page
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
          onComplete: handleComplete,
          onShippingDetailsChange: handleShippingDetailsChange
        }}
      >
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
