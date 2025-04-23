import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const token = process.env.PUBLIC_SANITY_API_TOKEN || import.meta.env.PUBLIC_SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error('Missing PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_API_TOKEN');
}

export const client = createClient({
  projectId,
  dataset: 'production',
  apiVersion: '2023-06-07',
  token,
  useCdn: false
});

export async function fetchProducts() {
  const query = `*[_type == "product"] | order(price asc)[0...9] {
    _id,
    title,
    slug,
    price,
    images[]{ asset->{ url } }
  }`;

  const result = await client.fetch(query);
  return result || [];
}
