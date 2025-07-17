import { type APIRoute } from 'astro';

export const GET: APIRoute = async () => {

  const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET;

  const categoryQuery = '*[_type=="category"]{title, slug}';
  const url = `https://${projectId}.api.sanity.io/v2023-06-07/data/query/${dataset}?query=${encodeURIComponent(categoryQuery)}`;

  try {
    console.log('Sanity URL:', url);
    const res = await fetch(url);
    const data = await res.json();
    return new Response(JSON.stringify(data.result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Sanity category fetch failed:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
