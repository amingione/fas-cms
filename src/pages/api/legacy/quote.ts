import type { APIRoute } from 'astro';

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export const POST: APIRoute = async () =>
  jsonResponse(
    {
      error:
        'Shipping quotes are handled inside Stripe Checkout. This endpoint is disabled.'
    },
    410
  );
