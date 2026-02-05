/**
 * Get Cart Data
 * Fetches cart from Medusa for checkout display
 */
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ params }) => {
  try {
    const cartId = params.id

    if (!cartId) {
      return new Response(
        JSON.stringify({ error: 'Cart ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch cart from Medusa
    const medusaUrl = import.meta.env.MEDUSA_API_URL || 'http://localhost:9000'
    const response = await fetch(`${medusaUrl}/store/carts/${cartId}`)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Cart not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const medusaData = await response.json()

    // Transform Medusa cart to our format
    const cart = {
      id: medusaData.cart.id,
      items: medusaData.cart.items.map((item: any) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      })),
      subtotal_cents: medusaData.cart.subtotal,
      shipping_amount_cents: medusaData.cart.shipping_total || 0,
      total_cents: medusaData.cart.total,
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
