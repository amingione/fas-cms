import fs from 'fs/promises'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { redirectToCheckout } from '../src/components/cart/actions'
import { POST as shippingQuoteHandler } from '../src/pages/api/shipping/quote'
import { POST as checkoutHandler } from '../src/pages/api/checkout'


describe('redirectToCheckout helper', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates to /checkout without calling fetch', async () => {
    const fakeWindow = {
      location: {
        href: ''
      }
    }
    vi.stubGlobal('window', fakeWindow as any)
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => null } as any)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as any)

    await redirectToCheckout()

    expect(fakeWindow.location.href).toBe('/checkout')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('shipping quote API', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when shipping address is missing', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ items: [{ quantity: 1 }] })
    })
    const response = await shippingQuoteHandler({ request } as any)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/address/i)
  })

  it('returns available rates for a valid address', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: [{ id: 'r1', provider: 'easypost', carrier: 'UPS', service: 'Ground', amountCents: 500, currency: 'USD' }] })
    })
    vi.stubGlobal('fetch', fetchMock as any)

    const request = new Request('https://example.com', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        items: [{ quantity: 1, sku: 'sku1' }],
        address: {
          line1: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
          country: 'US'
        }
      })
    })

    const response = await shippingQuoteHandler({ request } as any)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rates).toHaveLength(1)
    expect(body.rates[0].id).toBe('r1')
  })
})

describe('checkout API validation', () => {
  it('rejects requests without selectedRate', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        cart: [{ id: 'item-1', name: 'Widget', price: 1000, quantity: 1 }],
        shippingAddress: {
          addressLine1: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
          country: 'US'
        }
      })
    })

    const response = await checkoutHandler({ request } as any)
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error).toBe('Validation failed')
  })
})

describe('checkout API file', () => {
  it('never references label purchase helpers', async () => {
    const file = await fs.readFile(new URL('../src/pages/api/checkout.ts', import.meta.url), 'utf-8')
    expect(file).not.toMatch(/create-shipping-label/i)
    expect(file).not.toMatch(/easypostCreateLabel/i)
  })
})
