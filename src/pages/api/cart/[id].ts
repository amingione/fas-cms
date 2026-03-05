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
  const requiresShippingDirect =
    parseBooleanLike(item?.requires_shipping) ??
    parseBooleanLike(item?.is_shipping_required)
  if (requiresShippingDirect === false) return true

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
    const requiresShipping =
      parseBooleanLike((metadata as any)?.requires_shipping) ??
      parseBooleanLike((metadata as any)?.requiresShipping)
    if (requiresShipping === false) return true
  }

  const shippingClass = String(resolveItemShippingClass(item) || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (
    shippingClass.includes('installonly') ||
    shippingClass.includes('service') ||
    shippingClass.includes('package')
  ) {
    return true
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
        ...(function () {
          const effectiveUnit =
            toCentsStrict(item.unit_price, 'item.unit_price') ?? item.unit_price
          return {
            unit_price: effectiveUnit,
            total: toCentsStrict(item.total, 'item.total') ?? effectiveUnit * item.quantity
          }
        })(),
        id: item.id,
        local_item_id: asString(item?.metadata?.local_item_id),
        medusa_variant_id: asString(item?.variant_id),
        medusa_line_item_id: asString(item?.id),
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
