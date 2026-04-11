import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type ChangeEvent,
  type FormEvent
} from 'react';
import { loadStripe, type PaymentRequest } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useElements,
  useStripe
} from '@stripe/react-stripe-js';
import './CheckoutForm.css';
import { abandonCheckout, ensureMedusaCartId, getCart, persistCartLocally, syncMedusaCart } from '@/lib/cart';
import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';

const CHECKOUT_IMAGE_FALLBACK = '/placeholder.webp';
const CHECKOUT_DISCOUNT_STATE_KEY = 'fas_checkout_discount_state_v1';

interface ShippingRate {
  id: string;
  name?: string;
  amount?: number;
  calculated_price?: number;
  price_type?: string;
  data?: Record<string, any>;
  region?: { currency_code?: string };
}

type SelectableShippingRate = {
  id: string;
  optionId: string;
  label: string;
  amountCents: number;
  shippingData?: Record<string, any>;
};

interface CartItem {
  id: string;
  local_item_id?: string | null;
  medusa_variant_id?: string | null;
  medusa_line_item_id?: string | null;
  title: string;
  thumbnail?: string | null;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  install_only?: boolean;
  shipping_class?: string | null;
}

interface Discount {
  code: string;
  description?: string;
  amount?: number; // cents
  rule?: {
    type?: string;
    value?: number;
    description?: string;
  };
}

interface Cart {
  id: string;
  items: CartItem[];
  subtotal_cents: number;
  tax_amount_cents?: number;
  shipping_amount_cents: number;
  discount_amount_cents?: number;
  applied_discount_codes?: string[];
  discounts?: Discount[]; // Add full discount details
  total_cents: number;
  email?: string;
}

type LocalCartItem = ReturnType<typeof getCart>[number];

type ShippingAddress = {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phone: string;
};

type AddressSuggestion = {
  id: string;
  label: string;
  address1: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
};

function resolvePublicMapboxToken(): string {
  const accessToken =
    typeof import.meta.env.PUBLIC_MAPBOX_ACCESS_TOKEN === 'string'
      ? import.meta.env.PUBLIC_MAPBOX_ACCESS_TOKEN.trim()
      : '';
  if (accessToken) return accessToken;
  return typeof import.meta.env.PUBLIC_MAPBOX_TOKEN === 'string'
    ? import.meta.env.PUBLIC_MAPBOX_TOKEN.trim()
    : '';
}

function isAddressLookupEnabled(token: string): boolean {
  const raw =
    typeof import.meta.env.PUBLIC_CHECKOUT_ADDRESS_LOOKUP_ENABLED === 'string'
      ? import.meta.env.PUBLIC_CHECKOUT_ADDRESS_LOOKUP_ENABLED.trim().toLowerCase()
      : '';
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  return Boolean(token);
}

function normalizeCountryCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

const EMPTY_ADDRESS: ShippingAddress = {
  email: '',
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  province: '',
  postalCode: '',
  countryCode: 'US',
  phone: ''
};

function readFormControlValueById(id: string): string | null {
  if (typeof document === 'undefined') return null;
  const element = document.getElementById(id);
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
    return element.value;
  }
  return null;
}

function toDisplayCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : Math.round(value * 100);
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return null;
    if (/^-?\d+$/.test(normalized)) {
      const parsed = Number.parseInt(normalized, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (/^-?\d+(\.\d+)?$/.test(normalized)) {
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
    }
  }

  return null;
}

function resolveShippingOptionAmountCents(rate: ShippingRate): number | null {
  const direct =
    toDisplayCents(rate.calculated_price) ??
    toDisplayCents(rate.amount) ??
    toDisplayCents((rate as any)?.price) ??
    toDisplayCents((rate as any)?.value);
  if (typeof direct === 'number') return direct;

  const calculatedPrice = (rate as any)?.calculated_price;
  if (calculatedPrice && typeof calculatedPrice === 'object') {
    const nested =
      toDisplayCents((calculatedPrice as any)?.amount) ??
      toDisplayCents((calculatedPrice as any)?.calculated_amount) ??
      toDisplayCents((calculatedPrice as any)?.calculated_price?.amount) ??
      toDisplayCents((calculatedPrice as any)?.calculated_price?.calculated_amount);
    if (typeof nested === 'number') return nested;
  }

  const priceSet = (rate as any)?.calculated_price_set;
  if (priceSet && typeof priceSet === 'object') {
    const setAmount =
      toDisplayCents((priceSet as any)?.calculated_amount?.value) ??
      toDisplayCents((priceSet as any)?.calculated_amount) ??
      toDisplayCents((priceSet as any)?.amount?.value) ??
      toDisplayCents((priceSet as any)?.amount);
    if (typeof setAmount === 'number') return setAmount;
  }

  return null;
}

function formatCurrency(cents: number | null | undefined): string {
  const value = typeof cents === 'number' ? cents : 0;
  return `$${(value / 100).toFixed(2)}`;
}

function resolveCheckoutImageSrc(thumbnail: string | null | undefined): string {
  if (typeof thumbnail !== 'string') return CHECKOUT_IMAGE_FALLBACK;
  const value = thumbnail.trim();
  if (!value) return CHECKOUT_IMAGE_FALLBACK;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value;
  }
  return CHECKOUT_IMAGE_FALLBACK;
}

function toLocalCartId(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  if (raw.endsWith('::[]')) return raw.slice(0, -4);
  if (raw.endsWith('::')) return raw.slice(0, -2);
  return raw;
}

function reconcileLocalCartFromCheckoutCart(cart: Cart | null): void {
  if (typeof window === 'undefined' || !cart || !Array.isArray(cart.items)) return;

  const existing = getCart();
  const nextItems: LocalCartItem[] = cart.items
    .map((serverItem) => {
      const existingMatch =
        existing.find(
          (entry) => toLocalCartId(entry.id) === toLocalCartId(serverItem.local_item_id)
        ) ??
        existing.find(
          (entry) =>
            String((entry as any).medusaLineItemId || '').trim() ===
            String(serverItem.medusa_line_item_id || '').trim()
        ) ??
        existing.find(
          (entry) =>
            toLocalCartId(entry.medusaVariantId || '') ===
            toLocalCartId(serverItem.medusa_variant_id || '')
        );
      const resolvedVariantId =
        toLocalCartId(serverItem.medusa_variant_id) ||
        toLocalCartId(existingMatch?.medusaVariantId || '');
      if (!resolvedVariantId) {
        // Keep local cart syncable by skipping line items that cannot be mapped to a Medusa variant.
        return null;
      }

      const candidateId =
        toLocalCartId(serverItem.local_item_id) ||
        toLocalCartId(existingMatch?.id || '') ||
        resolvedVariantId ||
        toLocalCartId(serverItem.id);
      if (!candidateId) return null;

      return {
        ...(existingMatch || {}),
        id: candidateId,
        name: serverItem.title || existingMatch?.name || 'Product',
        price:
          typeof serverItem.unit_price === 'number' && Number.isFinite(serverItem.unit_price)
            ? Math.round(serverItem.unit_price)
            : existingMatch?.price || 0,
        quantity:
          typeof serverItem.quantity === 'number' && Number.isFinite(serverItem.quantity)
            ? Math.max(1, Math.round(serverItem.quantity))
            : existingMatch?.quantity || 1,
        image: resolveCheckoutImageSrc(serverItem.thumbnail),
        medusaVariantId: resolvedVariantId
      } as LocalCartItem;
    })
    .filter((entry): entry is LocalCartItem => Boolean(entry));

  const previousSerialized = JSON.stringify(existing);
  const nextSerialized = JSON.stringify(nextItems);
  if (previousSerialized === nextSerialized) return;

  persistCartLocally(nextItems);
}

function buildLocalCartSignature(items: LocalCartItem[]): string {
  return items
    .map((item) => {
      const id = toLocalCartId(item.id);
      const variant = toLocalCartId(item.medusaVariantId || '');
      const qty = Math.max(1, Number(item.quantity) || 1);
      return `${id}|${variant}|${qty}`;
    })
    .sort()
    .join('::');
}

function buildServerCartSignature(cart: Cart): string {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  return items
    .map((item) => {
      const id =
        toLocalCartId(item.local_item_id) ||
        toLocalCartId(item.medusa_variant_id) ||
        toLocalCartId(item.id);
      const variant = toLocalCartId(item.medusa_variant_id || '');
      const qty = Math.max(1, Number(item.quantity) || 1);
      return `${id}|${variant}|${qty}`;
    })
    .sort()
    .join('::');
}

function hasCheckoutCartDrift(localItems: LocalCartItem[], serverCart: Cart): boolean {
  return buildLocalCartSignature(localItems) !== buildServerCartSignature(serverCart);
}

type StoredDiscountState = {
  cartId: string;
  codes: string[];
};

function normalizeDiscountCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getStoredDiscountState(cartId: string | null | undefined): StoredDiscountState | null {
  if (typeof window === 'undefined' || !cartId) return null;

  try {
    const raw = window.localStorage.getItem(CHECKOUT_DISCOUNT_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDiscountState> | null;
    if (!parsed || typeof parsed.cartId !== 'string' || parsed.cartId !== cartId) {
      return null;
    }

    const codes = Array.isArray(parsed.codes)
      ? parsed.codes.map(normalizeDiscountCode).filter(Boolean)
      : [];

    return {
      cartId,
      codes: Array.from(new Set(codes))
    };
  } catch {
    return null;
  }
}

function setStoredDiscountCodes(cartId: string, codes: string[]): void {
  if (typeof window === 'undefined') return;

  const normalizedCodes = Array.from(new Set(codes.map(normalizeDiscountCode).filter(Boolean)));
  if (!normalizedCodes.length) {
    window.localStorage.removeItem(CHECKOUT_DISCOUNT_STATE_KEY);
    return;
  }

  window.localStorage.setItem(
    CHECKOUT_DISCOUNT_STATE_KEY,
    JSON.stringify({
      cartId,
      codes: normalizedCodes
    } satisfies StoredDiscountState)
  );
}

function clearStoredDiscountCodes(cartId?: string | null): void {
  if (typeof window === 'undefined') return;
  if (!cartId) {
    window.localStorage.removeItem(CHECKOUT_DISCOUNT_STATE_KEY);
    return;
  }

  const existing = getStoredDiscountState(cartId);
  if (existing) {
    window.localStorage.removeItem(CHECKOUT_DISCOUNT_STATE_KEY);
  }
}

function getCartDiscountCodes(cart: Cart | null | undefined): string[] {
  const explicitCodes = Array.isArray(cart?.discounts)
    ? cart.discounts.map((discount) => normalizeDiscountCode(discount?.code)).filter(Boolean)
    : [];
  const appliedCodes = Array.isArray(cart?.applied_discount_codes)
    ? cart.applied_discount_codes.map(normalizeDiscountCode).filter(Boolean)
    : [];

  return Array.from(new Set([...explicitCodes, ...appliedCodes]));
}

function isInstallOnlyLineItem(item: CartItem): boolean {
  if (item.install_only === true) return true;
  const shippingClass = String(item.shipping_class || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return (
    shippingClass.includes('installonly') ||
    shippingClass.includes('service') ||
    shippingClass.includes('performancepackage')
  );
}

function normalizeShippingLabel(rate: ShippingRate): string {
  return rate.name || (rate as any)?.data?.service_name || 'Shipping option';
}

function rankShippingLabel(label: string): number {
  const normalized = label.toLowerCase();
  if (normalized.includes('ground') || normalized.includes('standard')) return 0;
  if (normalized.includes('3') && normalized.includes('day')) return 1;
  if (normalized.includes('2') && normalized.includes('day')) return 2;
  if (normalized.includes('next') || normalized.includes('overnight')) return 3;
  return 10;
}

function buildSelectableRates(shippingRates: ShippingRate[]): SelectableShippingRate[] {
  if (!shippingRates.length) return [];
  return shippingRates
    .map((rate) => ({
      id: rate.id,
      optionId: typeof (rate as any)?.option_id === 'string' ? (rate as any).option_id : rate.id,
      label: normalizeShippingLabel(rate),
      amountCents: resolveShippingOptionAmountCents(rate) ?? 0,
      shippingData: rate.data
    }))
    .sort((a, b) => {
      const rankDelta = rankShippingLabel(a.label) - rankShippingLabel(b.label);
      if (rankDelta !== 0) return rankDelta;
      return a.amountCents - b.amountCents;
    });
}

export default function CheckoutForm() {
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectingShipping, setSelectingShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [driftDebug, setDriftDebug] = useState<string | null>(null);
  const [reconcilingDiscounts, setReconcilingDiscounts] = useState(false);
  const shippingSelectionRequestIdRef = useRef(0);
  const discountReconciliationSignatureRef = useRef('');
  const stripePromise = useMemo(() => {
    const key = stripePublishableKey.trim();
    if (!key) return null;
    return loadStripe(key);
  }, [stripePublishableKey]);

  async function syncCheckoutCart(
    context: string,
    options: { suppressError?: boolean; allowIfNoDrift?: boolean } = {}
  ): Promise<boolean> {
    const localItems = getCart();
    const syncResult = await syncMedusaCart(localItems);
    if (syncResult.ok) return true;
    if (options.allowIfNoDrift && cart && !hasCheckoutCartDrift(localItems, cart)) {
      console.warn(`[checkout] cart sync failed during ${context}, continuing with in-sync cart`);
      return true;
    }
    const message = syncResult.error || 'Unable to sync your cart. Please refresh and try again.';
    console.warn(`[checkout] cart sync failed during ${context}`, { message });
    if (!options.suppressError) {
      setError(message);
    }
    return false;
  }

  const allItemsInstallOnly = useMemo(() => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    if (!items.length) return false;
    return items.every((item) => isInstallOnlyLineItem(item));
  }, [cart]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const id = await ensureMedusaCartId();
        if (cancelled) return;
        setCartId(id);
        if (!id) return;

        const synced = await syncCheckoutCart('checkout init', { suppressError: true });
        if (!synced) {
          const recoveredId = await recoverMissingCart();
          if (!cancelled) setCartId(recoveredId);
          return;
        }
        let loaded: { loaded: boolean; driftDetected: boolean };
        try {
          loaded = await loadCart(id);
        } catch (loadError) {
          console.warn('[checkout] initial cart load failed, attempting recovery', loadError);
          const recoveredId = await recoverMissingCart();
          if (!cancelled) setCartId(recoveredId);
          return;
        }
        if (!loaded.loaded) {
          const recoveredId = await recoverMissingCart();
          if (!cancelled) setCartId(recoveredId);
          return;
        }

        if (loaded.driftDetected) {
          setDriftDebug('Cart mismatch detected. Auto-resyncing.');
          const syncedAfterDrift = await syncCheckoutCart('checkout drift recovery', {
            suppressError: true
          });
          if (syncedAfterDrift) {
            const postRecovery = await loadCart(id);
            if (postRecovery.driftDetected) {
              setDriftDebug('Cart mismatch persists after auto-resync.');
              console.warn('[checkout] cart drift still present after resync');
            } else {
              setDriftDebug(null);
            }
          }
        } else {
          setDriftDebug(null);
        }
      } catch (err) {
        console.error('Checkout init failed:', err);
        if (!cancelled) setError('Failed to load cart. Please refresh the page.');
      } finally {
        if (!cancelled) setLoadingCart(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadCart(id: string): Promise<{ loaded: boolean; driftDetected: boolean }> {
    const localBeforeLoad = getCart();
    const response = await fetch(`/api/cart/${id}`);
    if (response.status === 404) return { loaded: false, driftDetected: false };
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Cart fetch failed');
    }

    const data = await response.json();
    const driftDetected = hasCheckoutCartDrift(localBeforeLoad, data.cart);
    setCart(data.cart);
    reconcileLocalCartFromCheckoutCart(data.cart);
    return { loaded: true, driftDetected };
  }

  useEffect(() => {
    if (!cartId || !cart) return;

    const serverCodes = getCartDiscountCodes(cart);
    const signature = `${cartId}::${serverCodes.slice().sort().join('|')}`;
    if (discountReconciliationSignatureRef.current === signature) return;
    discountReconciliationSignatureRef.current = signature;

    if (!serverCodes.length) {
      clearStoredDiscountCodes(cartId);
      return;
    }

    const storedCodes = new Set(getStoredDiscountState(cartId)?.codes ?? []);
    const unexpectedCodes = serverCodes.filter((code) => !storedCodes.has(code));
    if (!unexpectedCodes.length) {
      setStoredDiscountCodes(cartId, serverCodes);
      return;
    }

    let cancelled = false;

    const removeUnexpectedDiscounts = async () => {
      setReconcilingDiscounts(true);
      try {
        for (const code of unexpectedCodes) {
          const response = await fetch('/api/medusa/cart/discount-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartId,
              code,
              action: 'remove'
            })
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.error || `Unable to clear stale discount code "${code}".`);
          }
        }

        if (cancelled) return;
        await loadCart(cartId);
        if (cancelled) return;

        clearStoredDiscountCodes(cartId);
        setDiscountMessage(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Unable to clear stale discount codes.';
        setDiscountMessage(message);
      } finally {
        if (!cancelled) {
          setReconcilingDiscounts(false);
        }
      }
    };

    void removeUnexpectedDiscounts();

    return () => {
      cancelled = true;
    };
  }, [cart, cartId]);

  async function recoverMissingCart(): Promise<string> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MEDUSA_CART_ID_KEY);
    }

    const freshCartId = await ensureMedusaCartId();
    if (!freshCartId) throw new Error('Unable to create replacement cart');

    const synced = await syncCheckoutCart('cart recovery', { suppressError: true });
    if (!synced) throw new Error('Unable to sync replacement cart');
    const loaded = await loadCart(freshCartId);
    if (!loaded.loaded) throw new Error('Replacement cart was not found');

    return freshCartId;
  }

  const updateAddressField =
    (field: keyof ShippingAddress) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setShippingAddress((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const updateAddressFieldValue = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((prev) => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
  };

  const hydrateShippingAddressFromDom = (): ShippingAddress => {
    const nextAddress: ShippingAddress = {
      ...shippingAddress
    };

    const email = readFormControlValueById('nonready-email');
    const firstName = readFormControlValueById('addr-first-name');
    const lastName = readFormControlValueById('addr-last-name');
    const address1 = readFormControlValueById('addr-line1');
    const address2 = readFormControlValueById('addr-line2');
    const city = readFormControlValueById('addr-city');
    const province = readFormControlValueById('addr-province');
    const postalCode = readFormControlValueById('addr-postal');
    const phone = readFormControlValueById('addr-phone');
    const countryValue = readFormControlValueById('addr-country');

    if (email !== null) nextAddress.email = email;
    if (firstName !== null) nextAddress.firstName = firstName;
    if (lastName !== null) nextAddress.lastName = lastName;
    if (address1 !== null) nextAddress.address1 = address1;
    if (address2 !== null) nextAddress.address2 = address2;
    if (city !== null) nextAddress.city = city;
    if (province !== null) nextAddress.province = province;
    if (postalCode !== null) nextAddress.postalCode = postalCode;
    if (phone !== null) nextAddress.phone = phone;
    if (countryValue !== null) {
      const normalizedCountry = normalizeCountryCode(countryValue);
      nextAddress.countryCode = normalizedCountry || countryValue.toUpperCase();
    }

    const changed = (Object.keys(nextAddress) as (keyof ShippingAddress)[]).some(
      (key) => nextAddress[key] !== shippingAddress[key]
    );

    if (changed) {
      setShippingAddress(nextAddress);
    }

    return nextAddress;
  };

  const applyAddressSuggestion = (suggestion: AddressSuggestion) => {
    setShippingAddress((prev) => ({
      ...prev,
      address1: suggestion.address1,
      city: suggestion.city,
      province: suggestion.province,
      postalCode: suggestion.postalCode,
      countryCode: suggestion.countryCode || prev.countryCode
    }));
  };

  async function handleCalculateShipping() {
    if (!cartId) return;
    const currentAddress = hydrateShippingAddressFromDom();

    if (allItemsInstallOnly) {
      setLoadingRates(true);
      setError(null);
      setClientSecret(null);
      try {
        const synced = await syncCheckoutCart('payment intent init');
        if (!synced) return;
        const intentResponse = await fetch('/api/medusa/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId })
        });
        if (!intentResponse.ok) {
          const payload = await intentResponse.json().catch(() => null);
          throw new Error(payload?.error || 'Failed to initialize payment');
        }
        const payload = await intentResponse.json().catch(() => null);
        if (!payload?.client_secret) {
          throw new Error('Payment intent not ready');
        }
        if (
          typeof payload?.publishable_key === 'string' &&
          payload.publishable_key.trim() &&
          payload.publishable_key.trim() !== stripePublishableKey.trim()
        ) {
          setStripePublishableKey(payload.publishable_key.trim());
        }
        setClientSecret(payload.client_secret);
        await loadCart(cartId);
      } catch (err) {
        console.error('Payment intent init error (install-only):', err);
        setError('Unable to initialize payment. Please try again.');
      } finally {
        setLoadingRates(false);
      }
      return;
    }

    if (!isAddressComplete(currentAddress)) {
      setError('Please complete your shipping address before calculating rates.');
      return;
    }

    setLoadingRates(true);
    setError(null);
    setClientSecret(null);

    try {
      const synced = await syncCheckoutCart('shipping quote', { allowIfNoDrift: true });
      if (!synced) return;

      const updateResponse = await fetch('/api/medusa/cart/update-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          email: currentAddress.email,
          shippingAddress: {
            firstName: currentAddress.firstName,
            lastName: currentAddress.lastName,
            address1: currentAddress.address1,
            address2: currentAddress.address2,
            city: currentAddress.city,
            province: currentAddress.province,
            postalCode: currentAddress.postalCode,
            countryCode: currentAddress.countryCode,
            phone: currentAddress.phone
          }
        })
      });

      if (!updateResponse.ok) {
        const payload = await updateResponse.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save delivery address.');
      }

      const optionsResponse = await fetch('/api/medusa/cart/shipping-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId })
      });

      const data = await optionsResponse.json().catch(() => null);
      if (!optionsResponse.ok) {
        throw new Error(data?.error || 'Unable to calculate delivery rates.');
      }

      const options = Array.isArray(data?.shippingOptions) ? data.shippingOptions : [];
      setShippingRates(options);
      setSelectedRateId(null);
      setSelectedOptionId(null);
      await loadCart(cartId);
    } catch (err) {
      console.error('Shipping rates error:', err);
      setError('Unable to calculate shipping for this address. Please verify your address.');
      setShippingRates([]);
      setSelectedRateId(null);
      setSelectedOptionId(null);
    } finally {
      setLoadingRates(false);
    }
  }

  async function selectShippingRate(rate: SelectableShippingRate) {
    if (!cartId) return;
    const requestId = ++shippingSelectionRequestIdRef.current;
    setSelectingShipping(true);
    setSelectedRateId(rate.id);
    setSelectedOptionId(rate.optionId);
    setError(null);
    setClientSecret(null);

    try {
      const synced = await syncCheckoutCart('shipping selection', { allowIfNoDrift: true });
      if (!synced) return;
      if (requestId !== shippingSelectionRequestIdRef.current) return;

      const response = await fetch('/api/medusa/cart/select-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          optionId: rate.optionId,
          shippingData: rate.shippingData
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to apply shipping option');
      }
      if (requestId !== shippingSelectionRequestIdRef.current) return;
      const shippingPayload = await response.json().catch(() => null);

      if (shippingPayload?.cart && typeof shippingPayload.cart === 'object') {
        setCart(shippingPayload.cart);
        reconcileLocalCartFromCheckoutCart(shippingPayload.cart);
      } else {
        await loadCart(cartId);
      }

      const intentResponse = await fetch('/api/medusa/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId })
      });
      if (!intentResponse.ok) {
        const payload = await intentResponse.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to initialize payment');
      }
      if (requestId !== shippingSelectionRequestIdRef.current) return;
      const intentPayload = await intentResponse.json().catch(() => null);
      if (!intentPayload?.client_secret) {
        throw new Error('Payment intent not ready');
      }
      if (
        typeof intentPayload?.publishable_key === 'string' &&
        intentPayload.publishable_key.trim() &&
        intentPayload.publishable_key.trim() !== stripePublishableKey.trim()
      ) {
        setStripePublishableKey(intentPayload.publishable_key.trim());
      }
      setClientSecret(intentPayload.client_secret);
    } catch (err) {
      if (requestId !== shippingSelectionRequestIdRef.current) return;
      console.error('Failed to update shipping:', err);
      setError('Failed to update shipping. Please try again.');
      setSelectedRateId(null);
      setSelectedOptionId(null);
    } finally {
      if (requestId === shippingSelectionRequestIdRef.current) {
        setSelectingShipping(false);
      }
    }
  }

  const cartCount = useMemo(
    () => (cart?.items || []).reduce((sum, p) => sum + Number(p.quantity || 0), 0),
    [cart]
  );
  const itemSubtotalCents = useMemo(
    () => (cart?.items || []).reduce((sum, item) => sum + (toDisplayCents(item.total) ?? 0), 0),
    [cart]
  );
  const displayTotals = useMemo(() => {
    const discountCents = Math.max(0, cart?.discount_amount_cents ?? 0);
    const authoritativeTotalCents = Math.max(0, cart?.total_cents ?? 0);
    const selectedShippingCents = Math.max(0, cart?.shipping_amount_cents ?? 0);

    // Until the shopper explicitly selects a rate this session, prevent stale persisted
    // shipping/tax totals from previous carts/addresses from being rendered.
    const hasCurrentShippingSelection = allItemsInstallOnly || Boolean(selectedOptionId);
    if (!hasCurrentShippingSelection) {
      return {
        subtotalCents: Math.max(0, itemSubtotalCents),
        shippingCents: 0,
        taxCents: 0,
        totalCents: Math.max(0, itemSubtotalCents - discountCents),
        discountCents
      };
    }

    const taxCents = Math.max(
      0,
      authoritativeTotalCents -
        Math.max(0, itemSubtotalCents) -
        selectedShippingCents +
        discountCents
    );
    return {
      subtotalCents: Math.max(0, itemSubtotalCents),
      shippingCents: selectedShippingCents,
      taxCents,
      totalCents: authoritativeTotalCents,
      discountCents
    };
  }, [
    allItemsInstallOnly,
    cart?.discount_amount_cents,
    cart?.shipping_amount_cents,
    cart?.total_cents,
    itemSubtotalCents,
    selectedOptionId
  ]);

  async function refreshPaymentIntentAfterCartChange(currentCartId: string): Promise<void> {
    if (!clientSecret) return;
    const response = await fetch('/api/medusa/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId: currentCartId })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Failed to refresh payment intent');
    }
    const payload = await response.json().catch(() => null);
    if (!payload?.client_secret) {
      throw new Error('Payment intent refresh did not return a client secret');
    }
    if (
      typeof payload?.publishable_key === 'string' &&
      payload.publishable_key.trim() &&
      payload.publishable_key.trim() !== stripePublishableKey.trim()
    ) {
      setStripePublishableKey(payload.publishable_key.trim());
    }
    setClientSecret(payload.client_secret);
  }

  /**
   * handleCancelCheckout
   * Wipes ALL local checkout state (cart items + Medusa cart ID) and navigates
   * the user back to the shop. This prevents stale cart IDs from polluting
   * the next session and eliminates ghost-cart Medusa sync errors.
   */
  function handleCancelCheckout() {
    clearStoredDiscountCodes(cartId);
    abandonCheckout();
    window.location.href = '/shop';
  }

  async function mutateDiscountCode(action: 'apply' | 'remove', codeValue: string): Promise<void> {
    if (!cartId) return;
    const code = codeValue.trim();
    if (!code) {
      setDiscountMessage('Enter a discount code.');
      return;
    }

    setApplyingDiscount(true);
    setDiscountMessage(null);
    setError(null);

    try {
      const normalizedCode = normalizeDiscountCode(code);
      const currentStoredCodes = getStoredDiscountState(cartId)?.codes ?? [];
      if (action === 'apply') {
        setStoredDiscountCodes(cartId, [...currentStoredCodes, normalizedCode]);
      } else {
        setStoredDiscountCodes(
          cartId,
          currentStoredCodes.filter((storedCode) => storedCode !== normalizedCode)
        );
      }

      const response = await fetch('/api/medusa/cart/discount-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          code,
          action
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update discount code.');
      }

      await loadCart(cartId);
      await refreshPaymentIntentAfterCartChange(cartId);

      if (action === 'apply') {
        setDiscountCode('');
        setDiscountMessage(`Code "${code}" applied.`);
      } else {
        setDiscountMessage(`Code "${code}" removed.`);
      }
    } catch (err) {
      await loadCart(cartId).catch(() => null);
      const message = err instanceof Error ? err.message : 'Unable to update discount code.';
      setDiscountMessage(message);
    } finally {
      setApplyingDiscount(false);
    }
  }

  if (loadingCart) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Loading your cart...</p>
      </div>
    );
  }

  if (!cartId || !cart || cart.items.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <p>Add some items to your cart before checking out.</p>
        {error && <p className="checkout-v2-error">{error}</p>}
        <a href="/" className="button">
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="checkout-v2">
      <div className="checkout-v2-header">
        <h2>Checkout</h2>
        <div className="checkout-v2-header-actions">
          <span>
            {cartCount} item{cartCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="checkout-cancel-btn"
            aria-label="Cancel checkout and return to shop"
            onClick={handleCancelCheckout}
          >
            Cancel &amp; Clear Cart
          </button>
        </div>
      </div>
      {import.meta.env.DEV && driftDebug && (
        <p className="checkout-v2-error" style={{ marginBottom: '0.75rem', color: '#10b981' }}>
          {driftDebug}
        </p>
      )}

      <div className="checkout-v2-shell">
        <div className="checkout-v2-grid">
          <div className="checkout-v2-summary">
            {cart.items.map((product) => (
              <div key={product.id} className="checkout-v2-item">
                <div className="checkout-v2-image-wrap">
                  <img
                    src={resolveCheckoutImageSrc(product.thumbnail)}
                    alt={product.title || 'Product image'}
                    className="checkout-v2-image"
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (image.src.endsWith(CHECKOUT_IMAGE_FALLBACK)) return;
                      image.src = CHECKOUT_IMAGE_FALLBACK;
                    }}
                  />
                  <span className="checkout-v2-qty">{product.quantity}</span>
                </div>
                <div className="checkout-v2-item-body">
                  <div>
                    <p className="checkout-v2-name">{product.title}</p>
                    {typeof product.variant_title === 'string' &&
                      product.variant_title.trim() &&
                      product.variant_title.trim().toLowerCase() !== 'default' && (
                        <p className="checkout-v2-variant">{product.variant_title.trim()}</p>
                      )}
                  </div>
                  <p className="checkout-v2-price">{formatCurrency(product.total)}</p>
                </div>
              </div>
            ))}

            <div className="checkout-v2-discount">
              {/* Visually hidden label satisfies WCAG 1.3.1 / 3.3.2 */}
              <label htmlFor="discount-code" className="sr-only">
                Discount code
              </label>
              <input
                type="text"
                id="discount-code"
                name="discountCode"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Discount code"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-plain"
                disabled={applyingDiscount || reconcilingDiscounts || !discountCode.trim()}
                onClick={() => void mutateDiscountCode('apply', discountCode)}
              >
                {reconcilingDiscounts ? 'Syncing...' : applyingDiscount ? 'Applying...' : 'Apply'}
              </button>
            </div>
            {Array.isArray(cart.discounts) && cart.discounts.length > 0 && (
              <div className="checkout-v2-discount-applied">
                {cart.discounts.map((discount) => {
                  const discountAmount = discount.amount ?? 0;
                  const discountName =
                    discount.rule?.description || discount.description || discount.code;
                  const discountType = discount.rule?.type || 'fixed';
                  const discountValue = discount.rule?.value || 0;

                  return (
                    <div key={discount.code} className="checkout-v2-discount-card">
                      <div className="checkout-v2-discount-details">
                        <div className="checkout-v2-discount-header">
                          <span className="checkout-v2-discount-icon">✓</span>
                          <div className="checkout-v2-discount-info">
                            <p className="checkout-v2-discount-name">{discountName}</p>
                            <p className="checkout-v2-discount-code">
                              Code: {discount.code}
                              {discountType === 'percentage' && discountValue > 0 && (
                                <span className="checkout-v2-discount-value">
                                  {' '}• {discountValue}% off
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="checkout-v2-discount-savings">
                          <p className="checkout-v2-saved-label">You saved</p>
                          <p className="checkout-v2-saved-amount">
                            {formatCurrency(discountAmount)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="checkout-v2-discount-remove"
                        disabled={applyingDiscount || reconcilingDiscounts}
                        onClick={() => void mutateDiscountCode('remove', discount.code)}
                        aria-label={`Remove discount ${discount.code}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {discountMessage && <p className="checkout-v2-discount-message">{discountMessage}</p>}

            <div className="checkout-v2-totals">
              <div>
                <span>Subtotal</span>
                <span>{formatCurrency(displayTotals.subtotalCents)}</span>
              </div>
              <div>
                <span>Shipping</span>
                <span>{formatCurrency(displayTotals.shippingCents)}</span>
              </div>
              <div>
                <span>Taxes</span>
                <span>{formatCurrency(displayTotals.taxCents)}</span>
              </div>
              {displayTotals.discountCents > 0 && (
                <div>
                  <span>Discount</span>
                  <span>-{formatCurrency(displayTotals.discountCents)}</span>
                </div>
              )}
              <div className="final">
                <span>Total</span>
                <span>{formatCurrency(displayTotals.totalCents)}</span>
              </div>
            </div>
          </div>

          <div className="checkout-v2-pay">
            {clientSecret ? (
              stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'night' as const,
                      variables: {
                        colorPrimary: '#c41218',
                        colorBackground: '#0f0f0f',
                        colorText: '#ffffff',
                        colorTextSecondary: '#e5e7eb',
                        colorTextPlaceholder: '#cbd5e1'
                      }
                    }
                  }}
                >
                  <StripePaymentPane
                    cartId={cartId}
                    cart={cart}
                    clientSecret={clientSecret}
                    shippingAddress={shippingAddress}
                    selectedRateId={selectedOptionId}
                    requiresShipping={!allItemsInstallOnly}
                    processing={processing}
                    setProcessing={setProcessing}
                    setError={setError}
                  />
                </Elements>
              ) : (
                <p className="checkout-v2-error">
                  Payment configuration is unavailable. Please refresh and try again.
                </p>
              )
            ) : (
              <NonReadyPaymentPane
                shippingAddress={shippingAddress}
                requiresShipping={!allItemsInstallOnly}
                loadingRates={loadingRates}
                shippingRates={shippingRates}
                selectedRateId={selectedRateId}
                onAddressChange={updateAddressField}
                onApplyAddressSuggestion={applyAddressSuggestion}
                onCalculateShipping={handleCalculateShipping}
                onSelectRate={selectShippingRate}
                selectingShipping={selectingShipping}
                onAddressValueChange={updateAddressFieldValue}
              />
            )}

            {error && <p className="checkout-v2-error">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NonReadyPaymentPane({
  shippingAddress,
  requiresShipping,
  loadingRates,
  shippingRates,
  selectedRateId,
  selectingShipping,
  onAddressChange,
  onApplyAddressSuggestion,
  onCalculateShipping,
  onSelectRate,
  onAddressValueChange
}: {
  shippingAddress: ShippingAddress;
  requiresShipping: boolean;
  loadingRates: boolean;
  shippingRates: ShippingRate[];
  selectedRateId: string | null;
  selectingShipping: boolean;
  onAddressChange: (
    field: keyof ShippingAddress
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onApplyAddressSuggestion: (suggestion: AddressSuggestion) => void;
  onCalculateShipping: () => Promise<void>;
  onSelectRate: (rate: SelectableShippingRate) => Promise<void>;
  onAddressValueChange: (field: keyof ShippingAddress, value: string) => void;
}) {
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [loadingAddressSuggestions, setLoadingAddressSuggestions] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressLookupRequestIdRef = useRef(0);
  const addressLookupTimerRef = useRef<number | null>(null);
  const mapboxToken = useMemo(() => resolvePublicMapboxToken(), []);
  const addressLookupEnabled = useMemo(() => isAddressLookupEnabled(mapboxToken), [mapboxToken]);
  const lookupCountryCode = useMemo(
    () => normalizeCountryCode(shippingAddress.countryCode),
    [shippingAddress.countryCode]
  );
  const lookupErrorLoggedRef = useRef(false);

  const selectableRates = useMemo(
    () => buildSelectableRates(shippingRates),
    [shippingRates]
  );

  const syncAddressFieldFromInput =
    (field: keyof ShippingAddress) =>
    (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
      onAddressValueChange(field, event.currentTarget.value);
    };

  const syncAddressFieldFromAutofill =
    (field: keyof ShippingAddress) =>
    (event: AnimationEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (event.animationName !== 'checkoutAutofillSync') return;
      onAddressValueChange(field, event.currentTarget.value);
    };

  useEffect(() => {
    return () => {
      if (addressLookupTimerRef.current) {
        window.clearTimeout(addressLookupTimerRef.current);
      }
    };
  }, []);

  const handleAddress1Change = (event: ChangeEvent<HTMLInputElement>) => {
    onAddressChange('address1')(event);
    const query = event.target.value.trim();
    if (!addressLookupEnabled || query.length < 3) {
      setAddressSuggestions([]);
      setLoadingAddressSuggestions(false);
      setShowAddressSuggestions(false);
      if (addressLookupTimerRef.current) {
        window.clearTimeout(addressLookupTimerRef.current);
        addressLookupTimerRef.current = null;
      }
      return;
    }

    const requestId = ++addressLookupRequestIdRef.current;
    if (addressLookupTimerRef.current) {
      window.clearTimeout(addressLookupTimerRef.current);
    }
    addressLookupTimerRef.current = window.setTimeout(async () => {
      setLoadingAddressSuggestions(true);
      try {
        const params = new URLSearchParams({
          access_token: mapboxToken,
          autocomplete: 'true',
          limit: '5',
          types: 'address',
          language: 'en',
          q: query
        });
        if (lookupCountryCode) {
          params.set('country', lookupCountryCode.toLowerCase());
        }
        const response = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`
        );
        const payload = await response.json().catch(() => null);
        if (requestId !== addressLookupRequestIdRef.current) return;
        const features = Array.isArray(payload?.features) ? payload.features : [];
        const nextSuggestions: AddressSuggestion[] = features
          .map((feature: any) => {
            const context = feature?.properties?.context || {};
            const addressNumber = String(context?.address?.address_number || '').trim();
            const street = String(context?.street?.name || '').trim();
            const address1 = [addressNumber, street].filter(Boolean).join(' ').trim();
            const city =
              String(context?.place?.name || '').trim() ||
              String(context?.locality?.name || '').trim();
            const province = String(context?.region?.region_code || '').trim();
            const postalCode = String(context?.postcode?.name || '').trim();
            const countryCode = normalizeCountryCode(context?.country?.country_code);
            return {
              id: String(feature?.id || '').trim(),
              label: String(
                feature?.properties?.full_address || feature?.properties?.name || ''
              ).trim(),
              address1,
              city,
              province,
              postalCode,
              countryCode: countryCode || lookupCountryCode
            };
          })
          .filter(
            (entry: AddressSuggestion) =>
              Boolean(entry.id) &&
              Boolean(entry.label) &&
              Boolean(entry.address1) &&
              Boolean(entry.city) &&
              Boolean(entry.province) &&
              Boolean(entry.postalCode)
          );
        setAddressSuggestions(nextSuggestions);
        setShowAddressSuggestions(nextSuggestions.length > 0);
      } catch (lookupError) {
        if (requestId !== addressLookupRequestIdRef.current) return;
        if (!lookupErrorLoggedRef.current) {
          lookupErrorLoggedRef.current = true;
          console.warn(
            '[checkout] address lookup unavailable; continuing with manual address entry',
            lookupError
          );
        }
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      } finally {
        if (requestId === addressLookupRequestIdRef.current) {
          setLoadingAddressSuggestions(false);
        }
      }
    }, 220);
  };

  return (
    <>
      <label htmlFor="nonready-email">Email</label>
      <input
        id="nonready-email"
        type="email"
        name="email"
        value={shippingAddress.email}
        onChange={onAddressChange('email')}
        onInput={syncAddressFieldFromInput('email')}
        onBlur={(event) => onAddressValueChange('email', event.currentTarget.value)}
        onAnimationStart={syncAddressFieldFromAutofill('email')}
        placeholder="mail@example.com"
        autoComplete="email"
        inputMode="email"
      />

      {requiresShipping ? (
        <>
          {/* fieldset/legend groups the address inputs as a unit — WCAG 1.3.1 */}
          <fieldset className="checkout-address-fieldset">
            <legend>Shipping address</legend>
          <div className="checkout-v2-address-grid">
            <div>
              <label htmlFor="addr-first-name" className="sr-only">First name</label>
              <input
                id="addr-first-name"
                type="text"
                name="firstName"
                value={shippingAddress.firstName}
                onChange={onAddressChange('firstName')}
                onInput={syncAddressFieldFromInput('firstName')}
                onBlur={(event) => onAddressValueChange('firstName', event.currentTarget.value)}
                onAnimationStart={syncAddressFieldFromAutofill('firstName')}
                placeholder="First name"
                autoComplete="shipping given-name"
              />
            </div>
            <div>
              <label htmlFor="addr-last-name" className="sr-only">Last name</label>
              <input
                id="addr-last-name"
                type="text"
                name="lastName"
                value={shippingAddress.lastName}
                onChange={onAddressChange('lastName')}
                onInput={syncAddressFieldFromInput('lastName')}
                onBlur={(event) => onAddressValueChange('lastName', event.currentTarget.value)}
                onAnimationStart={syncAddressFieldFromAutofill('lastName')}
                placeholder="Last name"
                autoComplete="shipping family-name"
              />
            </div>
            <div className="span-2" style={{ position: 'relative' }}>
              <label htmlFor="addr-line1" className="sr-only">Address line 1</label>
              <input
                id="addr-line1"
                type="text"
                name="address1"
                value={shippingAddress.address1}
                onChange={handleAddress1Change}
                placeholder="Address line 1"
                autoComplete="shipping address-line1"
                onFocus={() => {
                  if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
                }}
                onInput={syncAddressFieldFromInput('address1')}
                onBlur={(event) => {
                  onAddressValueChange('address1', event.currentTarget.value);
                  window.setTimeout(() => setShowAddressSuggestions(false), 120);
                }}
                onAnimationStart={syncAddressFieldFromAutofill('address1')}
              />
              {showAddressSuggestions && (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 20,
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: 'auto',
                    marginTop: 4
                  }}
                >
                  {addressSuggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion.id}
                      onMouseDown={() => onApplyAddressSuggestion(suggestion)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        background: 'transparent',
                        color: '#fff',
                        border: 0,
                        cursor: 'pointer'
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                  {loadingAddressSuggestions && (
                    <div style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.7)' }}>
                      Looking up addresses...
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="span-2">
              <label htmlFor="addr-line2" className="sr-only">Address line 2 (optional)</label>
              <input
                id="addr-line2"
                type="text"
                name="address2"
                value={shippingAddress.address2}
                onChange={onAddressChange('address2')}
                onInput={syncAddressFieldFromInput('address2')}
                onBlur={(event) => onAddressValueChange('address2', event.currentTarget.value)}
                onAnimationStart={syncAddressFieldFromAutofill('address2')}
                placeholder="Address line 2"
                autoComplete="shipping address-line2"
              />
            </div>
            <div>
              <label htmlFor="addr-city" className="sr-only">City</label>
              <input
                id="addr-city"
                type="text"
                name="city"
                value={shippingAddress.city}
                onChange={onAddressChange('city')}
                onInput={syncAddressFieldFromInput('city')}
                onBlur={(event) => onAddressValueChange('city', event.currentTarget.value)}
                onAnimationStart={syncAddressFieldFromAutofill('city')}
                placeholder="City"
                autoComplete="shipping address-level2"
              />
            </div>
            <div>
              <label htmlFor="addr-province" className="sr-only">State / Province</label>
              <input
                id="addr-province"
                type="text"
                name="province"
                value={shippingAddress.province}
                onChange={onAddressChange('province')}
                onInput={syncAddressFieldFromInput('province')}
                onBlur={(event) => onAddressValueChange('province', event.currentTarget.value)}
                onAnimationStart={syncAddressFieldFromAutofill('province')}
                placeholder="State / Province"
                autoComplete="shipping address-level1"
              />
            </div>
            <div>
              <label htmlFor="addr-postal" className="sr-only">Postal code</label>
              <input
                id="addr-postal"
                type="text"
                name="postalCode"
                value={shippingAddress.postalCode}
                onChange={onAddressChange('postalCode')}
                onInput={syncAddressFieldFromInput('postalCode')}
                onBlur={(event) => onAddressValueChange('postalCode', event.currentTarget.value)}
                onAnimationStart={syncAddressFieldFromAutofill('postalCode')}
                placeholder="Postal code"
                autoComplete="shipping postal-code"
                inputMode="numeric"
              />
            </div>
            <div>
              <label htmlFor="addr-phone" className="sr-only">Phone</label>
              <input
                id="addr-phone"
                type="tel"
                name="phone"
                value={shippingAddress.phone}
                onChange={onAddressChange('phone')}
                onInput={syncAddressFieldFromInput('phone')}
                onBlur={(event) => onAddressValueChange('phone', event.currentTarget.value)}
                onAnimationStart={syncAddressFieldFromAutofill('phone')}
                placeholder="Phone"
                autoComplete="shipping tel"
                inputMode="tel"
              />
            </div>
          </div>
          </fieldset>

          <label htmlFor="addr-country">Country or region</label>
          <select
            id="addr-country"
            name="countryCode"
            value={shippingAddress.countryCode.toUpperCase()}
            onChange={onAddressChange('countryCode')}
            onInput={syncAddressFieldFromInput('countryCode')}
            onBlur={(event) => onAddressValueChange('countryCode', event.currentTarget.value)}
            onAnimationStart={syncAddressFieldFromAutofill('countryCode')}
            autoComplete="shipping country"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="JP">Japan</option>
            <option value="IN">India</option>
          </select>
        </>
      ) : (
        <p className="muted">Install-only package selected. No shipping required.</p>
      )}

      <button
        type="button"
        className="checkout-v2-calc btn-plain"
        onClick={() => void onCalculateShipping()}
        disabled={loadingRates}
      >
        {loadingRates
          ? 'Preparing...'
          : requiresShipping
            ? 'Calculate shipping'
            : 'Continue to payment'}
      </button>

      {requiresShipping && (
        <>
          {/* fieldset/legend for rate group — WCAG 1.3.1, roles for radio-like buttons */}
          <fieldset className="checkout-rates-fieldset">
            <legend>Shipping method</legend>
          <div className="checkout-v2-rates" role="radiogroup" aria-label="Shipping method">
            {selectableRates.length === 0 ? (
              <p className="muted">Enter shipping info and calculate rates to continue.</p>
            ) : (
              selectableRates.map((rate) => {
                const isSelected = selectedRateId === rate.id;
                return (
                  <button
                    type="button"
                    key={rate.id}
                    role="radio"
                    aria-checked={isSelected}
                    className={`rate ${isSelected ? 'selected' : ''}`}
                    onClick={() => void onSelectRate(rate)}
                    disabled={selectingShipping}
                  >
                    <span>{rate.label}</span>
                    <span>{formatCurrency(rate.amountCents)}</span>
                  </button>
                );
              })
            )}
          </div>
          </fieldset>
        </>
      )}

      <p id="nonready-card-information-label" className="checkout-v2-field-label">
        Card information
      </p>

      <label htmlFor="nonready-cc-name">Name on card</label>
      <input
        id="nonready-cc-name"
        type="text"
        name="cc-name"
        value={`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()}
        autoComplete="cc-name"
        readOnly
      />
    </>
  );
}

function StripePaymentPane({
  cartId,
  cart,
  clientSecret,
  shippingAddress,
  selectedRateId,
  requiresShipping,
  processing,
  setProcessing,
  setError
}: {
  cartId: string;
  cart: Cart;
  clientSecret: string;
  shippingAddress: ShippingAddress;
  selectedRateId: string | null;
  requiresShipping: boolean;
  processing: boolean;
  setProcessing: (value: boolean) => void;
  setError: (value: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [applePayRequest, setApplePayRequest] = useState<PaymentRequest | null>(null);
  const [applePayReady, setApplePayReady] = useState(false);

  const handleConfirmedPaymentIntent = (paymentIntent: { id: string; status?: string } | null | undefined): boolean => {
    if (paymentIntent?.status === 'succeeded') {
      window.location.href = '/order/confirmation?payment_intent=' + paymentIntent.id;
      return true;
    }

    if (paymentIntent?.status === 'processing') {
      window.location.href = '/order/confirmation?payment_intent=' + paymentIntent.id;
      return true;
    }

    if (paymentIntent?.status === 'requires_action') {
      setError(
        'Additional authentication is required. Please complete verification and try again.'
      );
      return true;
    }

    if (paymentIntent?.status === 'requires_payment_method') {
      setError(
        'Payment method was not accepted. Please review your payment details and try again.'
      );
      return true;
    }

    if (paymentIntent?.status) {
      setError(`Payment did not complete (status: ${paymentIntent.status}). Please try again.`);
      return true;
    }

    return false;
  };

  useEffect(() => {
    let cancelled = false;

    if (!stripe || !clientSecret) {
      setApplePayRequest(null);
      setApplePayReady(false);
      return;
    }

    const totalAmount = Math.max(0, Math.round(cart?.total_cents ?? 0));
    if (totalAmount <= 0) {
      setApplePayRequest(null);
      setApplePayReady(false);
      return;
    }

    const countryCode = normalizeCountryCode(shippingAddress.countryCode) || 'US';
    const request = stripe.paymentRequest({
      country: countryCode,
      currency: 'usd',
      total: {
        label: 'FAS Motorsports',
        amount: totalAmount
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestShipping: false
    });

    void request
      .canMakePayment()
      .then((result) => {
        if (cancelled) return;
        const isApplePayAvailable = Boolean(result && (result as Record<string, unknown>).applePay);
        setApplePayReady(isApplePayAvailable);
        setApplePayRequest(isApplePayAvailable ? request : null);
      })
      .catch(() => {
        if (cancelled) return;
        setApplePayReady(false);
        setApplePayRequest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [stripe, clientSecret, cart?.total_cents, shippingAddress.countryCode]);

  useEffect(() => {
    if (!stripe || !applePayRequest || !clientSecret) return;

    const handleApplePayMethod = async (event: any) => {
      setProcessing(true);
      setError(null);

      try {
        const confirmation = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: event.paymentMethod.id
          },
          { handleActions: false }
        );

        if (confirmation.error) {
          event.complete('fail');
          setError(confirmation.error.message || 'Apple Pay failed. Please try again.');
          return;
        }

        event.complete('success');

        let resolvedIntent = confirmation.paymentIntent;
        if (resolvedIntent?.status === 'requires_action') {
          const actionResult = await stripe.confirmCardPayment(clientSecret);
          if (actionResult.error) {
            setError(actionResult.error.message || 'Authentication failed. Please try again.');
            return;
          }
          resolvedIntent = actionResult.paymentIntent;
        }

        if (!handleConfirmedPaymentIntent(resolvedIntent as any)) {
          setError('Unable to confirm Apple Pay payment. Please try another payment method.');
        }
      } catch (error) {
        console.error('Apple Pay error:', error);
        setError('Apple Pay failed. Please try another payment method.');
      } finally {
        setProcessing(false);
      }
    };

    applePayRequest.on('paymentmethod', handleApplePayMethod);
    return () => {
      applePayRequest.off('paymentmethod', handleApplePayMethod);
    };
  }, [stripe, applePayRequest, clientSecret, setError, setProcessing]);

  const submit = async () => {
    if (!stripe || !elements) return;

    if (requiresShipping && !selectedRateId) {
      setError('Please select a shipping option');
      return;
    }

    if (requiresShipping && !isAddressComplete(shippingAddress)) {
      setError('Please complete shipping address before paying');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const paymentElement = elements.getElement(PaymentElement);
      if (!paymentElement) {
        setError('Payment form is still loading. Please wait a moment and try again.');
        return;
      }

      // Build shipping for confirmParams.
      // IMPORTANT: shipping is intentionally NOT set on the PaymentIntent at
      // creation time (server-side). Setting it with a secret key then trying
      // to pass it again with the publishable key on confirm triggers
      // payment_intent_invalid_parameter (400). Passing it here (publishable
      // key, no prior secret-key lock) is both permitted and required for BNPL
      // methods like Klarna, Afterpay, and Link that need a shipping address.
      const confirmShipping =
        requiresShipping &&
        shippingAddress.firstName &&
        shippingAddress.address1 &&
        shippingAddress.city &&
        shippingAddress.postalCode &&
        shippingAddress.countryCode
          ? {
              name:
                `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() || 'Customer',
              phone: shippingAddress.phone || undefined,
              address: {
                line1: shippingAddress.address1,
                line2: shippingAddress.address2 || undefined,
                city: shippingAddress.city,
                state: shippingAddress.province,
                postal_code: shippingAddress.postalCode,
                country: shippingAddress.countryCode || 'US'
              }
            }
          : undefined;

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmation`,
          receipt_email: shippingAddress.email || cart.email,
          shipping: confirmShipping
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return;
      }

      if (handleConfirmedPaymentIntent(paymentIntent as any)) {
        return;
      }

      setError('Unable to confirm payment. Please try again.');
    } catch (error) {
      console.error('Payment error:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('mounted Payment Element')) {
        setError('Payment form failed to initialize. Please refresh and try again.');
      } else {
        setError('Payment failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {applePayReady && applePayRequest && (
        <>
          <div className="checkout-v2-pay-top">
            <PaymentRequestButtonElement
              options={{
                paymentRequest: applePayRequest,
                style: {
                  paymentRequestButton: {
                    type: 'buy',
                    theme: 'dark',
                    height: '44px'
                  }
                }
              }}
            />
          </div>
          <div className="checkout-v2-divider">Or pay another way</div>
        </>
      )}

      <label htmlFor="stripe-email">Email</label>
      <input
        id="stripe-email"
        type="email"
        name="email"
        value={shippingAddress.email || cart.email || ''}
        autoComplete="email"
        readOnly
      />

      <p id="stripe-card-information-label" className="checkout-v2-field-label">
        Card information
      </p>
      <div className="checkout-v2-payment-element" role="group" aria-labelledby="stripe-card-information-label">
        <PaymentElement
          onReady={() => setPaymentElementReady(true)}
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false
            }
          }}
        />
      </div>

      <label htmlFor="stripe-cc-name">Name on card</label>
      <input
        id="stripe-cc-name"
        type="text"
        name="cc-name"
        value={`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()}
        autoComplete="cc-name"
        readOnly
      />

      <label htmlFor="stripe-country">Country or region</label>
      <input
        id="stripe-country"
        type="text"
        name="country"
        value={shippingAddress.countryCode.toUpperCase()}
        autoComplete="shipping country"
        readOnly
      />

      <button
        type="button"
        className="checkout-v2-pay-bottom btn-plain"
        disabled={processing || !stripe || !paymentElementReady}
        onClick={() => void submit()}
      >
        {processing ? 'Processing...' : 'Pay'}
      </button>
    </>
  );
}

function isAddressComplete(address: ShippingAddress): boolean {
  return !!(
    address.address1 &&
    address.city &&
    address.province &&
    address.postalCode &&
    address.countryCode &&
    address.email
  );
}
