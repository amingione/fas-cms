export async function GET() {
  // Pricing authority enforcement:
  // This endpoint previously returned Sanity-sourced product pricing.
  // It is intentionally deprecated to prevent non-authoritative prices from being served/cached.
  return new Response(
    JSON.stringify({
      error: 'Deprecated: pricing data must be fetched from Medusa /store/products.',
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

