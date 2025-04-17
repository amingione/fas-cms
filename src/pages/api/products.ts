// src/pages/api/products/index.ts
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

export async function GET() {
  const query = `*[_type == "wooProduct"] | order(price asc)[0...9] {
    _id,
    title,
    slug,
    price,
    images[]{ asset->{ url } }
  }`;

  const products = await client.fetch(query);
  return new Response(JSON.stringify(products), {
    headers: { 'Content-Type': 'application/json' },
  });
}