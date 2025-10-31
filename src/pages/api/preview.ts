import type {APIRoute} from 'astro'
import {createClient} from '@sanity/client'
import {validatePreviewUrl} from '@sanity/preview-url-secret'

const resolveProjectId = () =>
  process.env.SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  'r4og35qd'

const resolveDataset = () =>
  process.env.SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'production'

const resolveApiVersion = () =>
  process.env.SANITY_API_VERSION || process.env.PUBLIC_SANITY_API_VERSION || '2023-11-09'

const resolveReadToken = () =>
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.PUBLIC_SANITY_API_TOKEN

const resolvePreviewOrigin = (requestUrl: URL) =>
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN ||
  process.env.PUBLIC_SITE_URL ||
  requestUrl.origin

const previewCookieName = 'sanity-preview'

const buildPreviewCookie = (origin: string) => {
  const secure = origin.startsWith('https://') ? '; Secure' : ''
  return `${previewCookieName}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${secure}`
}

const getClient = () => {
  const projectId = resolveProjectId()
  const dataset = resolveDataset()
  const token = resolveReadToken()
  if (!token) {
    throw new Error('Missing SANITY_API_READ_TOKEN (or SANITY_API_TOKEN) for preview validation')
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: resolveApiVersion(),
    token,
    useCdn: false,
    perspective: 'published',
  })
}

export const GET: APIRoute = async ({request}) => {
  let client
  try {
    client = getClient()
  } catch (error) {
    console.error('[sanity] Preview request failed during client configuration', error)
    return new Response(JSON.stringify({error: 'Sanity preview is not configured'}), {
      status: 500,
      headers: {'content-type': 'application/json'},
    })
  }

  const requestUrl = new URL(request.url)
  let validation
  try {
    validation = await validatePreviewUrl(client, request.url)
  } catch (error) {
    console.error('[sanity] Preview secret validation threw an error', error)
    return new Response(JSON.stringify({error: 'Preview secret validation failed'}), {
      status: 500,
      headers: {'content-type': 'application/json'},
    })
  }

  if (!validation?.isValid) {
    return new Response(JSON.stringify({error: 'Invalid preview secret'}), {
      status: 401,
      headers: {'content-type': 'application/json'},
    })
  }

  const origin = resolvePreviewOrigin(requestUrl)
  const redirectPath = validation.redirectTo || requestUrl.searchParams.get('redirectTo') || '/'
  const redirectUrl = new URL(redirectPath, origin)
  redirectUrl.searchParams.set('preview', '1')
  redirectUrl.searchParams.set(previewCookieName, '1')

  const headers = new Headers({
    Location: redirectUrl.toString(),
    'Cache-Control': 'no-store',
    'Set-Cookie': buildPreviewCookie(origin),
  })

  if (validation.studioOrigin) {
    headers.set('Access-Control-Allow-Origin', validation.studioOrigin)
    headers.append('Vary', 'Origin')
  }

  return new Response(null, {
    status: 307,
    headers,
  })
}

export const HEAD: APIRoute = async (context) => {
  const response = await GET(context)
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  })
}

export const OPTIONS: APIRoute = async ({request}) => {
  const requestUrl = new URL(request.url)
  const origin = resolvePreviewOrigin(requestUrl)
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  })
  headers.set('Access-Control-Allow-Origin', origin)
  headers.append('Vary', 'Origin')
  return new Response(null, {status: 204, headers})
}
