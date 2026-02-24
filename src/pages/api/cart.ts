/**
 * DEPRECATED: Legacy Sanity-backed cart endpoint.
 *
 * This route previously created `cartItem` documents in Sanity, which is a
 * pre-Medusa pattern. Cart state now lives exclusively in Medusa:
 *   - Create cart: POST /api/medusa/cart/create
 *   - Add item:    POST /api/medusa/cart/add-item
 *   - Read cart:   GET  /api/cart/[id]  (reads from Medusa /store/carts/:id)
 *
 * Nothing in the codebase calls this POST endpoint; it exists only as a
 * historical artifact. Returning 410 Gone prevents accidental usage.
 */
export async function POST() {
  return new Response(
    JSON.stringify({
      error: 'Deprecated: cart operations must use Medusa /api/medusa/cart/*.',
      status: 410
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    }
  );
}
