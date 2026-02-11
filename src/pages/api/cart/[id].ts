/**
 * Get Cart Data
 * Fetches cart from Medusa for checkout display
 */
import type { APIRoute } from 'astro'
import { medusaFetch, readJsonSafe } from '@/lib/medusa'
import { normalizeCartTotals, toCentsStrict } from '@/lib/money'

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
        quantity: item.quantity,
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
