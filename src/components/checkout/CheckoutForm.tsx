/**
 * Unified Checkout Form
 * Integrates: Stripe Elements + Real-time Shippo Rates
 * Flow: Address → Shipping Rates → Payment (all on same page)
 */
import { useState, useEffect, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe as StripeType } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import './CheckoutForm.css'

// Load Stripe
const stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ShippingRate {
  id: string
  name: string
  carrier: string
  service_code: string
  amount_cents: number
  delivery_days: string
  shippo_rate_id: string
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
  shipping_amount_cents: number
  total_cents: number
  email?: string
}

export default function CheckoutForm() {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [cartId] = useState(() => getOrCreateCartId())

  // Initialize Payment Intent on mount
  useEffect(() => {
    initializePaymentIntent()
  }, [])

  async function initializePaymentIntent() {
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_id: cartId })
      })

      if (!response.ok) {
        throw new Error('Failed to initialize payment')
      }

      const data = await response.json()
      setClientSecret(data.client_secret)
    } catch (error) {
      console.error('Payment Intent creation failed:', error)
      alert('Failed to initialize checkout. Please try again.')
    }
  }

  if (!clientSecret) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Initializing secure checkout...</p>
      </div>
    )
  }

  const stripeOptions = {
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
          border: '1px solid #333',
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
  }

  return (
    <Elements stripe={stripePromise} options={stripeOptions}>
      <CheckoutFormInner cartId={cartId} clientSecret={clientSecret} />
    </Elements>
  )
}

function CheckoutFormInner({
  cartId,
  clientSecret
}: {
  cartId: string
  clientSecret: string
}) {
  const stripe = useStripe()
  const elements = useElements()

  // Cart state
  const [cart, setCart] = useState<Cart | null>(null)
  const [loadingCart, setLoadingCart] = useState(true)

  // Shipping state
  const [shippingAddress, setShippingAddress] = useState<any>(null)
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [loadingRates, setLoadingRates] = useState(false)

  // Payment state
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cart
  useEffect(() => {
    loadCart()
  }, [])

  async function loadCart() {
    try {
      const response = await fetch(`/api/cart/${cartId}`)
      if (!response.ok) throw new Error('Cart not found')

      const data = await response.json()
      setCart(data.cart)
    } catch (error) {
      console.error('Failed to load cart:', error)
      setError('Failed to load cart. Please refresh the page.')
    } finally {
      setLoadingCart(false)
    }
  }

  // Debounced shipping rate fetch
  const fetchShippingRates = useCallback(
    debounce(async (address: any) => {
      if (!isAddressComplete(address)) return

      setLoadingRates(true)
      setError(null)

      try {
        const response = await fetch('/api/shipping-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart_id: cartId,
            address: {
              street1: address.line1,
              street2: address.line2,
              city: address.city,
              state: address.state,
              postal_code: address.postal_code,
              country: address.country
            }
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch shipping rates')
        }

        const data = await response.json()
        setShippingRates(data.rates)

        // Auto-select cheapest rate
        if (data.rates.length > 0) {
          selectShippingRate(data.rates[0])
        } else {
          setError('No shipping options available for this address')
        }
      } catch (error) {
        console.error('Shipping rates error:', error)
        setError('Unable to calculate shipping for this address. Please verify your address.')
        setShippingRates([])
      } finally {
        setLoadingRates(false)
      }
    }, 500),
    [cartId]
  )

  // Handle address change from Stripe Address Element
  function handleAddressChange(event: any) {
    if (event.complete) {
      const address = event.value.address
      setShippingAddress(address)
      fetchShippingRates(address)
    }
  }

  // Select shipping rate and update Payment Intent
  async function selectShippingRate(rate: ShippingRate) {
    if (!cart) return

    setSelectedRateId(rate.id)
    setError(null)

    try {
      const newTotal = cart.subtotal_cents + rate.amount_cents

      // Extract Payment Intent ID from client secret
      const paymentIntentId = clientSecret.split('_secret_')[0]

      const response = await fetch('/api/update-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          amount: newTotal,
          shipping_rate_id: rate.id,
          shipping_amount: rate.amount_cents,
          shippo_rate_id: rate.shippo_rate_id,
          carrier: rate.carrier,
          service_name: rate.name,
          delivery_days: rate.delivery_days
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update payment amount')
      }

      // Update local cart state
      setCart({
        ...cart,
        shipping_amount_cents: rate.amount_cents,
        total_cents: newTotal
      })
    } catch (error) {
      console.error('Failed to update shipping:', error)
      setError('Failed to update shipping. Please try again.')
    }
  }

  // Handle payment submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    if (!selectedRateId) {
      setError('Please select a shipping option')
      return
    }

    if (!shippingAddress) {
      setError('Please enter your shipping address')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmation`,
          shipping: {
            name: shippingAddress.name || 'Customer',
            phone: shippingAddress.phone,
            address: {
              line1: shippingAddress.line1,
              line2: shippingAddress.line2 || '',
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country
            }
          }
        },
        redirect: 'if_required' // Stay on page if no 3DS
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded without redirect
        await completeOrder(paymentIntent.id)

        // Redirect to confirmation
        window.location.href = '/order/confirmation?payment_intent=' + paymentIntent.id
      }
    } catch (error) {
      console.error('Payment error:', error)
      setError('Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  async function completeOrder(paymentIntentId: string) {
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
      // Don't block success page - order will be created via webhook
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

  if (!cart || cart.items.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <p>Add some items to your cart before checking out.</p>
        <a href="/" className="button">Continue Shopping</a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="checkout-grid">
        {/* Left Column: Form */}
        <div className="checkout-main">
          {/* Shipping Address */}
          <section className="checkout-section">
            <h2 className="section-title">Shipping Address</h2>
            <div className="address-element-wrapper">
              <AddressElement
                options={{
                  mode: 'shipping',
                  allowedCountries: ['US'],
                  fields: {
                    phone: 'always'
                  },
                  validation: {
                    phone: {
                      required: 'always'
                    }
                  }
                }}
                onChange={handleAddressChange}
              />
            </div>
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

            {!loadingRates && shippingRates.length === 0 && shippingAddress && !error && (
              <div className="shipping-placeholder">
                <p>Enter a complete address to see shipping options</p>
              </div>
            )}

            {!loadingRates && shippingRates.length > 0 && (
              <div className="shipping-options">
                {shippingRates.map((rate) => (
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
                        <strong className="option-name">{rate.name}</strong>
                        <span className="option-carrier">{rate.carrier}</span>
                        <span className="option-delivery">
                          {rate.delivery_days} business days
                        </span>
                      </div>
                      <div className="option-price">
                        ${(rate.amount_cents / 100).toFixed(2)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="checkout-section">
            <h2 className="section-title">Payment</h2>
            <div className="payment-element-wrapper">
              <PaymentElement
                options={{
                  layout: {
                    type: 'tabs',
                    defaultCollapsed: false
                  }
                }}
              />
            </div>
          </section>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="2"/>
                <path d="M10 6V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!stripe || processing || !selectedRateId}
            className="checkout-button"
          >
            {processing ? (
              <>
                <div className="spinner-small"></div>
                Processing...
              </>
            ) : (
              `Pay ${cart ? `$${(cart.total_cents / 100).toFixed(2)}` : ''}`
            )}
          </button>

          <p className="secure-notice">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L3 3V7C3 10.5 5.5 13.5 8 14C10.5 13.5 13 10.5 13 7V3L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
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
                <span>
                  {selectedRateId
                    ? `$${(cart.shipping_amount_cents / 100).toFixed(2)}`
                    : 'Calculated at next step'}
                </span>
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

// Utility functions
function debounce(fn: Function, delay: number) {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

function isAddressComplete(address: any): boolean {
  return !!(
    address?.line1 &&
    address?.city &&
    address?.state &&
    address?.postal_code &&
    address?.country
  )
}

function getOrCreateCartId(): string {
  // Check for existing cart ID in cookie
  const cookies = document.cookie.split('; ')
  const cartCookie = cookies.find(c => c.startsWith('cart_id='))

  if (cartCookie) {
    return cartCookie.split('=')[1]
  }

  // Generate new cart ID
  const newCartId = 'cart_' + Math.random().toString(36).substr(2, 9)
  document.cookie = `cart_id=${newCartId}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 days
  return newCartId
}
