import {createClient} from '@sanity/client'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined

if (!projectId) {
  throw new Error('Missing PUBLIC_SANITY_PROJECT_ID')
}

const isServer = Boolean(import.meta.env.SSR)
const serverEnv =
  (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string | undefined>
const publicReadToken = import.meta.env.PUBLIC_SANITY_API_TOKEN as string | undefined
const token = isServer ? serverEnv.SANITY_API_TOKEN || publicReadToken : undefined

export const sanityClient = createClient({
  projectId,
  dataset: (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) || 'production',
  apiVersion: '2025-01-01',
  useCdn: !token,
  token,
})
