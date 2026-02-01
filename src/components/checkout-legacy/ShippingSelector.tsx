'use client';

import React, { useState } from 'react';
import type { ShippingOption } from '@/lib/checkout/types';
import { formatCurrency } from '@/lib/checkout/utils';

interface ShippingSelectorProps {
  options: ShippingOption[];
  selectedOptionId?: string;
  currencyCode: string;
  onSelect: (optionId: string) => void;
  onContinue: () => Promise<void>;
  onEditAddress?: () => void;
  disabled?: boolean;
}

export default function ShippingSelector({
  options,
  selectedOptionId,
  currencyCode,
  onSelect,
  onContinue,
  onEditAddress,
  disabled = false
}: ShippingSelectorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selectedOptionId) return;

    setIsSubmitting(true);
    try {
      await onContinue();
    } catch (error) {
      console.error('Shipping application error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (options.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Shipping Method</h2>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
            No shipping options available for this address.
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Please verify your address is correct or contact support.
          </p>
        </div>
        {onEditAddress && (
          <button
            onClick={onEditAddress}
            className="text-blue-600 hover:underline"
          >
            ← Edit Address
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shipping Method</h2>
        {onEditAddress && (
          <button
            onClick={onEditAddress}
            className="text-blue-600 hover:underline text-sm"
            disabled={disabled}
          >
            Edit Address
          </button>
        )}
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition ${
              selectedOptionId === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                name="shipping_option"
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => !disabled && onSelect(option.id)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium">{option.name}</div>
                {option.data?.carrier && (
                  <div className="text-sm text-gray-600">
                    {option.data.carrier}
                  </div>
                )}
                {option.data?.estimated_delivery && (
                  <div className="text-sm text-gray-500">
                    Est. delivery: {option.data.estimated_delivery}
                  </div>
                )}
              </div>
            </div>
            <div className="font-medium">
              {formatCurrency(option.amount, currencyCode)}
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedOptionId || disabled || isSubmitting}
        className={`w-full py-3 px-4 rounded-md font-medium ${
          !selectedOptionId || disabled || isSubmitting
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isSubmitting ? 'Applying...' : 'Continue to Payment'}
      </button>

      {!selectedOptionId && (
        <p className="text-sm text-gray-600 text-center">
          Please select a shipping method to continue
        </p>
      )}
    </div>
  );
}
