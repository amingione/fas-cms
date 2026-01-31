'use client';

import React from 'react';
import type { MedusaCart } from '@/lib/checkout/types';
import { formatCurrency } from '@/lib/checkout/utils';

interface OrderSummaryProps {
  cart: MedusaCart;
  isLocked?: boolean;
}

export default function OrderSummary({ cart, isLocked = false }: OrderSummaryProps) {
  const hasShipping = cart.shipping_methods && cart.shipping_methods.length > 0;
  const hasTax = typeof cart.tax_total === 'number';

  return (
    <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
      <h2 className="text-xl font-bold mb-4">Order Summary</h2>

      {isLocked && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium">
            🔒 Your order is secured for payment
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Line Items */}
        <div className="space-y-3 pb-4 border-b">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-start space-x-3">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
              </div>
              <div className="font-medium text-sm">
                {formatCurrency(item.total, cart.currency_code)}
              </div>
            </div>
          ))}
        </div>

        {/* Totals Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-medium">
              {formatCurrency(cart.subtotal, cart.currency_code)}
            </span>
          </div>

          {cart.discount_total && cart.discount_total > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span className="font-medium">
                -{formatCurrency(cart.discount_total, cart.currency_code)}
              </span>
            </div>
          )}

          {hasShipping ? (
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-medium">
                {formatCurrency(cart.shipping_total || 0, cart.currency_code)}
              </span>
            </div>
          ) : (
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span className="text-sm">Calculated at checkout</span>
            </div>
          )}

          {hasTax ? (
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="font-medium">
                {formatCurrency(cart.tax_total || 0, cart.currency_code)}
              </span>
            </div>
          ) : (
            <div className="flex justify-between text-gray-500">
              <span>Tax</span>
              <span className="text-sm">Calculated at checkout</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold">
              {formatCurrency(cart.total, cart.currency_code)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
