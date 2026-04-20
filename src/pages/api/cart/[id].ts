/**
 * @governance-locked
 * OWNER: Amber Mingione — do NOT modify without explicit written approval.
 * LOCKED: 2026-04-20 | Checkout math fix (cart GET endpoint)
 *
 * CONTRACTS (must never change):
 *  - fieldsParam MUST include +items.total,+items.metadata,+items.adjustments
 *    Removing these causes add-on adjustments to be invisible in display
 *  - All cart responses must pass through buildStorefrontCartFromMedusaCart
 *
 * To request a change: open a PR and tag @ambermin for review.
 */
/**
 * Get Cart Data
 * Fetches cart from Medusa for checkout display
 */
import type { APIRoute } from 'astro'
import { medusaFetch, readJsonSafe } from '@/lib/medusa'
import { buildStorefrontCartFromMedusaCart } from '@/lib/cart/transform'

const GUEST_CART_ID_MIN_LENGTH = 16

function isLikelyBearerCartId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length >= GUEST_CART_ID_MIN_LENGTH
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
    // Include promotions, item totals, and item metadata.
    // +items.total: ensures per-item total (including add-on adjustments) matches
    //   cart.subtotal so displayed item price and subtotal are consistent.
    // +items.metadata: exposes selected_upgrades_detailed so add-on labels render.
    const fieldsParam = 'fields=+promotions,+promotions.application_method,+items.total,+items.metadata,+items.adjustments'
    const response = await medusaFetch(`/store/carts/${cartId}?${fieldsParam}`, { method: 'GET' })
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

    const cart = buildStorefrontCartFromMedusaCart(medusaData.cart)

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
