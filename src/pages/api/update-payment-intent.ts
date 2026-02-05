/**
 * Update Payment Intent with Shipping
 * CRITICAL: This enables dynamic shipping with Stripe Elements
 * Updates amount when customer selects shipping option
 */
import type { APIRoute } from 'astro'
import Stripe from 'stripe'

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover'
})

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      payment_intent_id,
      amount,
      shipping_rate_id,
      shipping_amount,
      shippo_rate_id,
      carrier,
      service_name,
      delivery_days
    } = await request.json()

    if (!payment_intent_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'payment_intent_id and amount are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update Payment Intent with new total and shipping metadata
    const updatedIntent = await stripe.paymentIntents.update(payment_intent_id, {
      amount, // New total including shipping
      metadata: {
        shipping_rate_id,
        shipping_amount_cents: shipping_amount?.toString() || '0',
        shippo_rate_id: shippo_rate_id || '',
        carrier: carrier || '',
        service_name: service_name || '',
        delivery_days: delivery_days || ''
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: updatedIntent.id,
        amount: updatedIntent.amount,
        status: updatedIntent.status
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Payment Intent update error:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to update payment intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
