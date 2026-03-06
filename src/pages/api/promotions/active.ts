import type { APIRoute } from 'astro';

// TODO: Medusa v2 store API does not expose a public promotions list endpoint.
// Promotion codes are applied at checkout when the user enters them manually via
// POST /store/carts/:cartId/promotions  { promo_codes: ["CODE"] }
// To surface available codes in the UI, fetch them from the Medusa admin API
// (POST /admin/promotions) in a server-side admin context — not here.
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify([]), { status: 200 });
};
