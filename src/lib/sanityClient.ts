// This is the ONLY file that sets up and exports the Sanity client
import { createClient } from '@sanity/client';

const projectId = process.env.SANITY_PROJECT_ID;
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error("Missing Sanity environment variables: SANITY_PROJECT_ID or SANITY_API_TOKEN");
}

export const client = createClient({
  projectId,
  dataset: 'production',
  apiVersion: '2023-06-07',
  token,
  useCdn: false,
});

export async function fetchProducts() {
  const query = `*[_type == "wooProduct"] | order(price asc)[0...9] {
    _id,
    title,
    slug,
    price,
    images[]{ asset->{ url } }
  }`;

  const result = await client.fetch(query);
  return result || [];
}