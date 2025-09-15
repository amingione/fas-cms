import { sanityFetch } from '@/lib/sanityFetch';
import { readSession } from '../../server/auth/session';

export async function GET({ request }: { request: Request }): Promise<Response> {
  const { session } = await readSession(request);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  console.log('🧪 VEHICLE API DEBUG →', {
    tokenPrefix: import.meta.env.SANITY_API_TOKEN?.slice(0, 8),
    projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
    dataset: import.meta.env.PUBLIC_SANITY_DATASET
  });

  const query = `*[_type == "vehicleModel"]{ model }`;

  if (
    !import.meta.env.SANITY_API_TOKEN ||
    !import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
    !import.meta.env.PUBLIC_SANITY_DATASET
  ) {
    return new Response(JSON.stringify({ error: 'Missing Sanity credentials' }), {
      status: 500
    });
  }

  try {
    const result = await sanityFetch({ query });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('❌ Vehicle fetch failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Vehicle fetch error', details: message }), {
      status: 500
    });
  }
}
