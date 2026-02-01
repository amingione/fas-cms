/**
 * OrderSummaryNew - Dark Theme Sticky Sidebar
 *
 * Redesigned order summary with:
 * - Sticky positioning on desktop
 * - Mobile popover (future enhancement)
 * - FAS dark theme styling
 * - Clean visual hierarchy
 *
 * Original preserved in checkout-legacy/OrderSummary.tsx
 */

'use client';

import React from 'react';
import type { MedusaCart } from '@/lib/checkout/types';
import { formatCurrency } from '@/lib/checkout/utils';

interface OrderSummaryProps {
  cart: MedusaCart;
  isLocked?: boolean;
}

export default function OrderSummaryNew({ cart, isLocked = false }: OrderSummaryProps) {
  const hasShipping = cart.shipping_methods && cart.shipping_methods.length > 0;
  const hasTax = typeof cart.tax_total === 'number';

  return (
    <div className="lg:sticky lg:top-8">
      {/* Header */}
      <h2 className="text-lg font-ethno text-white mb-6">Order Summary</h2>

      {/* Locked Indicator */}
      {isLocked && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-sm text-emerald-400 font-medium flex items-center gap-2">
            <span>🔒</span>
            <span>Your order is secured for payment</span>
          </p>
        </div>
      )}

      {/* Line Items */}
      <div className="space-y-4 pb-6 border-b border-white/10">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-start gap-4">
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-20 h-20 flex-none object-cover rounded-md bg-white/5"
              />
            )}
            <div className="flex-auto space-y-1">
              <div className="font-medium text-sm text-white">{item.title}</div>

              {/* Selected Options */}
              {(item as any).metadata?.selected_options &&
                (item as any).metadata.selected_options.length > 0 && (
                <div className="text-xs text-white/60">
                  {(item as any).metadata.selected_options.join(', ')}
                </div>
              )}

              {/* Quantity */}
              <div className="text-sm text-white/60">Qty: {item.quantity}</div>
            </div>

            {/* Price */}
            <div className="flex-none text-base font-medium text-white">
              {typeof item.total === 'number' && item.total >= 0
                ? formatCurrency(item.total, cart.currency_code)
                : <span className="text-red-400 text-sm">Price unavailable</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Totals Breakdown - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:block space-y-6 border-t border-white/10 pt-6 text-sm">
        <div className="space-y-4">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <dt className="text-white/70">Subtotal</dt>
            <dd className="font-medium text-white">
              {formatCurrency(cart.subtotal, cart.currency_code)}
            </dd>
          </div>

          {/* Discount */}
          {cart.discount_total && cart.discount_total > 0 && (
            <div className="flex items-center justify-between text-emerald-400">
              <dt>Discount</dt>
              <dd className="font-medium">
                -{formatCurrency(cart.discount_total, cart.currency_code)}
              </dd>
            </div>
          )}

          {/* Shipping */}
          {hasShipping ? (
            <div className="flex items-center justify-between">
              <dt className="text-white/70">Shipping</dt>
              <dd className="font-medium text-white">
                {formatCurrency(cart.shipping_total || 0, cart.currency_code)}
              </dd>
            </div>
          ) : (
            <div className="flex items-center justify-between text-white/50">
              <dt>Shipping</dt>
              <dd className="text-sm">Calculated at checkout</dd>
            </div>
          )}

          {/* Tax */}
          {hasTax ? (
            <div className="flex items-center justify-between">
              <dt className="text-white/70">Taxes</dt>
              <dd className="font-medium text-white">
                {formatCurrency(cart.tax_total || 0, cart.currency_code)}
              </dd>
            </div>
          ) : (
            <div className="flex items-center justify-between text-white/50">
              <dt>Taxes</dt>
              <dd className="text-sm">Calculated at checkout</dd>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <dt className="text-base font-ethno text-white">Total</dt>
          <dd className="text-base font-bold text-white">
            {formatCurrency(cart.total, cart.currency_code)}
          </dd>
        </div>
      </div>

      {/* Mobile Popover - TODO: Implement with Headless UI */}
      {/* For now, show simplified total on mobile */}
      <div className="lg:hidden border-t border-white/10 pt-6 mt-6">
        <div className="flex items-center justify-between">
          <span className="text-base font-ethno text-white">Total</span>
          <span className="text-base font-bold text-white">
            {formatCurrency(cart.total, cart.currency_code)}
          </span>
        </div>
        <p className="text-xs text-white/50 mt-2">
          Tap for breakdown
        </p>
      </div>
    </div>
  );
}
