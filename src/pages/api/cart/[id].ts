/**
 * Get Cart Data
 * Fetches cart from Medusa for checkout display
 */
import type { APIRoute } from 'astro'
import { medusaFetch, readJsonSafe } from '@/lib/medusa'
import { normalizeCartTotals, toCentsStrict } from '@/lib/money'

const GUEST_CART_ID_MIN_LENGTH = 16

function isLikelyBearerCartId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length >= GUEST_CART_ID_MIN_LENGTH
}

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

function resolveCartItemVariantId(item: any): string | null {
  return (
    asString(item?.variant_id) ||
    asString(item?.metadata?.resolved_variant_id) ||
    asString(item?.metadata?.base_variant_id) ||
    asString(item?.metadata?.medusa_variant_id) ||
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

function resolveAppliedDiscountCodes(cart: any): string[] {
  const unique = new Set<string>()
  const promotions = Array.isArray(cart?.promotions) ? cart.promotions : []
  const discounts = Array.isArray(cart?.discounts) ? cart.discounts : []

  const collect = (raw: unknown) => {
    if (typeof raw !== 'string') return
    const normalized = raw.trim()
    if (!normalized) return
    unique.add(normalized)
  }

  for (const promo of promotions) {
    collect((promo as any)?.code)
    collect((promo as any)?.promotion_code)
    collect((promo as any)?.campaign?.code)
  }

  for (const discount of discounts) {
    collect((discount as any)?.code)
    collect((discount as any)?.discount_rule?.code)
  }

  return Array.from(unique)
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
    shippingClass.includes('service')
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
    const cartId = typeof params.id === 'string' ? params.id.trim() : ''

    if (!cartId) {
      return new Response(
        JSON.stringify({ error: 'Cart ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    // Guest-checkout decision: cart IDs are capability tokens and auth is optional by design.
    // Guardrail: reject malformed/low-entropy IDs and avoid logging raw cart IDs.
    if (!isLikelyBearerCartId(cartId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid cart ID' }),
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
    const hasExplicitDiscounts =
      (Array.isArray((medusaData?.cart as any)?.discounts) &&
        (medusaData.cart as any).discounts.length > 0) ||
      (Array.isArray((medusaData?.cart as any)?.promotions) &&
        (medusaData.cart as any).promotions.length > 0)
    const discountCents = hasExplicitDiscounts
      ? toCentsStrict(medusaData.cart.discount_total, 'cart.discount_total') ?? 0
      : 0
    const medusaSubtotalCents =
      toCentsStrict(medusaData.cart.subtotal, 'cart.subtotal') ?? 0
    const medusaTaxCents =
      toCentsStrict(medusaData.cart.tax_total, 'cart.tax_total') ?? 0
    const medusaShippingCents =
      toCentsStrict(medusaData.cart.shipping_total, 'cart.shipping_total') ?? 0
    const medusaTotalCents =
      toCentsStrict(medusaData.cart.total, 'cart.total') ??
      Math.max(0, medusaSubtotalCents + medusaShippingCents + medusaTaxCents - discountCents)

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
        medusa_variant_id: resolveCartItemVariantId(item),
        medusa_line_item_id: asString(item?.id),
        title: item.title,
        thumbnail: resolveCartItemThumbnail(item),
        variant_title: asString(item?.variant_title) ?? asString(item?.variant?.title),
        quantity: item.quantity,
        install_only: resolveItemInstallOnly(item),
        shipping_class: resolveItemShippingClass(item)
      })),
      subtotal_cents: medusaSubtotalCents,
      tax_amount_cents: medusaTaxCents,
      shipping_amount_cents: medusaShippingCents,
      discount_amount_cents: discountCents,
      applied_discount_codes: resolveAppliedDiscountCodes(medusaData.cart),
      total_cents: medusaTotalCents,
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
