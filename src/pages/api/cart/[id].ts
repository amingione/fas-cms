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

function toRoundedCents(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.round(parsed)
  }
  return 0
}

function collectLocalAddOnCentsByLocalId(cart: any): Map<string, number> {
  const result = new Map<string, number>()
  const localItems = Array.isArray(cart?.metadata?.local_cart_items)
    ? cart.metadata.local_cart_items
    : []

  for (const entry of localItems) {
    if (!entry || typeof entry !== 'object') continue
    const id = asString((entry as any).id)
    if (!id) continue
    const detailed = Array.isArray((entry as any).selectedUpgradesDetailed)
      ? (entry as any).selectedUpgradesDetailed
      : []
    const addOnTotal = detailed.reduce((sum: number, detail: any) => {
      const cents = toRoundedCents(detail?.priceCents)
      return sum + (cents > 0 ? cents : 0)
    }, 0)
    if (addOnTotal > 0) result.set(id, addOnTotal)
  }

  return result
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

    const localAddOnCents = collectLocalAddOnCentsByLocalId(medusaData?.cart)

    // Transform Medusa cart to our format
    const cart = {
      id: medusaData.cart.id,
      items: medusaData.cart.items.map((item: any) => ({
        ...(function () {
          const localId = asString(item?.metadata?.local_item_id)
          const addOnCents = localId ? localAddOnCents.get(localId) ?? 0 : 0
          const baseUnit =
            toCentsStrict(item.unit_price, 'item.unit_price') ?? item.unit_price
          const effectiveUnit = Math.max(0, baseUnit + addOnCents)
          return {
            unit_price: effectiveUnit,
            total:
              (toCentsStrict(item.total, 'item.total') ??
                toCentsStrict(item.unit_price, 'item.unit_price') ??
                item.unit_price * item.quantity) +
              addOnCents * Math.max(1, Number(item.quantity) || 1)
          }
        })(),
        id: item.id,
        title: item.title,
        thumbnail: resolveCartItemThumbnail(item),
        variant_title: asString(item?.variant_title) ?? asString(item?.variant?.title),
        quantity: item.quantity,
        install_only: resolveItemInstallOnly(item),
        shipping_class: resolveItemShippingClass(item)
      })),
      subtotal_cents: 0,
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
      total_cents: 0,
      email: medusaData.cart.email
    }

    const subtotalCents = cart.items.reduce(
      (sum: number, item: any) => sum + Math.max(0, toRoundedCents(item.total)),
      0
    )
    const hasExplicitDiscounts =
      (Array.isArray((medusaData?.cart as any)?.discounts) &&
        (medusaData.cart as any).discounts.length > 0) ||
      (Array.isArray((medusaData?.cart as any)?.promotions) &&
        (medusaData.cart as any).promotions.length > 0)
    const discountCents = hasExplicitDiscounts
      ? toCentsStrict(medusaData.cart.discount_total, 'cart.discount_total') ?? 0
      : 0
    cart.subtotal_cents = subtotalCents
    cart.total_cents = Math.max(
      0,
      subtotalCents + cart.shipping_amount_cents + cart.tax_amount_cents - discountCents
    )

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
