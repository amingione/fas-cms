/**
 * Fetch Real-time Shippo Shipping Rates
 * Called when address is complete to show UPS options
 */
import type { APIRoute } from 'astro'
import { Shippo, type Rate } from 'shippo'

const shippo = new Shippo({
  apiKeyHeader: import.meta.env.SHIPPO_API_KEY!
})

// FAS warehouse address (from environment variables)
const FROM_ADDRESS = {
  name: 'FAS Motorsports',
  street1: import.meta.env.WAREHOUSE_ADDRESS_LINE1 || '6161 Riverside Dr',
  street2: import.meta.env.WAREHOUSE_ADDRESS_LINE2 || '',
  city: import.meta.env.WAREHOUSE_CITY || 'Punta Gorda',
  state: import.meta.env.WAREHOUSE_STATE || 'FL',
  zip: import.meta.env.WAREHOUSE_ZIP || '33982',
  country: 'US',
  phone: import.meta.env.WAREHOUSE_PHONE || '812-200-9012',
  email: import.meta.env.WAREHOUSE_EMAIL || 'orders@updates.fasmotorsports.com'
}

// UPS services we want to offer (in display order)
const UPS_SERVICES = [
  { code: 'ups_ground', name: 'UPS Ground' },
  { code: 'ups_3_day_select', name: 'UPS 3-Day Select' },
  { code: 'ups_2nd_day_air', name: 'UPS 2nd Day Air' },
  { code: 'ups_next_day_air', name: 'UPS Next Day Air' }
]

export const POST: APIRoute = async ({ request }) => {
  try {
    const { cart_id, address } = await request.json()

    if (!cart_id || !address) {
      return new Response(
        JSON.stringify({ error: 'cart_id and address are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch cart from Medusa
    const medusaUrl = import.meta.env.MEDUSA_API_URL || 'http://localhost:9000'
    const cartResponse = await fetch(`${medusaUrl}/store/carts/${cart_id}`)

    if (!cartResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Cart not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { cart } = await cartResponse.json()

    // Calculate total package weight and dimensions
    const packageDetails = calculatePackageDetails(cart.items)

    // Create Shippo shipment to get rates
    const shipment = await shippo.shipments.create({
      addressFrom: FROM_ADDRESS,
      addressTo: {
        name: address.name || 'Customer',
        street1: address.street1,
        street2: address.street2 || '',
        city: address.city,
        state: address.state,
        zip: address.postal_code,
        country: address.country
      },
      parcels: [{
        length: packageDetails.length.toString(),
        width: packageDetails.width.toString(),
        height: packageDetails.height.toString(),
        distanceUnit: 'in',
        weight: packageDetails.weight.toString(),
        massUnit: 'lb'
      }],
      async: false // Wait for rates synchronously
    })

    const rates = shipment.rates as Rate[] | undefined

    if (!rates || rates.length === 0) {
      return new Response(
        JSON.stringify({
          rates: [],
          message: 'No shipping rates available for this address'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Filter for UPS rates only and map to our format
    const upsRates = rates
      .filter((rate: Rate) => rate.provider === 'UPS')
      .filter((rate: Rate) => UPS_SERVICES.some(s => s.code === rate.servicelevel.token))
      .map((rate: Rate, index: number) => {
        const service = UPS_SERVICES.find(s => s.code === rate.servicelevel.token)
        return {
          id: `rate_${index + 1}`,
          name: service?.name || rate.servicelevel.name || 'UPS Service',
          carrier: 'UPS',
          service_code: rate.servicelevel.token,
          amount_cents: Math.round(parseFloat(rate.amount) * 100),
          delivery_days: rate.estimatedDays?.toString() || rate.durationTerms || 'N/A',
          shippo_rate_id: rate.objectId
        }
      })
      // Sort by price (cheapest first)
      .sort((a, b) => a.amount_cents - b.amount_cents)

    return new Response(
      JSON.stringify({ rates: upsRates }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Shipping rates error:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch shipping rates',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Calculate package dimensions and weight from cart items
 * TODO: Fetch actual dimensions from Sanity product data
 */
function calculatePackageDetails(items: any[]) {
  // Default package size for typical automotive parts
  // These should be calculated based on actual product dimensions from Sanity
  const totalWeight = items.reduce((sum, item) => {
    const itemWeight = item.metadata?.weight_lbs || 5 // Default 5 lbs per item
    return sum + (itemWeight * item.quantity)
  }, 0)

  return {
    length: 12, // inches
    width: 12,
    height: 8,
    weight: Math.max(totalWeight, 1) // Minimum 1 lb
  }
}
