import type { APIRoute } from 'astro';
import { resolveAllowedCountries } from '@/lib/shipping-countries';

export const GET: APIRoute = async () => {
  const data = {
    runtime: 'astro',
    site: (import.meta.env.PUBLIC_BASE_URL as string | undefined) || undefined,
    // Sanity
    sanity: {
      projectId:
        (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
        process.env.SANITY_PROJECT_ID,
      dataset:
        (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
        process.env.SANITY_DATASET,
      writeToken: Boolean(
        process.env.SANITY_API_TOKEN
      )
    },
    // Stripe
    stripe: {
      hasSecret: Boolean(import.meta.env.STRIPE_SECRET_KEY)
    },
    // Auth
    auth: {
      provider: 'fas-auth',
      hasSessionSecret: Boolean(import.meta.env.SESSION_SECRET)
    },
    // Email
    email: {
      provider: 'resend',
      hasKey: Boolean(import.meta.env.RESEND_API_KEY),
      from: import.meta.env.RESEND_FROM || undefined
    },
    // Shipping
    shipping: {
      provider: 'shippo',
      allowedCountries: resolveAllowedCountries(),
      fulfillment: 'post-checkout-label'
    }
  };

  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
