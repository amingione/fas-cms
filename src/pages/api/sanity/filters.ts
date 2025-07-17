import { type APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET;

  const urlParams = new URL(request.url, 'http://localhost').searchParams;
  const categorySlug = urlParams.get('categorySlug') || urlParams.get('category');

  console.log('[Sanity Filter] categorySlug:', categorySlug);

  if (!categorySlug || categorySlug === 'null' || categorySlug === 'undefined') {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Step 1: Resolve the category ID
  const categoryIdQuery = `*[_type == "category" && slug.current == "${categorySlug}"][0]._id`;
  const categoryIdUrl = `https://${projectId}.api.sanity.io/v2023-06-07/data/query/${dataset}?query=${encodeURIComponent(categoryIdQuery)}`;

  const categoryIdRes = await fetch(categoryIdUrl);
  const categoryIdData = await categoryIdRes.json();
  const categoryId = categoryIdData.result;

  if (!categoryId) {
    console.warn('No category found for slug:', categorySlug);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Step 2: Fetch products that reference the category ID
  const productQuery = `*[_type == "product" && references("${categoryId}")]{
    title, slug, price, images, _id
  }`;
  const productUrl = `https://${projectId}.api.sanity.io/v2023-06-07/data/query/${dataset}?query=${encodeURIComponent(productQuery)}`;

  try {
    const res = await fetch(productUrl);
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
