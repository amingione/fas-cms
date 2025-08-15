import { createClient } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
const token = import.meta.env.SANITY_API_TOKEN;

if (!projectId || !dataset || !token) {
  throw new Error('Missing required environment variables for Sanity');
}

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2023-06-07',
  useCdn: false,
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
  const query = `*[_type == "product"] | order(price asc)[0...9] {
    _id,
    title,
    slug,
    price,
    images[]{ asset->{ url } }
  }`;

  return await fetchFromSanity(query);
}
