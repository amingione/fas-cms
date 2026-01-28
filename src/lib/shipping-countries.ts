import type Stripe from 'stripe';

export type AllowedCountryCodes =
  Stripe.Checkout.SessionCreateParams.ShippingAddressCollection['allowed_countries'];

const DEFAULT_ALLOWED_COUNTRIES: AllowedCountryCodes = ['US'];

export function resolveAllowedCountries(): AllowedCountryCodes {
  return DEFAULT_ALLOWED_COUNTRIES;
}
