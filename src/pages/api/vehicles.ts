import { sanityFetch } from '@/lib/sanityFetch';

const json = (body: Record<string, unknown>, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init
  });

export async function GET(): Promise<Response> {
  const query = `*[_type == "vehicleModel"]{ model }`;

  if (
    !import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
    !import.meta.env.PUBLIC_SANITY_DATASET
  ) {
    return json({ vehicles: [] }, { status: 200 });
  }

  try {
    const result = await sanityFetch<{ model?: string }[]>({ query });
    return json({ vehicles: Array.isArray(result) ? result : [] }, { status: 200 });
  } catch (err) {
    console.error('❌ Vehicle fetch failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ vehicles: [], error: 'Vehicle fetch error', details: message }, { status: 200 });
  }
}
