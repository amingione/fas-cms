import { createClient } from '@sanity/client';

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  apiVersion: import.meta.env.PUBLIC_SANITY_API_VERSION || '2023-06-07',
  useCdn: false,
  token: import.meta.env.PUBLIC_SANITY_API_TOKEN // ❗️ Use secure/private token here
});

type QueryParams = Record<string, string | number | boolean>;

export async function sanityFetch<T>(params: { query: string; params?: QueryParams }): Promise<T> {
  return client.fetch<T>(params.query, params.params ?? {});
}
