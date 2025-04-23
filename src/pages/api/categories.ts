import { sanityFetch } from '../../lib/sanityFetch';
import { groq } from 'next-sanity';

export default async function handler(_req: Request): Promise<Response> {
  void _req;
  console.log('🧪 CATEGORY API DEBUG →', {
    tokenPrefix: import.meta.env.SANITY_API_TOKEN?.slice(0, 8) || 'undefined',
    projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'undefined',
    dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'undefined'
  });

  const query = groq`*[_type == "category"]{_id, title, slug}`;

  try {
    const categories = await sanityFetch({ query });
    return new Response(JSON.stringify(categories), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (_err) {
    console.error('❌ API /categories failed:', _err);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch categories',
        details: _err instanceof Error ? _err.message : String(_err)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
