import type { APIRoute } from 'astro';
import { sanityClient } from '../../lib/sanityClient';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');
  if (!query) {
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  }

  try {
    const results = await sanityClient.fetch(
      `*[_type in ["product", "quote", "invoice", "appointment"]
        && (
          name match $q ||
          title match $q ||
          description match $q ||
          slug.current match $q
        )
      ][0..24]{
        _id,
        _type,
        name,
        title,
        description,
        "slug": slug.current,
        // Build a client navigable URL per type
        "url": select(
          _type == "product" => "/shop/" + slug.current,
          _type == "quote" => "/dashboard/quotes/" + _id,
          _type == "invoice" => "/dashboard/invoices/" + _id,
          _type == "appointment" => "/dashboard/appointments/" + _id,
          true => "/"
        )
      }`,
      { q: `${query}*` }
    );
    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
