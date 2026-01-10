'use client'

import React from 'react'
import CheckoutPage from './CheckoutPage'
import { CartProvider } from '@/components/cart/cart-context'

const CheckoutPageApp: React.FC = () => (
  <CartProvider>
    <CheckoutPage />
  </CartProvider>
)

export default CheckoutPageApp
