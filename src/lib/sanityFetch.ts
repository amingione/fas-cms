import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.PUBLIC_SANITY_DATASET,
  apiVersion: '2023-01-01',
  useCdn: false,
  token: process.env.PUBLIC_SANITY_API_TOKEN,
})

export async function sanityFetch<T>(params: {
  query: string,
  params?: Record<string, any>
}): Promise<T> {
  return client.fetch<T>(params.query, params.params)
}