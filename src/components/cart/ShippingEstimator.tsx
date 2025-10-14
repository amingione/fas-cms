'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction
} from 'react';
import {
  redirectToCheckout,
  type CheckoutShippingInput,
  type CheckoutShippingRate
} from './actions';
import Price from '@/components/storefront/Price';
import clsx from 'clsx';
import type { Cart } from './cart-context';
import { buildShippingLabel } from './shipping-label';

type RegionOption = { value: string; label: string };

const REGION_OPTIONS: Record<string, RegionOption[]> = {
  US: [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'DC', label: 'District of Columbia' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
    { value: 'AS', label: 'American Samoa' },
    { value: 'GU', label: 'Guam' },
    { value: 'MP', label: 'Northern Mariana Islands' },
    { value: 'PR', label: 'Puerto Rico' },
    { value: 'VI', label: 'U.S. Virgin Islands' }
  ],
  CA: [
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'ON', label: 'Ontario' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'QC', label: 'Quebec' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'YT', label: 'Yukon' }
  ]
};

const REGION_NAME_MAP: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  'washington dc': 'DC',
  'washington d c': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'american samoa': 'AS',
  guam: 'GU',
  'northern mariana islands': 'MP',
  'puerto rico': 'PR',
  'virgin islands': 'VI',
  'us virgin islands': 'VI',
  'u s virgin islands': 'VI',
  alberta: 'AB',
  'british columbia': 'BC',
  manitoba: 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  newfoundland: 'NL',
  'nova scotia': 'NS',
  'northwest territories': 'NT',
  nunavut: 'NU',
  ontario: 'ON',
  'prince edward island': 'PE',
  quebec: 'QC',
  saskatchewan: 'SK',
  yukon: 'YT'
};

export type ShippingFormState = CheckoutShippingInput & {
  name: string;
  email: string;
  phone?: string;
};

export const EMPTY_SHIPPING: ShippingFormState = {
  name: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US'
};

const SHIPPING_STORAGE_KEY = 'fas_checkout_shipping_v1';

const isBrowser = typeof window !== 'undefined';

export function loadStoredShipping(): ShippingFormState {
  if (!isBrowser) return { ...EMPTY_SHIPPING };
  try {
    const raw = window.localStorage.getItem(SHIPPING_STORAGE_KEY);
    if (!raw) return { ...EMPTY_SHIPPING };
    const parsed = JSON.parse(raw) || {};
    const countryRaw = typeof parsed.country === 'string' ? parsed.country : EMPTY_SHIPPING.country;
    const country = countryRaw.toUpperCase();
    const stateRaw = typeof parsed.state === 'string' ? parsed.state : '';
    const normalizedState = normalizeRegionValue(country, stateRaw);
    return {
      ...EMPTY_SHIPPING,
      ...(parsed as Partial<ShippingFormState>),
      country,
      state: normalizedState
    };
  } catch {
    return { ...EMPTY_SHIPPING };
  }
}

function persistShipping(data: ShippingFormState) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const isAlphaTwo = (value: string) => /^[A-Za-z]{2}$/.test(value);

const normalizeRegionValue = (countryCode: string, rawValue: string): string => {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';
  if (isAlphaTwo(trimmed)) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  const normalizedKey = lower.replace(/[^a-z0-9]+/g, ' ').trim();
  if (REGION_NAME_MAP[normalizedKey]) return REGION_NAME_MAP[normalizedKey];
  if (REGION_NAME_MAP[lower]) return REGION_NAME_MAP[lower];
  const regions = REGION_OPTIONS[countryCode] || [];
  const match = regions.find(
    (option) =>
      option.value.toLowerCase() === lower ||
      option.label.toLowerCase() === lower ||
      option.label.toLowerCase().replace(/\./g, '') === lower
  );
  if (match) return match.value;
  const fallback = normalizedKey || lower;
  return fallback.length >= 2
    ? fallback.slice(0, 2).toUpperCase()
    : trimmed.slice(0, 2).toUpperCase();
};

export function validateShippingForm(form: ShippingFormState): string | null {
  const required: Array<[keyof ShippingFormState, string]> = [
    ['name', 'Full name'],
    ['email', 'Email address'],
    ['addressLine1', 'Address line 1'],
    ['city', 'City'],
    ['state', 'State/Province'],
    ['postalCode', 'Postal code']
  ];

  for (const [field, label] of required) {
    if (!String(form[field] || '').trim()) {
      return `${label} is required.`;
    }
  }

  const email = String(form.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }

  const normalizedCountry = (form.country || 'US').toUpperCase();
  const normalizedState = normalizeRegionValue(normalizedCountry, String(form.state || ''));
  if (!normalizedState || normalizedState.length !== 2) {
    return 'Select a valid state or province.';
  }
  const regions = REGION_OPTIONS[normalizedCountry] || [];
  if (regions.length > 0 && !regions.some((option) => option.value === normalizedState)) {
    return 'Select a valid state or province.';
  }

  return null;
}

export function normalizeShippingInput(form: ShippingFormState): CheckoutShippingInput {
  const normalizedCountry = (form.country || 'US').toUpperCase();
  const normalizedState = normalizeRegionValue(normalizedCountry, String(form.state || ''));
  return {
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2?.trim() || undefined,
    city: form.city.trim(),
    state: normalizedState,
    postalCode: form.postalCode.trim(),
    country: normalizedCountry,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone?.trim() || undefined
  };
}

function rateIdentifier(rate: CheckoutShippingRate | null | undefined) {
  if (!rate) return '';
  const amount = Number(rate.amount || 0);
  return [rate.carrierId, rate.serviceCode, rate.service, rate.serviceName, amount].join('|');
}

function ratesMatch(a?: CheckoutShippingRate | null, b?: CheckoutShippingRate | null) {
  return rateIdentifier(a) === rateIdentifier(b);
}

function dedupeShippingRates(rates: CheckoutShippingRate[]): CheckoutShippingRate[] {
  const seen = new Set<string>();
  return rates.filter((rate) => {
    const identifier = rateIdentifier(rate);
    if (seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
}

type ShippingEstimatorProps = {
  cart: Cart;
  subtotal: number;
  form: ShippingFormState;
  setForm: Dispatch<SetStateAction<ShippingFormState>>;
  showBackButton?: boolean;
  onBack?: () => void;
  variant?: 'modal' | 'embedded' | 'compact';
  className?: string;
};

export function ShippingEstimator({
  cart,
  subtotal,
  form,
  setForm,
  className,
  showBackButton = false,
  onBack,
  variant = 'embedded'
}: ShippingEstimatorProps) {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [freightRequired, setFreightRequired] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [quoteInstallOnly, setQuoteInstallOnly] = useState(false);
  const [installOnlyMessage, setInstallOnlyMessage] = useState<string | null>(null);
  const [rates, setRates] = useState<CheckoutShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<CheckoutShippingRate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const identifyInstallOnly = (item: Cart['items'][number]) => {
    if (item.installOnly === true) return true;
    const cls = (item.shippingClass || '').toString().toLowerCase().replace(/[^a-z]/g, '');
    return cls === 'installonly';
  };

  const cartInstallOnly = useMemo(
    () =>
      cart.items.length > 0 &&
      cart.items.every((item) => {
        return identifyInstallOnly(item);
      }),
    [cart]
  );
  const installOnly = cartInstallOnly || quoteInstallOnly;

  const installOnlyItems = useMemo(
    () => cart.items.filter((item) => identifyInstallOnly(item)),
    [cart]
  );

  const shippableItems = useMemo(
    () => cart.items.filter((item) => !identifyInstallOnly(item)),
    [cart]
  );

  const hasMixedInstallOnly = !installOnly && installOnlyItems.length > 0 && shippableItems.length > 0;

  useEffect(() => {
    if (installOnly) {
      setInstallOnlyMessage(
        (prev) =>
          prev ||
          'These items are install-only and do not require shipping. We will coordinate scheduling after checkout.'
      );
    } else {
      setInstallOnlyMessage(null);
    }
  }, [installOnly]);

  useEffect(() => {
    persistShipping(form);
  }, [form]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const nextValue = typeof value === 'string' ? value : '';

    setForm((prev) => {
      if (name === 'country') {
        const countryCode = nextValue.toUpperCase();
        const regions = REGION_OPTIONS[countryCode] || [];
        const normalizedState = normalizeRegionValue(countryCode, prev.state);
        const keepState = regions.some((option) => option.value === normalizedState);
        return {
          ...prev,
          country: countryCode,
          state: keepState ? normalizedState : ''
        };
      }
      if (name === 'state') {
        const countryCode = (prev.country || 'US').toUpperCase();
        const normalizedState = normalizeRegionValue(countryCode, nextValue);
        return { ...prev, state: normalizedState };
      }
      return { ...prev, [name]: nextValue };
    });
  };

  const resetQuoteState = () => {
    setQuoteError(null);
    setFormError(null);
    setFreightRequired(false);
    setMissingItems([]);
    setQuoteInstallOnly(false);
    setInstallOnlyMessage(null);
  };

  const cartPayload = shippableItems.map((item) => ({
    id: item.id,
    quantity: item.quantity ?? 1
  }));

  const requestRates = async () => {
    if (installOnly) {
      setQuoteError(null);
      setFormError(null);
      setQuoteLoading(false);
      return [];
    }

    const validationError = validateShippingForm(form);
    if (validationError) {
      setFormError(validationError);
      return null;
    }

    resetQuoteState();
    setQuoteLoading(true);

    try {
      const destination = normalizeShippingInput(form);
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cartPayload, destination })
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data?.error || data?.message || 'Failed to fetch shipping rates.';
        setQuoteError(message);
        setRates([]);
        setSelectedRate(null);
        setQuoteInstallOnly(false);
        setInstallOnlyMessage(null);
        return null;
      }

      if (data?.freight) {
        setFreightRequired(true);
        setRates([]);
        setSelectedRate(null);
        setQuoteError(
          'This order requires a freight quote. Please contact support to complete your purchase.'
        );
        setQuoteInstallOnly(false);
        setInstallOnlyMessage(null);
        return [];
      }

      if (data?.installOnly) {
        setQuoteInstallOnly(true);
        setInstallOnlyMessage(
          typeof data?.message === 'string'
            ? data.message
            : 'These items are install-only and do not require shipping. We will coordinate scheduling after checkout.'
        );
        setRates([]);
        setSelectedRate(null);
        setMissingItems(Array.isArray(data?.missing) ? data.missing : []);
        setQuoteError(null);
        return [];
      }

      setQuoteInstallOnly(false);
      setInstallOnlyMessage(null);

      const received: CheckoutShippingRate[] = Array.isArray(data?.rates) ? data.rates : [];
      setRates(received);
      setMissingItems(Array.isArray(data?.missing) ? data.missing : []);

      const previous = selectedRate;
      const nextSelected =
        received.find((rate) => ratesMatch(rate, previous)) || received[0] || null;
      setSelectedRate(nextSelected);
      setQuoteError(null);
      return received;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch shipping rates.';
      setQuoteError(message);
      setRates([]);
      setSelectedRate(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleGetRates = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (installOnly) return;
    await requestRates();
  };

  const handleContinue = async () => {
    setSubmitError(null);
    const validationError = validateShippingForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    let rateToUse = selectedRate;
    if (!rateToUse && !freightRequired && !quoteError && !installOnly) {
      const fetched = await requestRates();
      if (fetched && fetched.length) {
        rateToUse = fetched[0];
      }
    }

    if (freightRequired) {
      setFormError('Freight shipment required. Contact support to arrange delivery.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shipping: normalizeShippingInput(form),
        ...(installOnly ? {} : { shippingRate: rateToUse || undefined })
      };
      const result = await redirectToCheckout(payload);
      if (typeof result === 'string') {
        setSubmitError(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRates = useMemo(() => dedupeShippingRates(rates), [rates]);
  const regionOptions = useMemo(
    () => REGION_OPTIONS[(form.country || '').toUpperCase()] || [],
    [form.country]
  );
  const showRegionSelect = regionOptions.length > 0;
  const destinationSummary = normalizeShippingInput(form);

  const containerClasses = clsx('flex h-full flex-col overflow-hidden', className);

  if (installOnly) {
    return (
      <div className={clsx('flex h-full flex-col overflow-hidden', className)}>
        {showBackButton && (
          <button
            type="button"
            className="mb-3 flex w-fit items-center text-sm text-neutral-300 hover:text-white"
            onClick={onBack}
          >
            Back to cart
          </button>
        )}
        <div className="rounded-md border border-white/20 bg-white/10 p-4 text-sm text-white">
          {installOnlyMessage ||
            'These items are install-only and do not require shipping. We will coordinate scheduling after checkout.'}
        </div>
        <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-4 text-xs text-white/70">
          Once you submit your order we will reach out to schedule installation.
        </div>
        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting}
          className="mt-6 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Processing…' : 'Continue to Checkout'}
        </button>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {showBackButton && (
        <button
          type="button"
          className="mb-3 flex w-fit items-center text-sm text-neutral-300 hover:text-white"
          onClick={onBack}
        >
          Back to cart
        </button>
      )}

      <form className="flex-1 overflow-y-auto pr-1" onSubmit={handleGetRates}>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                Full name
              </span>
              <input
                name="name"
                value={form.name}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                Phone (optional)
              </span>
              <input
                name="phone"
                value={form.phone || ''}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                Address line 1
              </span>
              <input
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                Address line 2
              </span>
              <input
                name="addressLine2"
                value={form.addressLine2 || ''}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="Apartment, suite, etc."
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">City</span>
              <input
                name="city"
                value={form.city}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                State / Province
              </span>
              {showRegionSelect ? (
                <select
                  name="state"
                  value={form.state}
                  onChange={handleInputChange}
                  className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">Select...</option>
                  {regionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="state"
                  value={form.state}
                  onChange={handleInputChange}
                  className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                  maxLength={2}
                  required
                />
              )}
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                Postal code
              </span>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Country</span>
              <select
                name="country"
                value={form.country}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">Enter address for shipping rates.</p>
            </div>
            {!installOnly && (
              <button
                type="submit"
                className="btn-glass rounded-full border border-white/30 px-2 py-1 text-[11px] uppercase tracking-wide text-white hover:border-primary sm:px-3 sm:py-1 sm:text-xs"
                disabled={quoteLoading}
              >
                {quoteLoading ? 'Fetching...' : 'Update rates'}
              </button>
            )}
          </div>

          {formError && <p className="text-xs text-red-400">{formError}</p>}
          {quoteError && (
            <p className="text-xs text-amber-300">
              {quoteError} {rates.length === 0 ? 'Defaults will be shown on Stripe checkout.' : ''}
            </p>
          )}
          {submitError && <p className="text-xs text-red-400">{submitError}</p>}
          {missingItems.length > 0 && (
            <p className="text-xs text-amber-300">
              Missing product data for: {missingItems.join(', ')}
            </p>
          )}
          {freightRequired && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-200">
              This order exceeds parcel limits. Contact orders@fasmotorsports.com to arrange freight
              shipping.
            </div>
          )}

          {installOnly && (
            <div className="rounded-md border border-white/20 bg-white/10 p-3 text-xs text-white">
              {installOnlyMessage ||
                'These items are install-only and do not require shipping. We will coordinate scheduling after checkout.'}
            </div>
          )}

          {hasMixedInstallOnly && (
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              Install-only services in your cart will be coordinated separately and do not add to shipping charges shown here.
            </div>
          )}

          {displayRates.length > 0 && !freightRequired && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">Available shipping methods</p>
              <fieldset className="space-y-2">
                {displayRates.map((rate, idx) => {
                  const id = `shipping-${idx}`;
                  const isSelected = ratesMatch(rate, selectedRate);
                  const key = rateIdentifier(rate) || `rate-${idx}`;
                  const labelText = buildShippingLabel(rate);
                  return (
                    <label
                      key={key}
                      className={clsx(
                        'flex flex-wrap gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm hover:border-primary sm:flex-nowrap sm:items-center sm:justify-between',
                        {
                          'border-primary bg-black/50': isSelected
                        }
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          id={id}
                          type="radio"
                          name="shippingRate"
                          value={key}
                          checked={isSelected}
                          onChange={() => setSelectedRate(rate)}
                          className="mt-1 text-primary focus:ring-primary"
                        />
                        <div className="min-w-0">
                          <p className="text-white break-words leading-snug">{labelText}</p>
                          {rate.deliveryDays ? (
                            <p className="text-xs text-white/60">
                              {rate.deliveryDays}-day estimate
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <Price amount={rate.amount} className="text-sm font-semibold text-white" />
                    </label>
                  );
                })}
              </fieldset>
            </div>
          )}
        </div>
      </form>

      <div className="mt-3 space-y-3">
        <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-neutral-300">
          <p>
            <span className="font-semibold text-white">Ship to:</span>{' '}
            {destinationSummary.addressLine1}
            {destinationSummary.addressLine2 ? `, ${destinationSummary.addressLine2}` : ''},{' '}
            {destinationSummary.city}, {destinationSummary.state} {destinationSummary.postalCode}{' '}
            {destinationSummary.country}
          </p>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Starting checkout…' : 'Continue to Checkout'}
        </button>
      </div>
    </div>
  );
}
