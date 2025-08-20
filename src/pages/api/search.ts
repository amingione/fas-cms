import type { APIRoute } from 'astro';
import { sanityClient } from '../../lib/sanityClient';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');
  if (!query) {
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  }

  try {
    const results = await sanityClient.fetch(
      `*[_type in ["product", "quote", "invoice", "appointment"] && (name match $q || title match $q || description match $q)]{
        _id,
        _type,
        name,
        title,
        description
      }`,
      { q: `${query}*` }
    );
    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
