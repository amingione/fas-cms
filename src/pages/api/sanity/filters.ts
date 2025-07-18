import { type APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET;

  const urlParams = new URL(request.url, 'http://localhost').searchParams;
  const categorySlugRaw = urlParams.get('categorySlug') || urlParams.get('category');
  const categorySlug = categorySlugRaw?.toLowerCase();

  console.log('[Sanity Filter] categorySlug:', categorySlug);

  if (!categorySlug || ['null', 'undefined'].includes(categorySlug)) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Step 1: Resolve the category ID
    const categoryIdQuery = `*[_type == "category" && slug.current == "${categorySlug}"][0]._id`;
    const categoryIdUrl = `https://${projectId}.api.sanity.io/v2023-06-07/data/query/${dataset}?query=${encodeURIComponent(categoryIdQuery)}`;

    const categoryIdRes = await fetch(categoryIdUrl);
    if (!categoryIdRes.ok) {
      throw new Error(`Failed to fetch category ID: ${categoryIdRes.statusText}`);
    }

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
      _id,
      title,
      slug,
      price,
      "image": images[0].asset->url
    }`;
    const productUrl = `https://${projectId}.api.sanity.io/v2023-06-07/data/query/${dataset}?query=${encodeURIComponent(productQuery)}`;

    const res = await fetch(productUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.statusText}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify(data.result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Sanity filter fetch failed:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
