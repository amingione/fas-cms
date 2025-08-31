import type { APIRoute } from 'astro';

const redact = (v?: string | null) => (typeof v === 'string' && v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : undefined);

export const GET: APIRoute = async () => {
  const data = {
    runtime: 'astro',
    site: (import.meta.env.PUBLIC_BASE_URL as string | undefined) || undefined,
    // Sanity
    sanity: {
      projectId: (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) || (import.meta.env.SANITY_PROJECT_ID as string | undefined),
      dataset: (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) || (import.meta.env.SANITY_DATASET as string | undefined),
      writeToken: Boolean(import.meta.env.SANITY_WRITE_TOKEN || import.meta.env.SANITY_API_TOKEN || import.meta.env.VITE_SANITY_API_TOKEN)
    },
    // Stripe
    stripe: {
      hasSecret: Boolean(import.meta.env.STRIPE_SECRET_KEY),
      hasWebhookSecret: Boolean(import.meta.env.STRIPE_WEBHOOK_SECRET)
    },
    // Auth0
    auth0: {
      domain: import.meta.env.AUTH0_DOMAIN || import.meta.env.PUBLIC_AUTH0_DOMAIN,
      clientId: redact(import.meta.env.AUTH0_CLIENT_ID || import.meta.env.PUBLIC_AUTH0_CLIENT_ID),
      hasClientSecret: Boolean(import.meta.env.AUTH0_CLIENT_SECRET),
      hasSessionSecret: Boolean(import.meta.env.SESSION_SECRET)
    },
    // Email
    email: {
      provider: 'resend',
      hasKey: Boolean(import.meta.env.RESEND_API_KEY),
      from: import.meta.env.RESEND_FROM || undefined
    },
    // ShipEngine
    shipengine: {
      hasKey: Boolean(import.meta.env.SHIPENGINE_API_KEY)
    }
  };

  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

