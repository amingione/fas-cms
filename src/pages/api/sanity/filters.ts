import { type APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
  const dataset = import.meta.env.VITE_SANITY_DATASET;

  const urlParams = new URL(request.url).searchParams;
  const categorySlug = urlParams.get('category');

  console.log('[Sanity Filter] categorySlug:', categorySlug);

  if (!categorySlug || categorySlug === 'null' || categorySlug === 'undefined') {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const query = `*[_type=="product" && references(*[_type=="category" && slug.current=="${categorySlug}"]._id)]{title, slug, price, images, _id}`;

  const url = `https://${projectId}.api.sanity.io/v2023-06-07/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return new Response(JSON.stringify(data.result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Sanity filter fetch failed:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
