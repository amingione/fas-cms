import { sanityFetch } from '@/lib/sanityFetch';
import { readSession } from '../../server/auth/session';

export async function GET({ request }: { request: Request }): Promise<Response> {
  try {
    const { session } = await readSession(request);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    console.log('🧪 TUNE API DEBUG → Authenticated user:', session.user.email);
    console.log('🧪 TUNE API DEBUG →', {
      tokenPrefix: import.meta.env.SANITY_API_TOKEN?.slice(0, 8),
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET
    });
    const query = `*[_type == "tune"]{ title }`;
    if (
      !import.meta.env.SANITY_API_TOKEN ||
      !import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
      !import.meta.env.PUBLIC_SANITY_DATASET
    ) {
      return new Response(JSON.stringify({ error: 'Missing Sanity credentials' }), {
        status: 500
      });
    }
    const result = await sanityFetch({ query });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    console.error('❌ Tune fetch failed:', err);
    return new Response(
      JSON.stringify({
        error: 'Tune fetch error',
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      {
        status: 500
      }
    );
  }
}
