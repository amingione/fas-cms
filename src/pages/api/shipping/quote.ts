import type { APIRoute } from 'astro'
import { resolveSanityFunctionsBaseUrl } from '@/lib/sanity-functions'
import type { CheckoutAddress } from '@/checkout/checkoutState'
import { validateAddress } from '@/checkout/checkoutState'

type ShippingQuoteItem = { sku?: string; productId?: string; quantity: number }
type ShippingQuoteRequest = {
  items: ShippingQuoteItem[]
  address?: CheckoutAddress | null
}

type ShippingQuoteResponse = {
  rates: Array<{
    id: string
    provider: 'easypost'
    carrier: string
    service: string
    amountCents: number
    currency: string
    estDays?: number
  }>
}

type ShippingQuoteRate = ShippingQuoteResponse['rates'][number]

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let payload: ShippingQuoteRequest
  try {
    payload = (await request.json()) as ShippingQuoteRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400)
  }

  const items = Array.isArray(payload.items) ? payload.items : []
  const hasItems = items.some((item) => typeof item.quantity === 'number' && item.quantity > 0)
  if (!hasItems) {
    return jsonResponse({ error: 'Cart items are required' }, 400)
  }

  const address = payload.address
  if (!address || !validateAddress(address)) {
    return jsonResponse({ error: 'Shipping address is required' }, 400)
  }

  const baseUrl = resolveSanityFunctionsBaseUrl()
  try {
    const response = await fetch(`${baseUrl}/.netlify/functions/getShippingQuoteBySkus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: items, destination: address }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body?.error) {
      return jsonResponse({ error: body?.error || 'Failed to retrieve shipping rates' }, 502)
    }
    const incomingRates = Array.isArray(body?.rates) ? (body.rates as unknown[]) : []
    const normalizedRates = incomingRates
      .map((rate): ShippingQuoteRate | null => {
        const rawAmount = Number((rate as any).amount ?? (rate as any).price ?? 0)
        const amountCents = Math.max(0, Math.round((Number.isFinite(rawAmount) ? rawAmount : 0) * 100))
        if (!Number.isFinite(amountCents)) return null
        const carrier = ((rate as any).carrier || (rate as any).provider || 'Shipping').toString().trim()
        const service = ((rate as any).service || (rate as any).serviceCode || 'Standard').toString().trim()
        const id = (
          (rate as any).rateId || (rate as any).id || `${carrier}-${service}-${amountCents}`
        ).toString()
        const estDays = Number.isFinite(Number((rate as any).deliveryDays ?? NaN))
          ? Number((rate as any).deliveryDays)
          : undefined
        return {
          id,
          provider: 'easypost',
          carrier: carrier || 'Shipping',
          service: service || 'Shipping',
          amountCents,
          currency: ((rate as any).currency || 'USD').toString().toUpperCase(),
          estDays,
        }
      })
      .filter((entry): entry is ShippingQuoteRate => entry !== null)

    return jsonResponse({ rates: normalizedRates })
  } catch (error) {
    console.error('shipping quote error', error)
    return jsonResponse({ error: 'Unable to fetch shipping rates' }, 502)
  }
}
