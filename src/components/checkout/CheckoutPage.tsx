'use client'

import React, { useEffect, useMemo, useReducer, useCallback } from 'react'
import { useCart } from '@/components/cart/cart-context'
import { formatPrice } from '@/components/storefront/Price'
import type { CheckoutRate, CheckoutStatus, CheckoutAddress } from '@/checkout/checkoutState'
import {
  checkoutReducer,
  validateAddress,
  initialCheckoutState,
} from '@/checkout/checkoutState'

const STATUS_LABELS: Record<CheckoutStatus, string> = {
  CART_READY: 'Review your cart before beginning checkout.',
  CHECKOUT_ADDRESS_REQUIRED: 'Enter a shipping address to continue.',
  ADDRESS_VALID: 'Address looks good. Get shipping rates.',
  RATES_LOADING: 'Fetching live shipping rates …',
  RATES_READY: 'Shipping rates are ready to review.',
  RATE_SELECTED: 'Rate selected. Ready to pay.',
  PAYMENT_CREATING: 'Creating a secure payment session …',
  PAYMENT_REDIRECTING: 'Redirecting to Stripe Checkout …',
  ERROR: 'Something went wrong. Please try again.',
}

type NormalizedCartItem = {
  sku?: string
  productId?: string
  quantity: number
}

type ShippingQuotePayload = {
  items: NormalizedCartItem[]
  address: CheckoutAddress
}

const CheckoutPage: React.FC = () => {
  const { cart, subtotal } = useCart()
  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState)

  useEffect(() => {
    dispatch({ type: 'START_CHECKOUT' })
  }, [])

  const cartItems = cart.items || []
  const cartHasItems = cartItems.length > 0
  const normalizedCartItems = useMemo<NormalizedCartItem[]>(() => {
    const entries = cartItems.map((item): NormalizedCartItem | null => {
      const quantity = Number(item?.quantity || 0)
      if (!Number.isFinite(quantity) || quantity <= 0) return null
      return {
        sku: typeof item.sku === 'string' ? item.sku : undefined,
        productId: typeof item.productId === 'string' ? item.productId : undefined,
        quantity,
      }
    })
    return entries.filter((entry): entry is NormalizedCartItem => entry !== null)
  }, [cartItems])

  const totalWithShipping = useMemo(() => {
    const shipping = state.selectedRate ? state.selectedRate.amountCents / 100 : 0
    return (subtotal || 0) + shipping
  }, [subtotal, state.selectedRate])

  const handleAddressField = useCallback(
    (field: keyof CheckoutAddress, value: string) => {
      dispatch({
        type: 'ADDRESS_UPDATED',
        payload: {
          ...state.address,
          [field]: value,
        },
      })
    },
    [state.address],
  )

  const requestRates = async () => {
    if (!cartHasItems) return
    if (!validateAddress(state.address)) {
      dispatch({ type: 'ADDRESS_VALIDATED_FAIL', payload: { message: 'Please complete the shipping address before requesting rates.' } })
      return
    }
    dispatch({ type: 'ADDRESS_VALIDATED_OK' })
    dispatch({ type: 'REQUEST_RATES' })
    try {
      const payload: ShippingQuotePayload = {
        items: normalizedCartItems,
        address: state.address,
      }
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = body?.error || 'Unable to fetch shipping rates right now.'
        throw new Error(message)
      }
      const incomingRates = Array.isArray(body?.rates) ? (body.rates as unknown[]) : []
      const normalizedRates = incomingRates
        .map((rate): CheckoutRate | null => {
          const partialRate = rate as Partial<CheckoutRate>
          const rawAmount = Number((rate as any).amount || 0)
          const amountCents = Math.max(
            0,
            partialRate.amountCents ?? Math.round((Number.isFinite(rawAmount) ? rawAmount : 0) * 100),
          )
          if (!Number.isFinite(amountCents)) {
            return null
          }
          const carrier = (partialRate.carrier || 'Shipping').trim()
          const service = (partialRate.service || 'Standard').trim()
          const id = partialRate.id || `${carrier}-${service}-${amountCents}`
          if (!id) return null
          const estDays =
            Number.isFinite(Number(partialRate.estDays ?? NaN)) ? Number(partialRate.estDays) : undefined
          return {
            id,
            provider: 'easypost',
            carrier,
            service,
            amountCents,
            currency: (partialRate.currency || 'USD').toUpperCase(),
            estDays,
          }
        })
        .filter((rate): rate is CheckoutRate => rate !== null && Number.isFinite(rate.amountCents))
      if (!normalizedRates.length) {
        throw new Error('No shipping rates were returned for this address.')
      }
      dispatch({ type: 'RATES_SUCCESS', payload: { rates: normalizedRates } })
    } catch (err: any) {
      dispatch({ type: 'RATES_FAIL', payload: { message: err?.message || 'Unable to fetch shipping rates.' } })
    }
  }

  const handlePay = async () => {
    if (!state.selectedRate || !cartHasItems) return
    dispatch({ type: 'CREATE_PAYMENT_SESSION' })
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cartItems, address: state.address, selectedRate: state.selectedRate }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body?.url) {
        throw new Error(body?.error || 'Unable to create payment session.')
      }
      dispatch({ type: 'PAYMENT_SESSION_SUCCESS' })
      window.location.href = body.url
    } catch (err: any) {
      dispatch({ type: 'PAYMENT_SESSION_FAIL', payload: { message: err?.message || 'Failed to create payment session.' } })
    }
  }

  const resetError = () => {
    dispatch({ type: 'RESET_ERROR' })
  }

  const statusMessage = STATUS_LABELS[state.status]

  return (
    <section className="min-h-screen bg-dark text-white px-4 py-16">
      <div className="mx-auto max-w-6xl space-y-10">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">Secure Checkout</p>
          <h1 className="mt-2 text-4xl font-bold text-white">Complete your order</h1>
          <p className="mt-1 text-sm text-white/70">Shipping rates are locked after you select a carrier.</p>
        </div>

        {!cartHasItems ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
            <p>Your cart is empty. Add items before checking out.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white">Cart items</h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-dark/50 p-4"
                  >
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-white/60">Qty {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-white">{formatPrice(item.price ?? 0)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{formatPrice(subtotal || 0)}</span>
              </div>
              {state.selectedRate && (
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Shipping ({state.selectedRate.carrier})</span>
                  <span className="font-semibold text-white">
                    {formatPrice(state.selectedRate.amountCents / 100)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(totalWithShipping)}</span>
              </div>
            </div>

            <div className="space-y-6 rounded-3xl border border-white/10 bg-dark/50 p-6">
              <div className="space-y-1">
                <p className="text-sm text-white/60">Status</p>
                <p className="text-base font-semibold text-white">{statusMessage}</p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wide text-white/60">Address line 1</label>
                <input
                  value={state.address.line1}
                  onChange={(event) => handleAddressField('line1', event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wide text-white/60">Address line 2</label>
                <input
                  value={state.address.line2 || ''}
                  onChange={(event) => handleAddressField('line2', event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-xs uppercase tracking-wide text-white/60">City</label>
                  <input
                    value={state.address.city}
                    onChange={(event) => handleAddressField('city', event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs uppercase tracking-wide text-white/60">State</label>
                  <input
                    value={state.address.state}
                    onChange={(event) => handleAddressField('state', event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-xs uppercase tracking-wide text-white/60">Postal code</label>
                  <input
                    value={state.address.postalCode}
                    onChange={(event) => handleAddressField('postalCode', event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs uppercase tracking-wide text-white/60">Country</label>
                  <input
                    value={state.address.country}
                    onChange={(event) => handleAddressField('country', event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={requestRates}
                disabled={state.status === 'RATES_LOADING' || !validateAddress(state.address)}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.status === 'RATES_LOADING' ? 'Requesting rates…' : 'Get shipping rates'}
              </button>

              {state.rates.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Shipping options</h3>
                  <div className="space-y-2">
                    {state.rates.map((rate) => {
                      const price = formatPrice(rate.amountCents / 100)
                      const isSelected = state.selectedRate?.id === rate.id
                      return (
                        <button
                          key={rate.id}
                          type="button"
                          onClick={() => dispatch({ type: 'SELECT_RATE', payload: rate })}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${isSelected ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-dark/60 text-white/70'}`}
                        >
                          <div>
                            <p className="font-semibold text-white">
                              {rate.carrier} · {rate.service}
                            </p>
                            <p className="text-xs text-white/60">Est. {rate.estDays ?? '3-7'} day(s)</p>
                          </div>
                          <span className="font-semibold text-white">{price}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={!state.selectedRate || state.status === 'PAYMENT_CREATING'}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.status === 'PAYMENT_CREATING' ? 'Preparing payment…' : 'Pay with Stripe'}
              </button>

              {state.error && (
                <div className="rounded-2xl border border-red-500/50 bg-red-600/10 p-4 text-sm text-red-200">
                  <p>{state.error}</p>
                  <button type="button" onClick={resetError} className="mt-2 text-xs font-semibold uppercase text-red-400">
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default CheckoutPage
