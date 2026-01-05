import { createClient } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
const isServer = Boolean(import.meta.env.SSR);
const token = isServer
  ? import.meta.env.SANITY_API_READ_TOKEN ||
    import.meta.env.SANITY_API_TOKEN ||
    import.meta.env.SANITY_WRITE_TOKEN
  : undefined;

if (!projectId || !dataset) {
  throw new Error('Missing required environment variables for Sanity');
}

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: !token,
  token
});

export const fetchFromSanity = async (query: string, params = {}) => {
  try {
    return await sanityClient.fetch(query, params);
  } catch (err) {
    console.error('[Sanity Fetch Error]:', err);
    return null;
  }
};

export async function fetchProducts() {
  const query = `*[_type == "product" && !(_id in path('drafts.**')) && status == "active" && (productType == "service" || productType == "bundle" || productType == "physical" || featured == true) && defined(slug.current)] | order(price asc)[0...9] {
    _id,
    title,
    slug,
    price,
    onSale,
    salePrice,
    compareAtPrice,
    discountPercent,
    discountPercentage,
    saleStartDate,
    saleEndDate,
    saleActive,
    saleLabel,
    images[]{ asset->{ url } }
  }`;

  return await fetchFromSanity(query);
}
