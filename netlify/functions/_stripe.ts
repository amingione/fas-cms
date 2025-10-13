import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Use a stable, supported API version
  apiVersion: '2025-08-27.basil'
});
