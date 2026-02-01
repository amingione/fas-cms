/**
 * AddressFormNew - Dark Theme Version
 *
 * Redesigned address form with FAS dark theme styling
 * - Dark backgrounds with white text
 * - FAS red primary colors
 * - Improved visual hierarchy
 *
 * Original preserved in checkout-legacy/AddressForm.tsx
 */

'use client';

import React, { useState } from 'react';
import type { AddressFormData } from '@/lib/checkout/types';

interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => Promise<void>;
  disabled?: boolean;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

export default function AddressFormNew({
  initialData,
  onSubmit,
  disabled = false
}: AddressFormProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    email: initialData?.email || '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    address_1: initialData?.address_1 || '',
    address_2: initialData?.address_2 || '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    postal_code: initialData?.postal_code || '',
    country_code: initialData?.country_code || 'US',
    phone: initialData?.phone || ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressFormData, string>> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.address_1.trim()) newErrors.address_1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.province.trim()) newErrors.province = 'State is required';
    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.postal_code)) {
      newErrors.postal_code = 'Invalid ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Address submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof AddressFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Common input classes (dark theme)
  const inputClasses = (hasError?: boolean) => `
    w-full px-3 py-2 rounded-md text-white
    bg-dark/50 border
    ${hasError ? 'border-red-500/50' : 'border-white/20'}
    placeholder:text-white/40
    focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-dark focus:outline-none
    transition
    ${disabled ? 'opacity-50 cursor-not-allowed bg-dark/30' : ''}
  `.trim();

  const labelClasses = 'block text-sm font-medium text-white mb-2';
  const errorClasses = 'text-red-400 text-xs mt-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Information Section */}
      <section>
        <h2 className="text-lg font-ethno text-white mb-6">Contact Information</h2>

        <div>
          <label htmlFor="email" className={labelClasses}>
            Email address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={disabled}
            autoComplete="email"
            className={inputClasses(!!errors.email)}
            placeholder="you@example.com"
          />
          {errors.email && <p className={errorClasses}>{errors.email}</p>}
        </div>
      </section>

      {/* Shipping Address Section */}
      <section>
        <h2 className="text-lg font-ethno text-white mb-6">Shipping Address</h2>

        <div className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className={labelClasses}>
                First name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={disabled}
                autoComplete="given-name"
                className={inputClasses(!!errors.first_name)}
              />
              {errors.first_name && (
                <p className={errorClasses}>{errors.first_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="last_name" className={labelClasses}>
                Last name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={disabled}
                autoComplete="family-name"
                className={inputClasses(!!errors.last_name)}
              />
              {errors.last_name && (
                <p className={errorClasses}>{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label htmlFor="address_1" className={labelClasses}>
              Address
            </label>
            <input
              type="text"
              id="address_1"
              name="address_1"
              value={formData.address_1}
              onChange={handleChange}
              disabled={disabled}
              autoComplete="street-address"
              className={inputClasses(!!errors.address_1)}
            />
            {errors.address_1 && (
              <p className={errorClasses}>{errors.address_1}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div>
            <label htmlFor="address_2" className={labelClasses}>
              Apartment, suite, etc. <span className="text-white/50">(optional)</span>
            </label>
            <input
              type="text"
              id="address_2"
              name="address_2"
              value={formData.address_2}
              onChange={handleChange}
              disabled={disabled}
              className={inputClasses()}
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label htmlFor="city" className={labelClasses}>
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={disabled}
                autoComplete="address-level2"
                className={inputClasses(!!errors.city)}
              />
              {errors.city && <p className={errorClasses}>{errors.city}</p>}
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="province" className={labelClasses}>
                State
              </label>
              <select
                id="province"
                name="province"
                value={formData.province}
                onChange={handleChange}
                disabled={disabled}
                autoComplete="address-level1"
                className={inputClasses(!!errors.province)}
              >
                <option value="">Select</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              {errors.province && (
                <p className={errorClasses}>{errors.province}</p>
              )}
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="postal_code" className={labelClasses}>
                ZIP code
              </label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                disabled={disabled}
                autoComplete="postal-code"
                className={inputClasses(!!errors.postal_code)}
              />
              {errors.postal_code && (
                <p className={errorClasses}>{errors.postal_code}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelClasses}>
              Phone <span className="text-white/50">(optional)</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={disabled}
              autoComplete="tel"
              className={inputClasses()}
            />
          </div>
        </div>
      </section>

      {/* Submit Button */}
      <div className="pt-6 border-t border-white/10">
        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className={`
            w-full rounded-full px-6 py-3 text-base font-medium transition
            ${
              disabled || isSubmitting
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-primary hover:bg-primary-hover text-white'
            }
          `}
        >
          {isSubmitting ? 'Saving...' : 'Continue to Shipping'}
        </button>
      </div>
    </form>
  );
}
