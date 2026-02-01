/**
 * ShippingSelectorNew - Dark Theme Version
 *
 * Redesigned shipping selector with:
 * - FAS dark theme styling
 * - FAS red selection indicator
 * - Improved visual feedback
 * - Better disabled states
 *
 * Original preserved in checkout-legacy/ShippingSelector.tsx
 */

'use client';

import React, { useState } from 'react';
import type { ShippingOption } from '@/lib/checkout/types';
import { formatCurrency } from '@/lib/checkout/utils';

interface ShippingSelectorNewProps {
  options: ShippingOption[];
  selectedId?: string;
  onSelect: (optionId: string) => void;
  onContinue: () => Promise<void>;
  onEditAddress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function ShippingSelectorNew({
  options,
  selectedId,
  onSelect,
  onContinue,
  onEditAddress,
  disabled = false,
  loading = false
}: ShippingSelectorNewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selectedId || disabled) return;

    setIsSubmitting(true);
    try {
      await onContinue();
    } catch (error) {
      console.error('Shipping application error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="text-lg font-ethno text-white mb-6">Shipping Method</h2>
        <div className="p-6 bg-dark/50 border border-white/10 rounded-lg text-center">
          <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
          <p className="text-white/70 text-sm">Loading shipping options...</p>
        </div>
      </section>
    );
  }

  // No options available
  if (options.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-lg font-ethno text-white mb-6">Shipping Method</h2>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 font-medium">
            No shipping options available for this address.
          </p>
          <p className="text-sm text-amber-300/70 mt-2">
            Please verify your address is correct or contact support.
          </p>
        </div>
        {onEditAddress && (
          <button
            onClick={onEditAddress}
            className="mt-4 text-primary hover:text-primary-hover transition text-sm font-medium"
          >
            ← Edit Address
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-ethno text-white">Shipping Method</h2>
        {onEditAddress && (
          <button
            onClick={onEditAddress}
            className="text-primary hover:text-primary-hover transition text-sm font-medium"
            disabled={disabled}
          >
            Edit Address
          </button>
        )}
      </div>

      {/* Shipping Options */}
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const estimatedDelivery = (option.data as any)?.estimated_delivery ||
                                   (option.metadata as any)?.estimated_delivery;
          const carrier = (option.data as any)?.carrier ||
                         (option.metadata as any)?.carrier;

          return (
            <label
              key={option.id}
              className={`
                flex items-center justify-between p-4 border rounded-lg
                cursor-pointer transition
                ${isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-white/20 hover:border-white/40 bg-dark/30'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Radio Button */}
                <div className="flex-shrink-0">
                  <input
                    type="radio"
                    name="shipping_option"
                    value={option.id}
                    checked={isSelected}
                    onChange={() => !disabled && onSelect(option.id)}
                    disabled={disabled}
                    className="w-4 h-4 text-primary border-white/30 bg-dark/50 focus:ring-primary focus:ring-offset-dark"
                  />
                </div>

                {/* Option Details */}
                <div className="flex-1">
                  <div className="font-medium text-white">{option.name}</div>
                  {carrier && (
                    <div className="text-sm text-white/60 mt-0.5">
                      {carrier}
                    </div>
                  )}
                  {estimatedDelivery && (
                    <div className="text-sm text-white/50 mt-0.5">
                      Est. delivery: {estimatedDelivery}
                    </div>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="font-medium text-white ml-4">
                {option.amount === 0
                  ? 'FREE'
                  : formatCurrency(option.amount, 'usd')
                }
              </div>
            </label>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="mt-6">
        <button
          onClick={handleContinue}
          disabled={!selectedId || disabled || isSubmitting}
          className={`
            w-full rounded-full px-6 py-3 text-base font-medium transition
            ${
              !selectedId || disabled || isSubmitting
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-primary hover:bg-primary-hover text-white'
            }
          `}
        >
          {isSubmitting ? 'Applying...' : 'Continue to Payment'}
        </button>
      </div>

      {/* Helper Text */}
      {!selectedId && !disabled && (
        <p className="text-sm text-white/50 text-center mt-3">
          Please select a shipping method to continue
        </p>
      )}
    </section>
  );
}
