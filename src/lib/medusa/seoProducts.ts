import {medusaFetch, readJsonSafe} from '../medusa'

type MedusaMoneyAmount = {
  amount?: number
  currency_code?: string
}

type MedusaVariant = {
  calculated_price?: {
    calculated_amount?: number
    original_amount?: number
    currency_code?: string
  }
  prices?: MedusaMoneyAmount[]
}

type MedusaProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string
  variants?: MedusaVariant[]
}

type MedusaCollectionsResponse = {
  collections?: Array<{id?: string}>
}

type MedusaProductsResponse = {
  products?: MedusaProduct[]
}

export type SeoProductCard = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number | null
  currencyCode: string
}

function extractPrice(product: MedusaProduct): {price: number | null; currencyCode: string} {
  const firstVariant = product.variants?.[0]

  const calculatedAmount = firstVariant?.calculated_price?.calculated_amount
  const calculatedCurrency = firstVariant?.calculated_price?.currency_code

  if (typeof calculatedAmount === 'number') {
    return {
      price: calculatedAmount,
      currencyCode: (calculatedCurrency || 'usd').toUpperCase(),
    }
  }

  const rawAmount = firstVariant?.prices?.[0]?.amount
  const rawCurrency = firstVariant?.prices?.[0]?.currency_code

  if (typeof rawAmount === 'number') {
    return {
      price: rawAmount,
      currencyCode: (rawCurrency || 'usd').toUpperCase(),
    }
  }

  return {
    price: null,
    currencyCode: 'USD',
  }
}

function normalizeProduct(product: MedusaProduct): SeoProductCard {
  const {price, currencyCode} = extractPrice(product)

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    thumbnail: product.thumbnail || null,
    price,
    currencyCode,
  }
}

export async function getProductsByCollectionHandle(handle: string): Promise<SeoProductCard[]> {
  const collectionsRes = await medusaFetch(
    `/store/collections?handle[]=${encodeURIComponent(handle)}`,
    {method: 'GET'}
  )

  if (!collectionsRes.ok) {
    throw new Error(`Failed to fetch Medusa collections for handle: ${handle}`)
  }

  const collectionsJson = await readJsonSafe<MedusaCollectionsResponse>(collectionsRes)
  const collectionId = collectionsJson?.collections?.[0]?.id

  if (!collectionId) return []

  const productsRes = await medusaFetch(
    `/store/products?collection_id[]=${encodeURIComponent(collectionId)}&limit=12`,
    {method: 'GET'}
  )

  if (!productsRes.ok) {
    throw new Error(`Failed to fetch Medusa products for collection: ${handle}`)
  }

  const productsJson = await readJsonSafe<MedusaProductsResponse>(productsRes)
  return (productsJson?.products || []).map(normalizeProduct)
}

export async function getProductsByHandles(handles: string[]): Promise<SeoProductCard[]> {
  if (!handles.length) return []

  const params = new URLSearchParams()
  handles.forEach((handle) => params.append('handle[]', handle))
  params.set('limit', String(handles.length))

  const res = await medusaFetch(`/store/products?${params.toString()}`, {method: 'GET'})

  if (!res.ok) {
    throw new Error('Failed to fetch Medusa products by handle')
  }

  const json = await readJsonSafe<MedusaProductsResponse>(res)
  const normalized = (json?.products || []).map(normalizeProduct)
  const order = new Map(handles.map((handle, index) => [handle, index]))
  return normalized.sort((a, b) => {
    const aIndex = order.get(a.handle) ?? Number.MAX_SAFE_INTEGER
    const bIndex = order.get(b.handle) ?? Number.MAX_SAFE_INTEGER
    return aIndex - bIndex
  })
}

export async function getSeoProducts(input: {
  featuredProductHandles?: string[]
  medusaCollectionHandle: string
}): Promise<SeoProductCard[]> {
  if (input.featuredProductHandles?.length) {
    const featured = await getProductsByHandles(input.featuredProductHandles)
    if (featured.length) return featured
  }

  return getProductsByCollectionHandle(input.medusaCollectionHandle)
}
