'use client';

import clsx from 'clsx';
import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import LoadingDots from '@components/loading-dots.tsx';
import Price from '@/components/storefront/Price';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
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
import { useCart, type Cart } from './cart-context';
import { DeleteItemButton } from './delete-item-button';
import { EditItemQuantityButton } from './edit-item-quantity-button';

const SHIPPING_STORAGE_KEY = 'fas_checkout_shipping_v1';

type ShippingFormState = Omit<CheckoutShippingInput, 'name' | 'phone' | 'addressLine2' | 'country'> & {
  name: string;
  phone: string;
  addressLine2: string;
  country: string;
  email: string;
};

const EMPTY_SHIPPING: ShippingFormState = {
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

const isBrowser = typeof window !== 'undefined';

function loadStoredShipping(): ShippingFormState {
  if (!isBrowser) return { ...EMPTY_SHIPPING };
  try {
    const raw = window.localStorage.getItem(SHIPPING_STORAGE_KEY);
    if (!raw) return { ...EMPTY_SHIPPING };
    const parsed = JSON.parse(raw);
    return { ...EMPTY_SHIPPING, ...(parsed || {}) };
  } catch {
    return { ...EMPTY_SHIPPING };
  }
}

function persistShipping(data: ShippingFormState) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore localStorage parse errors */
  }
}

function validateShippingForm(form: ShippingFormState): string | null {
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

  return null;
}

function normalizeShippingInput(form: ShippingFormState): CheckoutShippingInput {
  return {
    name: (form.name ?? '').trim(),
    email: form.email.trim(),
    phone: form.phone?.trim() || undefined,
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2?.trim() || undefined,
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    country: (form.country || 'US').toUpperCase()
  };
}

function ratesMatch(a?: CheckoutShippingRate | null, b?: CheckoutShippingRate | null) {
  if (!a || !b) return false;
  const normalize = (value?: string | null) =>
    String(value || '')
      .trim()
      .toLowerCase();
  const amountA = Math.round(Number(a.amount || 0) * 100);
  const amountB = Math.round(Number(b.amount || 0) * 100);
  if (amountA !== amountB) return false;
  const carrierA = normalize(a.carrier);
  const carrierB = normalize(b.carrier);
  if (carrierA && carrierB && carrierA !== carrierB) return false;
  const serviceA = normalize(a.service || a.serviceCode || a.serviceName);
  const serviceB = normalize(b.service || b.serviceCode || b.serviceName);
  if (serviceA && serviceB && serviceA !== serviceB) return false;
  return true;
}

function rateIdentifier(rate: CheckoutShippingRate): string {
  const amount = Number(rate.amount);
  const normalized = [
    rate.carrierId,
    rate.carrier,
    rate.serviceCode,
    rate.service,
    rate.serviceName,
    rate.currency,
    Number.isFinite(amount) ? amount.toFixed(2) : '',
    rate.deliveryDays ?? '',
    rate.estimatedDeliveryDate ?? ''
  ]
    .map((value) => String(value ?? '').trim().toLowerCase());
  const joined = normalized.join('|');
  return joined || JSON.stringify(rate).toLowerCase();
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

const CARRIER_LABELS: Record<string, string> = {
  usps: 'USPS',
  ups: 'UPS',
  fedex: 'FedEx',
  dhl: 'DHL',
  ontrac: 'OnTrac'
};

function humanizeToken(token: string, index: number): string {
  const lower = token.toLowerCase();
  if (CARRIER_LABELS[lower] && index === 0) return CARRIER_LABELS[lower];
  if (CARRIER_LABELS[lower]) return CARRIER_LABELS[lower];
  if (/^\d+(?:st|nd|rd|th)?$/i.test(token)) return token.toUpperCase();
  if (lower === 'us') return 'US';
  if (lower === 'usa') return 'USA';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function humanizeCode(value?: string | null): string {
  if (!value) return '';
  const cleaned = String(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(humanizeToken)
    .join(' ');
}

function buildShippingLabel(rate: CheckoutShippingRate): string {
  const rawService = rate.service || rate.serviceName || rate.serviceCode || 'Shipping';
  const service = humanizeCode(rawService) || 'Shipping';
  const carrier = humanizeCode(rate.carrier || '');
  if (!carrier) return service;
  const serviceLower = service.toLowerCase();
  const carrierLower = carrier.toLowerCase();
  if (serviceLower.startsWith(carrierLower)) return service;
  return `${service} · ${carrier}`;
}

export default function CartModal() {
  const { cart, totalQuantity, subtotal } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'shipping'>('review');
  const [shippingForm, setShippingForm] = useState<ShippingFormState>(() => loadStoredShipping());
  const quantityRef = useRef(totalQuantity);
  const closeCart = () => setIsOpen(false);

  useEffect(() => {
    if (totalQuantity && totalQuantity !== quantityRef.current && totalQuantity > 0) {
      if (!isOpen) setIsOpen(true);
      quantityRef.current = totalQuantity;
    }
  }, [isOpen, totalQuantity]);

  useEffect(() => {
    function handleOpen() {
      setIsOpen(true);
    }
    window.addEventListener('open-cart' as any, handleOpen);
    return () => window.removeEventListener('open-cart' as any, handleOpen);
  }, []);

  // Notify other components when the cart drawer opens or closes
  useEffect(() => {
    try {
      window.dispatchEvent(new Event(isOpen ? 'cart:open' : 'cart:close'));
    } catch {
      /* ignore cart open/close event propagation errors */
    }
  }, [isOpen]);

  useEffect(() => {
    persistShipping(shippingForm);
  }, [shippingForm]);

  useEffect(() => {
    if (!isOpen) {
      setCheckoutStep('review');
    }
  }, [isOpen]);

  return (
    <>
      <Transition show={isOpen}>
        <Dialog onClose={closeCart} className="relative z-[110000]">
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0 backdrop-blur-none"
            enterTo="opacity-100 backdrop-blur-[.5px]"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="opacity-100 backdrop-blur-[.5px]"
            leaveTo="opacity-0 backdrop-blur-none"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="fixed bottom-0 right-0 top-0 flex h-full w-full flex-col overflow-y-auto border-l p-6 backdrop-blur-xl md:w-[390px] border-neutral-700 bg-black/80 text-white">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">
                  {checkoutStep === 'shipping' ? 'Shipping & Contact' : 'My Cart'}
                </p>
                <button aria-label="Close cart" onClick={closeCart}>
                  <CloseCart />
                </button>
              </div>

              {!cart || !cart.items || cart.items.length === 0 ? (
                <div className="mt-20 flex w-full flex-col items-center justify-center overflow-hidden">
                  <ShoppingCartIcon className="h-16 bg-transparent" />
                  <p className="mt-6 text-center text-2xl font-bold">Your cart is empty.</p>
                </div>
              ) : checkoutStep === 'review' ? (
                <CartReview
                  cart={cart}
                  subtotal={subtotal}
                  onProceed={() => setCheckoutStep('shipping')}
                />
              ) : (
                <ShippingStep
                  cart={cart}
                  subtotal={subtotal}
                  form={shippingForm}
                  setForm={setShippingForm}
                  onBack={() => setCheckoutStep('review')}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}

function CloseCart({ className }: { className?: string }) {
  return (
    <div className="relative hover:text-primary flex h-10 w-10 items-center justify-center rounded-lg transition-colors text-white">
      <XMarkIcon className={clsx('h-5 transition-all ease-in-out hover:scale-110', className)} />
    </div>
  );
}

type CartReviewProps = {
  cart: Cart;
  subtotal: number;
  onProceed: () => void;
};

function CartReview({ cart, subtotal, onProceed }: CartReviewProps) {
  return (
    <div className="flex h-full flex-col justify-between overflow-hidden p-1">
      <ul className="grow overflow-auto py-4">
        {cart.items
          .slice()
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
          .map((item, i) => (
            <li
              key={item.id || i}
              className="flex w-full flex-col border-b border-neutral-300 dark:border-neutral-700"
            >
              <div className="relative flex w-full flex-row justify-between px-1 py-4">
                <div className="hover:bg-white/70 absolute z-40 rounded-full bg-black/40 border border-white/20 -ml-1 -mt-5">
                  <DeleteItemButton id={item.id} />
                </div>
                <div className="relative flex-row">
                  <div className="ml-3 relative object-contain w-12 h-12 flex aspect-square overflow-hidden border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || 'Product image'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-neutral-800" />
                    )}
                  </div>
                  <div className="z-30 ml-2 flex flex-row space-x-4">
                    <div className="flex flex-1 flex-col text-base">
                      <span className="leading-tight">{item.name || 'Product'}</span>
                      {item.options && Object.keys(item.options).length > 0 && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {Object.entries(item.options)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex h-16 flex-col justify-between">
                  <Price
                    className="flex justify-end space-y-2 text-right text-sm"
                    amount={(item.price || 0) * (item.quantity || 0)}
                  />
                  <div className="ml-auto flex h-9 flex-row items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-700 px-1">
                    <EditItemQuantityButton item={item} type="minus" />
                    <p className="w-5 h-4 flex items-center justify-center">
                      <span className="text-sm leading-none">{item.quantity}</span>
                    </p>
                    <EditItemQuantityButton item={item} type="plus" />
                  </div>
                </div>
              </div>
            </li>
          ))}
      </ul>
      <div className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
        <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 dark:border-neutral-700">
          <p>Subtotal</p>
          <Price className="text-right text-basetext-white" amount={subtotal} />
        </div>
        <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 pt-1 dark:border-neutral-700">
          <p>Shipping</p>
          <p className="text-right">Calculated after entering address</p>
        </div>
      </div>
      <CheckoutButton onProceed={onProceed} />
    </div>
  );
}

type CheckoutButtonProps = {
  onProceed: () => void;
};

function CheckoutButton({ onProceed }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      await onProceed();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="w-full btn-glass rounded-full bg-primary p-3 text-center text-sm font-medium text-white opacity-90 hover:opacity-100 disabled:opacity-60"
      type="button"
      disabled={loading}
      onClick={onClick}
    >
      {loading ? <LoadingDots className="bg-white" /> : 'Enter Shipping to Continue'}
    </button>
  );
}

type ShippingStepProps = {
  cart: Cart;
  subtotal: number;
  form: ShippingFormState;
  setForm: Dispatch<SetStateAction<ShippingFormState>>;
  onBack: () => void;
};

function ShippingStep({ cart, subtotal, form, setForm, onBack }: ShippingStepProps) {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [freightRequired, setFreightRequired] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [installOnly, setInstallOnly] = useState(false);
  const [installOnlyMessage, setInstallOnlyMessage] = useState<string | null>(null);
  const [rates, setRates] = useState<CheckoutShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<CheckoutShippingRate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetQuoteState = () => {
    setQuoteError(null);
    setFormError(null);
    setFreightRequired(false);
    setMissingItems([]);
    setInstallOnly(false);
    setInstallOnlyMessage(null);
  };

  const cartPayload = cart.items.map((item) => ({ id: item.id, quantity: item.quantity ?? 1 }));

  const requestRates = async () => {
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
        setInstallOnly(false);
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
        setInstallOnly(false);
        setInstallOnlyMessage(null);
        return [];
      }

      if (data?.installOnly) {
        setInstallOnly(true);
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

      setInstallOnly(false);
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
    } catch (err: any) {
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
        shippingRate: rateToUse || undefined
      };
      const result = await redirectToCheckout(payload);
      if (typeof result === 'string') {
        setSubmitError(result);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRates = useMemo(() => dedupeShippingRates(rates), [rates]);
  const destinationSummary = normalizeShippingInput(form);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <button
        type="button"
        className="mb-3 flex w-fit items-center text-sm text-neutral-300 hover:text-white"
        onClick={onBack}
      >
        Back to cart
      </button>

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
                value={form.phone}
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
                value={form.addressLine2}
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
              <input
                name="state"
                value={form.state}
                onChange={handleInputChange}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white focus:border-primary focus:outline-none"
                required
              />
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
              <p className="text-xs text-neutral-400">
                We use your address to pull live shipping rates and taxes from Stripe.
              </p>
            </div>
            <button
              type="submit"
              className="rounded-full border border-white/30 px-3 py-1 text-xs uppercase tracking-wide text-white hover:border-primary"
              disabled={quoteLoading}
            >
              {quoteLoading ? 'Fetching...' : 'Update rates'}
            </button>
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
              This order exceeds parcel limits. Contact sales@fasmotorsports.com to arrange freight
              shipping.
            </div>
          )}

          {installOnly && (
            <div className="rounded-md border border-white/20 bg-white/10 p-3 text-xs text-white">
              {installOnlyMessage ||
                'These items are install-only and do not require shipping. We will coordinate scheduling after checkout.'}
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
                      className="flex flex-wrap gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm hover:border-primary sm:flex-nowrap sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-1 items-start gap-3 min-w-0">
                        <input
                          type="radio"
                          id={id}
                          name="selectedShipping"
                          checked={isSelected}
                          onChange={() => setSelectedRate(rate)}
                        />
                        <div className="min-w-0">
                          <p className="text-white break-words leading-snug">{labelText}</p>
                          {rate.deliveryDays ? (
                            <p className="text-xs text-neutral-400">
                              {rate.deliveryDays}-day estimate
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-white shrink-0">${rate.amount.toFixed(2)}</span>
                    </label>
                  );
                })}
              </fieldset>
            </div>
          )}
        </div>
      </form>

      <div className="mt-4 border-t border-white/10 pt-4 text-sm text-neutral-400">
        <div className="mb-3 flex items-center justify-between">
          <p>Items</p>
          <Price className="text-right text-white" amount={subtotal} />
        </div>
        {selectedRate ? (
          <div className="mb-3 flex items-center justify-between">
            <p>
              Shipping
              <span className="ml-1 text-xs text-neutral-500">
                ({buildShippingLabel(selectedRate)})
              </span>
            </p>
            <span className="text-white">${selectedRate.amount.toFixed(2)}</span>
          </div>
        ) : null}
        <p className="text-xs text-neutral-500">
          Stripe finalizes shipping and taxes using the address above when you complete checkout.
        </p>
        {destinationSummary.city && destinationSummary.state && (
          <p className="mt-2 text-xs text-neutral-500">
            Destination: {destinationSummary.city}, {destinationSummary.state}{' '}
            {destinationSummary.postalCode}
          </p>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting || freightRequired}
          className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-center text-sm font-medium text-white opacity-90 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <LoadingDots className="bg-white" /> : 'Continue to secure payment'}
        </button>
      </div>
    </div>
  );
}
