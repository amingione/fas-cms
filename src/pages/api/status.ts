import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const data = {
    runtime: 'astro',
    site: (import.meta.env.PUBLIC_BASE_URL as string | undefined) || undefined,
    // Sanity
    sanity: {
      projectId:
        (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
        (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
        (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined),
      dataset:
        (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
        (import.meta.env.SANITY_DATASET as string | undefined) ||
        (import.meta.env.VITE_SANITY_DATASET as string | undefined),
      writeToken: Boolean(
        import.meta.env.SANITY_WRITE_TOKEN ||
          import.meta.env.SANITY_API_TOKEN ||
          import.meta.env.VITE_SANITY_API_TOKEN
      )
    },
    // Stripe
    stripe: {
      hasSecret: Boolean(import.meta.env.STRIPE_SECRET_KEY),
      hasWebhookSecret: Boolean(import.meta.env.STRIPE_WEBHOOK_SECRET)
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
      provider: 'parcelcraft',
      allowedCountries:
        (import.meta.env.STRIPE_SHIPPING_ALLOWED_COUNTRIES as string | undefined) ||
        (import.meta.env.PUBLIC_STRIPE_SHIPPING_ALLOWED_COUNTRIES as string | undefined) ||
        undefined,
      fulfillment: 'post-checkout-label'
    }
  };

  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
