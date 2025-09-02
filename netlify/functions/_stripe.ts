import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Use a stable, supported API version
  apiVersion: '2024-06-20'
});
