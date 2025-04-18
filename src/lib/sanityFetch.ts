import { createClient } from '@sanity/client'

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  apiVersion: '2023-01-01',
  useCdn: false,
  token: import.meta.env.SANITY_API_TOKEN,
})

export async function sanityFetch<T>(params: {
  query: string,
  params?: Record<string, any>
}): Promise<T> {
  return client.fetch<T>(params.query, params.params)
}