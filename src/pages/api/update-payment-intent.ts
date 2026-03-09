import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error:
        'Deprecated endpoint. PaymentIntent updates must flow through Medusa-authoritative cart/payment APIs.'
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
