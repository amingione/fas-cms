import { createClient } from '@sanity/client';

const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
  apiVersion: import.meta.env.VITE_SANITY_API_VERSION || '2023-06-07',
  useCdn: false,
  token: import.meta.env.VITE_SANITY_API_TOKEN // ❗️ Use secure/private token here
});

export async function sanityFetch<T>(params: {
  query: string;
  params?: Record<string, unknown>;
}): Promise<T> {
  return client.fetch<T>(params.query, params.params);
}
