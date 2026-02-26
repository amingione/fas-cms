import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import './CheckoutForm.css'
import { ensureMedusaCartId, getCart, syncMedusaCart } from '@/lib/cart'
import { MEDUSA_CART_ID_KEY } from '@/lib/medusa'

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
  thumbnail?: string | null
  variant_title?: string | null
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

function formatCurrency(cents: number | null | undefined): string {
  const value = typeof cents === 'number' ? cents : 0
  return `$${(value / 100).toFixed(2)}`
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
  const [discountCode, setDiscountCode] = useState('')

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
          if (!cancelled) setCartId(recoveredId)
        }
      } catch (err) {
        console.error('Checkout init failed:', err)
        if (!cancelled) setError('Failed to load cart. Please refresh the page.')
      } finally {
        if (!cancelled) setLoadingCart(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadCart(id: string): Promise<boolean> {
    const response = await fetch(`/api/cart/${id}`)
    if (response.status === 404) return false
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
    if (!freshCartId) throw new Error('Unable to create replacement cart')

    await syncMedusaCart(getCart())
    const loaded = await loadCart(freshCartId)
    if (!loaded) throw new Error('Replacement cart was not found')

    return freshCartId
  }

  const updateAddressField =
    (field: keyof ShippingAddress) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      await loadCart(cartId)
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

  const cartCount = useMemo(
    () => (cart?.items || []).reduce((sum, p) => sum + Number(p.quantity || 0), 0),
    [cart]
  )

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
    <div className="checkout-v2">
      <div className="checkout-v2-header">
        <h2>Checkout</h2>
        <span>{cartCount} item{cartCount === 1 ? '' : 's'}</span>
      </div>

      <div className="checkout-v2-grid">
        <div className="checkout-v2-summary">
          {cart.items.map((product) => (
            <div key={product.id} className="checkout-v2-item">
              <div className="checkout-v2-image-wrap">
                <img
                  src={product.thumbnail || '/images/demos/ecommerce_01.jpg'}
                  alt={product.title}
                  className="checkout-v2-image"
                />
                <span className="checkout-v2-qty">{product.quantity}</span>
              </div>
              <div className="checkout-v2-item-body">
                <div>
                  <p className="checkout-v2-name">{product.title}</p>
                  <p className="checkout-v2-variant">{product.variant_title || 'Default'}</p>
                </div>
                <p className="checkout-v2-price">{formatCurrency(product.total)}</p>
              </div>
            </div>
          ))}

          <div className="checkout-v2-discount">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Discount code"
            />
            <button type="button">Apply</button>
          </div>

          <div className="checkout-v2-totals">
            <div><span>Subtotal</span><span>{formatCurrency(cart.subtotal_cents)}</span></div>
            <div><span>Shipping</span><span>{formatCurrency(cart.shipping_amount_cents)}</span></div>
            <div><span>Taxes</span><span>{formatCurrency(cart.tax_amount_cents ?? 0)}</span></div>
            <div className="final"><span>Total</span><span>{formatCurrency(cart.total_cents)}</span></div>
          </div>
        </div>

        <div className="checkout-v2-pay">
          {clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night' as const,
                  variables: {
                    colorPrimary: '#dc2626',
                    colorBackground: '#0f0f0f',
                    colorText: '#ffffff'
                  }
                }
              }}
            >
              <StripePaymentPane
                cartId={cartId}
                cart={cart}
                shippingAddress={shippingAddress}
                selectedRateId={selectedRateId}
                processing={processing}
                setProcessing={setProcessing}
                setError={setError}
              />
            </Elements>
          ) : (
            <NonReadyPaymentPane
              shippingAddress={shippingAddress}
              loadingRates={loadingRates}
              shippingRates={shippingRates}
              selectedRateId={selectedRateId}
              selectedShippoRate={selectedShippoRate}
              onAddressChange={updateAddressField}
              onCalculateShipping={handleCalculateShipping}
              onSelectRate={selectShippingRate}
            />
          )}

          {error && (
            <p className="checkout-v2-error">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function NonReadyPaymentPane({
  shippingAddress,
  loadingRates,
  shippingRates,
  selectedRateId,
  selectedShippoRate,
  onAddressChange,
  onCalculateShipping,
  onSelectRate
}: {
  shippingAddress: ShippingAddress
  loadingRates: boolean
  shippingRates: ShippingRate[]
  selectedRateId: string | null
  selectedShippoRate: ShippoRate | null
  onAddressChange: (field: keyof ShippingAddress) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onCalculateShipping: () => Promise<void>
  onSelectRate: (rate: ShippingRate) => Promise<void>
}) {
  return (
    <>
      <button type="button" className="checkout-v2-pay-top" onClick={() => void onCalculateShipping()}>
        Pay
      </button>

      <div className="checkout-v2-divider">Or pay another way</div>

      <label>Email</label>
      <input value={shippingAddress.email} onChange={onAddressChange('email')} placeholder="mail@example.com" />

      <label>Shipping address</label>
      <div className="checkout-v2-address-grid">
        <input value={shippingAddress.firstName} onChange={onAddressChange('firstName')} placeholder="First name" />
        <input value={shippingAddress.lastName} onChange={onAddressChange('lastName')} placeholder="Last name" />
        <input value={shippingAddress.address1} onChange={onAddressChange('address1')} placeholder="Address line 1" className="span-2" />
        <input value={shippingAddress.address2} onChange={onAddressChange('address2')} placeholder="Address line 2" className="span-2" />
        <input value={shippingAddress.city} onChange={onAddressChange('city')} placeholder="City" />
        <input value={shippingAddress.province} onChange={onAddressChange('province')} placeholder="State / Province" />
        <input value={shippingAddress.postalCode} onChange={onAddressChange('postalCode')} placeholder="Postal code" />
        <input value={shippingAddress.phone} onChange={onAddressChange('phone')} placeholder="Phone" />
      </div>

      <label>Country or region</label>
      <select value={shippingAddress.countryCode.toUpperCase()} onChange={onAddressChange('countryCode')}>
        <option value="US">United States</option>
        <option value="CA">Canada</option>
        <option value="GB">United Kingdom</option>
        <option value="AU">Australia</option>
        <option value="DE">Germany</option>
        <option value="JP">Japan</option>
        <option value="IN">India</option>
      </select>

      <button type="button" className="checkout-v2-calc" onClick={() => void onCalculateShipping()} disabled={loadingRates}>
        {loadingRates ? 'Calculating...' : 'Calculate shipping'}
      </button>

      <label>Shipping method</label>
      <div className="checkout-v2-rates">
        {shippingRates.length === 0 ? (
          <p className="muted">Enter shipping info and calculate rates to continue.</p>
        ) : (
          shippingRates.map((rate) => {
            const amount = resolveShippingOptionAmountCents(rate)
            return (
              <button
                type="button"
                key={rate.id}
                className={`rate ${selectedRateId === rate.id ? 'selected' : ''}`}
                onClick={() => void onSelectRate(rate)}
              >
                <span>{rate.name || rate.data?.service_name || 'Shipping option'}</span>
                <span>{formatCurrency(amount ?? 0)}</span>
              </button>
            )
          })
        )}
      </div>

      {selectedShippoRate && (
        <p className="muted">Live Shippo UPS quote: {selectedShippoRate.servicelevel || 'UPS'} {selectedShippoRate.amount} {selectedShippoRate.currency}</p>
      )}

      <label>Card information</label>
      <div className="checkout-v2-card-placeholder">Select shipping to initialize Stripe payment form.</div>

      <label>Name on card</label>
      <input value={`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()} readOnly />

      <button type="button" className="checkout-v2-pay-bottom" onClick={() => void onCalculateShipping()}>
        Pay
      </button>
    </>
  )
}

function StripePaymentPane({
  cartId,
  cart,
  shippingAddress,
  selectedRateId,
  processing,
  setProcessing,
  setError
}: {
  cartId: string
  cart: Cart
  shippingAddress: ShippingAddress
  selectedRateId: string | null
  processing: boolean
  setProcessing: (value: boolean) => void
  setError: (value: string | null) => void
}) {
  const stripe = useStripe()
  const elements = useElements()

  const submit = async () => {
    if (!stripe || !elements) return

    if (!selectedRateId) {
      setError('Please select a shipping option')
      return
    }

    if (!isAddressComplete(shippingAddress)) {
      setError('Please complete shipping address before paying')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmation`,
          receipt_email: shippingAddress.email || cart.email,
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
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        const completion = await completeOrder(cartId, paymentIntent.id)
        if (!completion.ok) {
          setError(completion.error || 'Payment captured but order completion failed. Please retry.')
          return
        }
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
    <>
      <button type="button" className="checkout-v2-pay-top" disabled={processing || !stripe} onClick={() => void submit()}>
        {processing ? 'Processing...' : 'Pay'}
      </button>

      <div className="checkout-v2-divider">Or pay another way</div>

      <label>Email</label>
      <input value={shippingAddress.email || cart.email || ''} readOnly />

      <label>Card information</label>
      <div className="checkout-v2-payment-element">
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false
            }
          }}
        />
      </div>

      <label>Name on card</label>
      <input value={`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()} readOnly />

      <label>Country or region</label>
      <input value={shippingAddress.countryCode.toUpperCase()} readOnly />

      <button type="button" className="checkout-v2-pay-bottom" disabled={processing || !stripe} onClick={() => void submit()}>
        {processing ? 'Processing...' : 'Pay'}
      </button>
    </>
  )
}

async function completeOrder(cartId: string, paymentIntentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('/api/complete-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart_id: cartId,
        payment_intent_id: paymentIntentId
      })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      return { ok: false, error: payload?.error || 'Order completion failed.' }
    }

    return { ok: true }
  } catch (error) {
    console.error('Order completion warning:', error)
    return { ok: false, error: 'Order completion failed.' }
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
