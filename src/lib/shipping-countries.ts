export type AllowedCountryCodes = string[];

const DEFAULT_ALLOWED_COUNTRIES: AllowedCountryCodes = ['US'];

export function resolveAllowedCountries(): AllowedCountryCodes {
  return DEFAULT_ALLOWED_COUNTRIES;
}
