import { createClient } from '@sanity/client'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET
const token = import.meta.env.SANITY_API_TOKEN
const isProd = import.meta.env.MODE === 'production'

if (!projectId || !dataset) {
  throw new Error('Missing required environment variables for Sanity (projectId/dataset)')
}

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2024-04-10',
  useCdn: isProd,
  token: isProd ? undefined : token,
  perspective: isProd ? 'published' : 'previewDrafts',
})

export const fetchFromSanity = async (query: string, params = {}) => {
  try {
    return await sanityClient.fetch(query, params)
  } catch (err) {
    console.error('[Sanity Fetch Error]:', err)
    return null
  }
}

export async function fetchProducts() {
  const query = `*[ _type == "product" && !(_id in path('drafts.**')) && defined(slug.current) ] | order(coalesce(price, 9e9) asc)[0...9]{ _id, title, slug, price, images[]{ asset->{ url } } }`
  return await fetchFromSanity(query)
}

