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

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(
  import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_live_51QVZPDIlHCPvGTm2i8hhRw1KWvdvO1D9S33BGcOIAaV7xN2dV1EXjlxqPbHHPWrj7KMLMlOzBCTKAKf3rTVYhKH800IcjRFRWE'
);

interface CheckoutSessionResponse {
  clientSecret: string;
  sessionId: string;
}

interface CartItem {
  id: string;
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stripePriceId?: string;
  [key: string]: any;
}

export default function EmbeddedCheckout() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create checkout session when component mounts
    createCheckoutSession();
  }, []);

  const createCheckoutSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Read cart from localStorage
      const cartJson = localStorage.getItem('cart');
      if (!cartJson) {
        throw new Error('Your cart is empty');
      }

      const cart: CartItem[] = JSON.parse(cartJson);
      if (!Array.isArray(cart) || cart.length === 0) {
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
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);

      // Show error UI
      const loadingEl = document.getElementById('checkout-loading');
      const errorEl = document.getElementById('checkout-error');
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) {
        errorEl.style.display = 'block';
        const errorMsg = errorEl.querySelector('p');
        if (errorMsg) errorMsg.textContent = err instanceof Error ? err.message : 'Unknown error';
      }
    }
  };

  // Show loading state
  if (loading || !clientSecret) {
    return null; // Loading UI is in the Astro page
  }

  // Show error state
  if (error) {
    return null; // Error UI is in the Astro page
  }

  // Render Stripe Embedded Checkout
  return (
    <div id="stripe-embedded-checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{
          clientSecret,
          onComplete: () => {
            console.log('[EmbeddedCheckout] Payment complete');
            // Stripe will automatically redirect to return_url
          },
        }}
      >
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
