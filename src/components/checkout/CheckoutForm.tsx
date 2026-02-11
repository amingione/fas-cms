/**
 * Unified Checkout Form
 * Integrates: Stripe Elements (PaymentIntent) + Medusa shipping rates (Shippo)
 * Flow: Address → Medusa shipping options → Payment (all on same page)
 */
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import './CheckoutForm.css'
import { ensureMedusaCartId, getCart, syncMedusaCart } from '@/lib/cart'
import { MEDUSA_CART_ID_KEY } from '@/lib/medusa'

// Load Stripe
const stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ShippingRate {
  id: string
  name?: string
  amount?: number
  calculated_price?: number
  price_type?: string
  data?: Record<string, any>
  region?: { currency_code?: string }
}

type ShippoRate = {
  rate_id: string
  amount: string
  currency: string
  provider?: string
  servicelevel?: string
  estimated_days?: number | null
}
interface CartItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
}

interface Cart {
  id: string
  items: CartItem[]
  subtotal_cents: number
  tax_amount_cents?: number
  shipping_amount_cents: number
  total_cents: number
  email?: string
}

type ShippingAddress = {
  email: string
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  province: string
  postalCode: string
  countryCode: string
  phone: string
}

const EMPTY_ADDRESS: ShippingAddress = {
  email: '',
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  province: '',
  postalCode: '',
  countryCode: 'US',
  phone: ''
}

function toDisplayCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : Math.round(value * 100)
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return null
    if (/^-?\d+$/.test(normalized)) {
      const parsed = Number.parseInt(normalized, 10)
      return Number.isFinite(parsed) ? parsed : null
    }
    if (/^-?\d+(\.\d+)?$/.test(normalized)) {
      const parsed = Number.parseFloat(normalized)
      return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
    }
  }

  return null
}

function resolveShippingOptionAmountCents(rate: ShippingRate): number | null {
  const direct =
    toDisplayCents(rate.calculated_price) ??
    toDisplayCents(rate.amount) ??
    toDisplayCents((rate as any)?.price) ??
    toDisplayCents((rate as any)?.value)
  if (typeof direct === 'number') return direct

  const calculatedPrice = (rate as any)?.calculated_price
  if (calculatedPrice && typeof calculatedPrice === 'object') {
    const nested =
      toDisplayCents((calculatedPrice as any)?.amount) ??
      toDisplayCents((calculatedPrice as any)?.calculated_amount) ??
      toDisplayCents((calculatedPrice as any)?.calculated_price?.amount) ??
      toDisplayCents((calculatedPrice as any)?.calculated_price?.calculated_amount)
    if (typeof nested === 'number') return nested
  }

  const priceSet = (rate as any)?.calculated_price_set
  if (priceSet && typeof priceSet === 'object') {
    const setAmount =
      toDisplayCents((priceSet as any)?.calculated_amount?.value) ??
      toDisplayCents((priceSet as any)?.calculated_amount) ??
      toDisplayCents((priceSet as any)?.amount?.value) ??
      toDisplayCents((priceSet as any)?.amount)
    if (typeof setAmount === 'number') return setAmount
  }

  return null
}

export default function CheckoutForm() {
  const [cartId, setCartId] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [loadingCart, setLoadingCart] = useState(true)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(EMPTY_ADDRESS)
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [selectedShippoRate, setSelectedShippoRate] = useState<ShippoRate | null>(null)
  const [loadingRates, setLoadingRates] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const id = await ensureMedusaCartId()
        if (cancelled) return
        setCartId(id)
        if (!id) return

        await syncMedusaCart(getCart())
        const loaded = await loadCart(id)
        if (!loaded) {
          const recoveredId = await recoverMissingCart()
          if (!cancelled) {
            setCartId(recoveredId)
          }
        }
      } catch (err) {
        console.error('Checkout init failed:', err)
        if (!cancelled) {
          setError('Failed to load cart. Please refresh the page.')
        }
      } finally {
        if (!cancelled) {
          setLoadingCart(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadCart(id: string): Promise<boolean> {
    const response = await fetch(`/api/cart/${id}`)
    if (response.status === 404) {
      return false
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || 'Cart fetch failed')
    }

    const data = await response.json()
    setCart(data.cart)
    return true
  }

  async function recoverMissingCart(): Promise<string> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MEDUSA_CART_ID_KEY)
    }

    const freshCartId = await ensureMedusaCartId()
    if (!freshCartId) {
      throw new Error('Unable to create replacement cart')
    }

    await syncMedusaCart(getCart())
    const loaded = await loadCart(freshCartId)
    if (!loaded) {
      throw new Error('Replacement cart was not found')
    }

    return freshCartId
  }

  const updateAddressField = (field: keyof ShippingAddress) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setShippingAddress((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleCalculateShipping() {
    if (!cartId) return
    if (!isAddressComplete(shippingAddress)) {
      setError('Please complete your shipping address before calculating rates.')
      return
    }

    setLoadingRates(true)
    setError(null)
    setClientSecret(null)

    try {
      await syncMedusaCart(getCart())

      const updateResponse = await fetch('/api/medusa/cart/update-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          email: shippingAddress.email,
          shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2,
            city: shippingAddress.city,
            province: shippingAddress.province,
            postalCode: shippingAddress.postalCode,
            countryCode: shippingAddress.countryCode,
            phone: shippingAddress.phone
          }
        })
      })

      if (!updateResponse.ok) {
        const payload = await updateResponse.json().catch(() => null)
        throw new Error(payload?.error || 'Unable to save delivery address.')
      }

      const optionsResponse = await fetch('/api/medusa/cart/shipping-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId })
      })

      const data = await optionsResponse.json().catch(() => null)
      if (!optionsResponse.ok) {
        throw new Error(data?.error || 'Unable to calculate delivery rates.')
      }

      const options = Array.isArray(data?.shippingOptions) ? data.shippingOptions : []
      setShippingRates(options)
      setSelectedRateId(null)
      setSelectedShippoRate(
        data?.bestShippoRate && typeof data.bestShippoRate === 'object' ? data.bestShippoRate : null
      )
    } catch (err) {
      console.error('Shipping rates error:', err)
      setError('Unable to calculate shipping for this address. Please verify your address.')
      setShippingRates([])
      setSelectedShippoRate(null)
    } finally {
      setLoadingRates(false)
    }
  }

  async function selectShippingRate(rate: ShippingRate) {
    if (!cartId) return
    setSelectedRateId(rate.id)
    setError(null)
    setClientSecret(null)

    try {
      await syncMedusaCart(getCart())

      const response = await fetch('/api/medusa/cart/select-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          optionId: rate.id,
          shippoRate: selectedShippoRate
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to apply shipping option')
      }

      await loadCart(cartId)

      const intentResponse = await fetch('/api/medusa/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId })
      })
      if (!intentResponse.ok) {
        const payload = await intentResponse.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to initialize payment')
      }
      const payload = await intentResponse.json().catch(() => null)
      if (!payload?.client_secret) {
        throw new Error('Payment intent not ready')
      }
      setClientSecret(payload.client_secret)
    } catch (err) {
      console.error('Failed to update shipping:', err)
      setError('Failed to update shipping. Please try again.')
    }
  }

  if (loadingCart) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Loading your cart...</p>
      </div>
    )
  }

  if (!cartId || !cart || cart.items.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <p>Add some items to your cart before checking out.</p>
        <a href="/" className="button">Continue Shopping</a>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="checkout-form">
      <div className="checkout-grid">
        {/* Left Column: Form */}
        <div className="checkout-main">
          {/* Shipping Address */}
          <section className="checkout-section">
            <h2 className="section-title">Shipping Address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="email"
                placeholder="Email"
                value={shippingAddress.email}
                onChange={updateAddressField('email')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={shippingAddress.phone}
                onChange={updateAddressField('phone')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="First name"
                value={shippingAddress.firstName}
                onChange={updateAddressField('firstName')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Last name"
                value={shippingAddress.lastName}
                onChange={updateAddressField('lastName')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Address line 1"
                value={shippingAddress.address1}
                onChange={updateAddressField('address1')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Address line 2"
                value={shippingAddress.address2}
                onChange={updateAddressField('address2')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white sm:col-span-2"
              />
              <input
                type="text"
                placeholder="City"
                value={shippingAddress.city}
                onChange={updateAddressField('city')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="State / Province"
                value={shippingAddress.province}
                onChange={updateAddressField('province')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Postal code"
                value={shippingAddress.postalCode}
                onChange={updateAddressField('postalCode')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Country (2-letter code)"
                value={shippingAddress.countryCode}
                onChange={updateAddressField('countryCode')}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleCalculateShipping}
              disabled={loadingRates}
              className="mt-3 inline-flex items-center justify-center rounded bg-primary px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {loadingRates ? 'Calculating rates...' : 'Calculate shipping'}
            </button>
          </section>

          {/* Shipping Rates */}
          <section className="checkout-section">
            <h2 className="section-title">Shipping Method</h2>

            {loadingRates && (
              <div className="shipping-loading">
                <div className="spinner-small"></div>
                <p>Calculating shipping rates...</p>
              </div>
            )}

            {!loadingRates && shippingRates.length === 0 && !error && (
              <div className="shipping-placeholder">
                <p>Enter a complete address to see shipping options</p>
              </div>
            )}

            {!loadingRates && shippingRates.length > 0 && (
              <div className="shipping-options">
                {shippingRates.map((rate) => (
                  (() => {
                    const amountCents = resolveShippingOptionAmountCents(rate)
                    return (
                  <label
                    key={rate.id}
                    className={`shipping-option ${
                      selectedRateId === rate.id ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={rate.id}
                      checked={selectedRateId === rate.id}
                      onChange={() => selectShippingRate(rate)}
                    />
                    <div className="option-content">
                      <div className="option-details">
                        <strong className="option-name">{rate.name || 'Shipping option'}</strong>
                        <span className="option-carrier">{rate.data?.carrier || 'Carrier'}</span>
                        <span className="option-delivery">{rate.price_type || 'calculated'}</span>
                      </div>
                      <div className="option-price">
                        {typeof amountCents === 'number' ? `$${(amountCents / 100).toFixed(2)}` : '—'}
                      </div>
                    </div>
                  </label>
                    )
                  })()
                ))}
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="checkout-section">
            <h2 className="section-title">Payment</h2>
            {clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night' as const,
                    variables: {
                      colorPrimary: '#dc2626',
                      colorBackground: '#0a0a0a',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      fontFamily: 'system-ui, sans-serif',
                      spacingUnit: '4px',
                      borderRadius: '8px'
                    },
                    rules: {
                      '.Input': {
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333'
                      },
                      '.Input:focus': {
                        border: '1px solid #dc2626',
                        boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)'
                      },
                      '.Label': {
                        color: '#999',
                        fontWeight: '500'
                      }
                    }
                  }
                }}
              >
                <PaymentSection
                  shippingAddress={shippingAddress}
                  cartId={cartId}
                  setError={setError}
                  processing={processing}
                  setProcessing={setProcessing}
                  selectedRateId={selectedRateId}
                />
              </Elements>
            ) : (
              <p className="text-sm text-white/70">
                Select a shipping option to initialize secure payment.
              </p>
            )}
          </section>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="2" />
                <path d="M10 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <p className="secure-notice">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L3 3V7C3 10.5 5.5 13.5 8 14C10.5 13.5 13 10.5 13 7V3L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Secure checkout powered by Stripe
          </p>
        </div>

        {/* Right Column: Order Summary */}
        <div className="checkout-sidebar">
          <div className="order-summary">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-items">
              {cart.items.map((item) => (
                <div key={item.id} className="summary-item">
                  <div className="item-details">
                    <span className="item-name">{item.title}</span>
                    <span className="item-quantity">Qty: {item.quantity}</span>
                  </div>
                  <span className="item-price">
                    ${(item.total / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>${(cart.subtotal_cents / 100).toFixed(2)}</span>
              </div>

              <div className="total-row">
                <span>Shipping</span>
                <span>{selectedRateId ? `$${(cart.shipping_amount_cents / 100).toFixed(2)}` : ''}</span>
              </div>

              <div className="total-row">
                <span>Tax</span>
                <span>${(((cart.tax_amount_cents as number) ?? 0) / 100).toFixed(2)}</span>
              </div>

              <div className="total-row total-final">
                <span>Total</span>
                <span className="total-amount">
                  ${(cart.total_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function PaymentSection({
  shippingAddress,
  cartId,
  setError,
  processing,
  setProcessing,
  selectedRateId
}: {
  shippingAddress: ShippingAddress
  cartId: string
  setError: (value: string | null) => void
  processing: boolean
  setProcessing: (value: boolean) => void
  selectedRateId: string | null
}) {
  const stripe = useStripe()
  const elements = useElements()

  async function handleSubmit() {
    if (!stripe || !elements) return
    if (!selectedRateId) {
      setError('Please select a shipping option')
      return
    }
    if (!isAddressComplete(shippingAddress)) {
      setError('Please enter your shipping address')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmation`,
          shipping: {
            name:
              `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() ||
              'Customer',
            phone: shippingAddress.phone,
            address: {
              line1: shippingAddress.address1,
              line2: shippingAddress.address2 || '',
              city: shippingAddress.city,
              state: shippingAddress.province,
              postal_code: shippingAddress.postalCode,
              country: shippingAddress.countryCode
            }
          }
        },
        redirect: 'if_required'
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await completeOrder(cartId, paymentIntent.id)
        window.location.href = '/order/confirmation?payment_intent=' + paymentIntent.id
      }
    } catch (error) {
      console.error('Payment error:', error)
      setError('Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="payment-element-wrapper">
      <PaymentElement
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false
          }
        }}
      />
      <button
        type="button"
        disabled={!stripe || processing}
        className="checkout-button mt-4"
        onClick={handleSubmit}
      >
        {processing ? (
          <>
            <div className="spinner-small"></div>
            Processing...
          </>
        ) : (
          'Pay now'
        )}
      </button>
    </div>
  )
}

async function completeOrder(cartId: string, paymentIntentId: string) {
  try {
    await fetch('/api/complete-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart_id: cartId,
        payment_intent_id: paymentIntentId
      })
    })
  } catch (error) {
    console.error('Order completion warning:', error)
  }
}

function isAddressComplete(address: ShippingAddress): boolean {
  return !!(
    address.address1 &&
    address.city &&
    address.province &&
    address.postalCode &&
    address.countryCode &&
    address.email
  )
}
