import { createClient } from '@sanity/client';

import { ACTIVE_PRODUCT_FILTER } from '@/lib/sanity-utils.ts';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || import.meta.env.SANITY_PROJECT_ID;
const token = import.meta.env.SANITY_API_TOKEN;

if (!projectId) throw new Error('Missing Sanity projectId (check .env or deployment settings)');
if (!token) throw new Error('Missing Sanity API token (check .env or deployment settings)');

const dataset =
  (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
  (import.meta.env.SANITY_DATASET as string | undefined) ||
  'production';

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2023-06-07',
  token,
  useCdn: false
});

export async function GET({ url }: { url: URL }) {
  const start = Number(url.searchParams.get('start')) || 0;
  const end = Number(url.searchParams.get('end')) || 9;
  const sort = url.searchParams.get('sort') || 'price';

  const category = url.searchParams.get('category');
  const vehicle = url.searchParams.get('vehicle');
  const tune = url.searchParams.get('tune');
  const minHp = url.searchParams.get('minHp');

  const filters = [`_type == "product"`, ACTIVE_PRODUCT_FILTER, `defined(slug.current)`];

  if (category) filters.push(`"${category}" in categories[]->slug.current`);
  if (vehicle) filters.push(`"${vehicle}" in compatibleVehicles[]->slug.current`);
  if (tune) filters.push(`tune == "${tune}"`);
  if (minHp) filters.push(`averageHorsepower >= ${minHp}`);

  const allQuery = `*[
    ${filters.join(' && ')}
  ] | order(${sort} asc) {
    _id,
    title,
    slug,
    price,
    averageHorsepower,
    description,
    sku,
    onSale,
    salePrice,
    inventory,
    featured,
    productType,
    categories[]->{
      title,
      slug
    },
    images[]{
      asset->{
        url
      },
      alt
    },
    upsells[]->{
      _id,
      title,
      slug,
      price,
      images[]{
        asset->{
          url
        },
        alt
      }
    }
  }`;

  const allProducts = await client.fetch(allQuery);
  const slicedProducts = allProducts.slice(start, end);

  return new Response(
    JSON.stringify({
      products: slicedProducts,
      totalCount: allProducts.length
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
