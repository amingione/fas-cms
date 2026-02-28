/**
 * Get Cart Data
 * Fetches cart from Medusa for checkout display
 */
import type { APIRoute } from 'astro'
import { medusaFetch, readJsonSafe } from '@/lib/medusa'
import { normalizeCartTotals, toCentsStrict } from '@/lib/money'

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function resolveCartItemThumbnail(item: any): string | null {
  const variant = item?.variant
  const product = variant?.product
  const metadata = product?.metadata && typeof product.metadata === 'object' ? product.metadata : null

  return (
    asString(item?.thumbnail) ||
    asString(variant?.thumbnail) ||
    asString(product?.thumbnail) ||
    asString(product?.images?.[0]?.url) ||
    asString((metadata as any)?.thumbnail) ||
    asString((metadata as any)?.thumbnail_url) ||
    asString((metadata as any)?.thumbnailUrl) ||
    asString((metadata as any)?.image) ||
    asString((metadata as any)?.image_url) ||
    null
  )
}

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return null
}

function resolveItemInstallOnly(item: any): boolean {
  const direct = parseBooleanLike(item?.install_only)
  if (direct !== null) return direct

  const metadataSources = [
    item?.metadata,
    item?.variant?.metadata,
    item?.variant?.product?.metadata
  ].filter((metadata) => metadata && typeof metadata === 'object')

  for (const metadata of metadataSources) {
    const value =
      parseBooleanLike((metadata as any)?.install_only) ??
      parseBooleanLike((metadata as any)?.installOnly)
    if (value !== null) return value
  }

  return false
}

function resolveItemShippingClass(item: any): string | null {
  const direct = asString(item?.shipping_class)
  if (direct) return direct

  const metadataSources = [
    item?.metadata,
    item?.variant?.metadata,
    item?.variant?.product?.metadata
  ].filter((metadata) => metadata && typeof metadata === 'object')

  for (const metadata of metadataSources) {
    const value = asString((metadata as any)?.shipping_class) || asString((metadata as any)?.shippingClass)
    if (value) return value
  }

  return null
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const cartId = params.id

    if (!cartId) {
      return new Response(
        JSON.stringify({ error: 'Cart ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch cart from Medusa using shared config/headers so all cart routes stay aligned.
    const response = await medusaFetch(`/store/carts/${cartId}`, { method: 'GET' })
    const medusaData = await readJsonSafe<any>(response)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: medusaData?.message || 'Cart not found' }),
        {
          status: response.status === 404 ? 404 : 502,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (medusaData?.cart) {
      normalizeCartTotals(medusaData.cart)
    }

    // Transform Medusa cart to our format
    const cart = {
      id: medusaData.cart.id,
      items: medusaData.cart.items.map((item: any) => ({
        id: item.id,
        title: item.title,
        thumbnail: resolveCartItemThumbnail(item),
        variant_title: asString(item?.variant_title) ?? asString(item?.variant?.title),
        quantity: item.quantity,
        install_only: resolveItemInstallOnly(item),
        shipping_class: resolveItemShippingClass(item),
        unit_price: toCentsStrict(item.unit_price, 'item.unit_price') ?? item.unit_price,
        total:
          toCentsStrict(item.total, 'item.total') ??
          toCentsStrict(item.unit_price, 'item.unit_price') ??
          item.unit_price * item.quantity
      })),
      subtotal_cents:
        toCentsStrict(medusaData.cart.subtotal, 'cart.subtotal') ?? medusaData.cart.subtotal,
      tax_amount_cents:
        toCentsStrict(medusaData.cart.tax_total, 'cart.tax_total') ??
        Math.max(
          0,
          (toCentsStrict(medusaData.cart.total, 'cart.total') ?? 0) -
            (toCentsStrict(medusaData.cart.subtotal, 'cart.subtotal') ?? 0) -
            (toCentsStrict(medusaData.cart.shipping_total, 'cart.shipping_total') ?? 0)
        ),
      shipping_amount_cents:
        toCentsStrict(medusaData.cart.shipping_total, 'cart.shipping_total') ?? 0,
      total_cents: toCentsStrict(medusaData.cart.total, 'cart.total') ?? medusaData.cart.total,
      email: medusaData.cart.email
    }

    return new Response(
      JSON.stringify({ cart }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Cart fetch error:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
