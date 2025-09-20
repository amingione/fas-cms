// Auth0 SPA SDK is used in the frontend. No server-side callback handler needed for Astro.
export default function callback() {
  return new Response('Not used. Handled on client side via Auth0 SPA SDK.', { status: 200 });
}
