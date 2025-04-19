import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.PUBLIC_SANITY_DATASET,
  apiVersion: process.env.SANITY_API_VERSION || '2023-06-07',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN, // ❗️ Use secure/private token here
})

export async function sanityFetch<T>(params: {
  query: string,
  params?: Record<string, any>
}): Promise<T> {
  return client.fetch<T>(params.query, params.params)
}