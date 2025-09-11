import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const src = (url.searchParams.get('source') || 'all').toLowerCase();
    const source = (src === 'belak' || src === 'jtx') ? src : 'all';

    const query = `*[_type == "wheelQuote" && ($source == 'all' || source == $source)]|order(coalesce(createdAt,_createdAt) desc){
      _id,
      source,
      "createdAt": coalesce(createdAt,_createdAt),
      fullname,
      email,
      phone,
      series,
      diameter,
      width,
      boltPattern,
      backspacing,
      finish,
      beadlock,
      status
    }`;
    const rows = await sanityClient.fetch(query, { source });
    return new Response(JSON.stringify(Array.isArray(rows) ? rows : []), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to fetch wheel quotes' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
