import { createClient } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || import.meta.env.SANITY_PROJECT_ID;
const token = import.meta.env.PUBLIC_SANITY_API_TOKEN || import.meta.env.SANITY_API_TOKEN;

if (!projectId) throw new Error('Missing Sanity projectId');
if (!token) throw new Error('Missing Sanity token');

const client = createClient({
  projectId,
  dataset: 'production',
  apiVersion: '2023-06-07',
  token,
  useCdn: false,
});

export async function GET({ url }: { url: URL }) {
  const start = Number(url.searchParams.get('start')) || 0;
  const end = Number(url.searchParams.get('end')) || 9;
  const sort = url.searchParams.get('sort') || 'price';

  const allQuery = `*[_type == "wooProduct"] | order(${sort} asc) {
    _id,
    title,
    slug,
    price,
    images[]{ asset->{ url } }
  }`;

  const allProducts = await client.fetch(allQuery);
  const slicedProducts = allProducts.slice(start, end);

  return new Response(
    JSON.stringify({
      products: slicedProducts,
      totalCount: allProducts.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}