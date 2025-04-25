import { type APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
  const dataset = import.meta.env.VITE_SANITY_DATASET;

  const filterQuery = '*[_type=="productFilter"]{title, slug}';
  const url = `https://${projectId}.api.sanity.io/v2023-06-07/data/query/${dataset}?query=${encodeURIComponent(filterQuery)}`;

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
