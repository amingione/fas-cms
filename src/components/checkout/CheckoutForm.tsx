import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import './CheckoutForm.css';
import { ensureMedusaCartId, getCart, persistCartLocally, syncMedusaCart } from '@/lib/cart';
import { MEDUSA_CART_ID_KEY } from '@/lib/medusa';

const CHECKOUT_IMAGE_FALLBACK = '/placeholder.webp';

interface ShippingRate {
  id: string;
  name?: string;
  amount?: number;
  calculated_price?: number;
  price_type?: string;
  data?: Record<string, any>;
  region?: { currency_code?: string };
}

type ShippoRate = {
  rate_id: string;
  amount: string;
  currency: string;
  provider?: string;
  servicelevel?: string;
  estimated_days?: number | null;
};

type SelectableShippingRate = {
  id: string;
  optionId: string;
  label: string;
  amountCents: number;
  shippoRate?: ShippoRate | null;
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

interface Cart {
  id: string;
  items: CartItem[];
  subtotal_cents: number;
  tax_amount_cents?: number;
  shipping_amount_cents: number;
  discount_amount_cents?: number;
  applied_discount_codes?: string[];
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

function toShippoAmountCents(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value !== 'string') return 0;
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
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
        existing.find((entry) => toLocalCartId(entry.id) === toLocalCartId(serverItem.local_item_id)) ??
        existing.find(
          (entry) =>
            String((entry as any).medusaLineItemId || '').trim() ===
            String(serverItem.medusa_line_item_id || '').trim()
        ) ??
        existing.find(
          (entry) =>
            toLocalCartId(entry.medusaVariantId || '') === toLocalCartId(serverItem.medusa_variant_id || '')
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
        medusaVariantId: resolvedVariantId,
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

function isInstallOnlyLineItem(item: CartItem): boolean {
  if (item.install_only === true) return true;
  const shippingClass = String(item.shipping_class || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return (
    shippingClass.includes('installonly') ||
    shippingClass.includes('service')
  );
}

function normalizeShippoServiceLabel(rate: ShippoRate): string {
  const raw = `${rate.servicelevel || ''}`.trim().toLowerCase();
  if (!raw) return 'UPS';
  if (raw.includes('ground')) return 'Standard Ground';
  if (raw.includes('3') && raw.includes('day')) return '3 Day';
  if (raw.includes('2') && raw.includes('day')) return '2nd Day';
  if (raw.includes('second') && raw.includes('day')) return '2nd Day';
  if (raw.includes('next') && raw.includes('day')) return 'Next Day';
  if (raw.includes('overnight')) return 'Next Day';
  return rate.servicelevel || 'UPS';
}

function rankServiceLabel(label: string): number {
  switch (label) {
    case 'Standard Ground':
      return 0;
    case '3 Day':
      return 1;
    case '2nd Day':
      return 2;
    case 'Next Day':
      return 3;
    default:
      return 10;
  }
}

function buildSelectableRates(
  shippingRates: ShippingRate[],
  shippoRates: ShippoRate[]
): SelectableShippingRate[] {
  if (!shippingRates.length) return [];
  const upsOption =
    shippingRates.find((rate) => String(rate?.data?.carrier || '').toLowerCase() === 'ups') ??
    shippingRates[0];
  const baseOption = upsOption;
  if (!baseOption?.id) return [];

  if (!shippoRates.length) {
    return shippingRates.map((rate) => ({
      id: rate.id,
      optionId: rate.id,
      label: rate.name || rate.data?.service_name || 'Shipping option',
      amountCents: resolveShippingOptionAmountCents(rate) ?? 0,
      shippoRate: null
    }));
  }

  const byLabel = new Map<string, SelectableShippingRate>();
  for (const shippoRate of shippoRates) {
    if (!shippoRate?.rate_id) continue;
    const label = normalizeShippoServiceLabel(shippoRate);
    const choice: SelectableShippingRate = {
      id: `${baseOption.id}:${shippoRate.rate_id}`,
      optionId: baseOption.id,
      label,
      amountCents: toShippoAmountCents(shippoRate.amount),
      shippoRate
    };
    const existing = byLabel.get(label);
    if (!existing || choice.amountCents < existing.amountCents) {
      byLabel.set(label, choice);
    }
  }

  return Array.from(byLabel.values()).sort((a, b) => {
    const rankDelta = rankServiceLabel(a.label) - rankServiceLabel(b.label);
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
  const [shippoRates, setShippoRates] = useState<ShippoRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedShippoRate, setSelectedShippoRate] = useState<ShippoRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectingShipping, setSelectingShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [driftDebug, setDriftDebug] = useState<string | null>(null);
  const shippingSelectionRequestIdRef = useRef(0);
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
        console.info('[cart-debug] checkout load', {
          hasCartId: Boolean(id)
        });
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
          console.info('[cart-debug] checkout cart fetched', {
            itemCount: loaded.loaded ? (cart?.items?.length ?? 0) : 0,
            driftDetected: loaded.driftDetected
          });
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
    console.info('[cart-debug] checkout cart fetch result', {
      itemCount: Array.isArray(data?.cart?.items) ? data.cart.items.length : 0,
      driftDetected
    });
    setCart(data.cart);
    reconcileLocalCartFromCheckoutCart(data.cart);
    return { loaded: true, driftDetected };
  }

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

    if (!isAddressComplete(shippingAddress)) {
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
          email: shippingAddress.email,
          shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2,
            city: shippingAddress.city,
            province: shippingAddress.province,
            postalCode: shippingAddress.postalCode,
            countryCode: shippingAddress.countryCode,
            phone: shippingAddress.phone
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
      const liveRates = Array.isArray(data?.shippoRates) ? data.shippoRates : [];
      setShippingRates(options);
      setShippoRates(liveRates);
      setSelectedRateId(null);
      setSelectedOptionId(null);
      setSelectedShippoRate(null);
      await loadCart(cartId);
    } catch (err) {
      console.error('Shipping rates error:', err);
      setError('Unable to calculate shipping for this address. Please verify your address.');
      setShippingRates([]);
      setShippoRates([]);
      setSelectedRateId(null);
      setSelectedOptionId(null);
      setSelectedShippoRate(null);
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
    setSelectedShippoRate(rate.shippoRate || null);
    setError(null);
    setClientSecret(null);
    console.info('[cart-debug] shipping selection started', {
      requestId,
      rateId: rate.id,
      optionId: rate.optionId
    });

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
          shippoRate: rate.shippoRate || undefined
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to apply shipping option');
      }
      if (requestId !== shippingSelectionRequestIdRef.current) return;

      // Refresh base cart state (Medusa returns shipping_total=0 for calculated
      // price options until checkout completion — display is patched below using
      // the confirmed PaymentIntent amount as the source of truth).
      await loadCart(cartId);

      const intentResponse = await fetch('/api/medusa/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          shippoRate: rate.shippoRate || undefined
        })
      });
      if (!intentResponse.ok) {
        const payload = await intentResponse.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to initialize payment');
      }
      if (requestId !== shippingSelectionRequestIdRef.current) return;
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

      const breakdown = payload?.breakdown;
      if (breakdown && typeof breakdown === 'object') {
        const totalCents =
          typeof breakdown.total_cents === 'number' && Number.isFinite(breakdown.total_cents)
            ? breakdown.total_cents
            : 0;
        const shippingCents =
          typeof breakdown.shipping_amount_cents === 'number' &&
          Number.isFinite(breakdown.shipping_amount_cents)
            ? breakdown.shipping_amount_cents
            : 0;
        const taxCents =
          typeof breakdown.tax_amount_cents === 'number' && Number.isFinite(breakdown.tax_amount_cents)
            ? breakdown.tax_amount_cents
            : 0;
        const subtotalCents =
          typeof breakdown.subtotal_cents === 'number' && Number.isFinite(breakdown.subtotal_cents)
            ? breakdown.subtotal_cents
            : 0;
        setCart((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            subtotal_cents: subtotalCents || prev.subtotal_cents,
            shipping_amount_cents: shippingCents,
            tax_amount_cents: taxCents,
            total_cents: totalCents || prev.total_cents
          };
        });
      }

      setClientSecret(payload.client_secret);
      console.info('[cart-debug] shipping selection completed', { requestId, rateId: rate.id });
    } catch (err) {
      if (requestId !== shippingSelectionRequestIdRef.current) return;
      console.error('Failed to update shipping:', err);
      setError('Failed to update shipping. Please try again.');
      setSelectedRateId(null);
      setSelectedOptionId(null);
      setSelectedShippoRate(null);
      console.info('[cart-debug] shipping selection failed', { requestId, rateId: rate.id });
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
    const shippingFromSelection = selectedShippoRate ? toShippoAmountCents(selectedShippoRate.amount) : null;
    const shippingFromCart = Math.max(0, cart?.shipping_amount_cents ?? 0);
    const selectedShippingCents =
      typeof shippingFromSelection === 'number' && Number.isFinite(shippingFromSelection)
        ? Math.max(0, shippingFromSelection)
        : shippingFromCart;

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
      authoritativeTotalCents - Math.max(0, itemSubtotalCents) - selectedShippingCents + discountCents
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
    selectedOptionId,
    selectedShippoRate
  ]);

  async function refreshPaymentIntentAfterCartChange(currentCartId: string): Promise<void> {
    if (!clientSecret) return;
    const response = await fetch('/api/medusa/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartId: currentCartId,
        shippoRate: selectedShippoRate || undefined
      })
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
        <span>
          {cartCount} item{cartCount === 1 ? '' : 's'}
        </span>
      </div>
      {import.meta.env.DEV && driftDebug && (
        <p className="checkout-v2-error" style={{ marginBottom: '0.75rem', color: '#34d399' }}>
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
                    alt={product.title}
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
                    <p className="checkout-v2-variant">{product.variant_title || 'Default'}</p>
                  </div>
                  <p className="checkout-v2-price">{formatCurrency(product.total)}</p>
                </div>
              </div>
            ))}

            <div className="checkout-v2-discount">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Discount code"
                autoComplete="off"
              />
              <button
                type="button"
                disabled={applyingDiscount || !discountCode.trim()}
                onClick={() => void mutateDiscountCode('apply', discountCode)}
              >
                {applyingDiscount ? 'Applying...' : 'Apply'}
              </button>
            </div>
            {Array.isArray(cart.applied_discount_codes) && cart.applied_discount_codes.length > 0 && (
              <div className="checkout-v2-discount-applied">
                {cart.applied_discount_codes.map((code) => (
                  <div key={code} className="checkout-v2-discount-code">
                    <span>{code}</span>
                    <button
                      type="button"
                      disabled={applyingDiscount}
                      onClick={() => void mutateDiscountCode('remove', code)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {discountMessage && <p className="muted">{discountMessage}</p>}

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
                        colorPrimary: '#dc2626',
                        colorBackground: '#0f0f0f',
                        colorText: '#ffffff'
                      }
                    }
                  }}
                >
                  <StripePaymentPane
                    cartId={cartId}
                    cart={cart}
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
                shippoRates={shippoRates}
                selectedRateId={selectedRateId}
                selectedShippoRate={selectedShippoRate}
                onAddressChange={updateAddressField}
                onApplyAddressSuggestion={applyAddressSuggestion}
                onCalculateShipping={handleCalculateShipping}
                onSelectRate={selectShippingRate}
                selectingShipping={selectingShipping}
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
  shippoRates,
  selectedRateId,
  selectedShippoRate,
  selectingShipping,
  onAddressChange,
  onApplyAddressSuggestion,
  onCalculateShipping,
  onSelectRate
}: {
  shippingAddress: ShippingAddress;
  requiresShipping: boolean;
  loadingRates: boolean;
  shippingRates: ShippingRate[];
  shippoRates: ShippoRate[];
  selectedRateId: string | null;
  selectedShippoRate: ShippoRate | null;
  selectingShipping: boolean;
  onAddressChange: (
    field: keyof ShippingAddress
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onApplyAddressSuggestion: (suggestion: AddressSuggestion) => void;
  onCalculateShipping: () => Promise<void>;
  onSelectRate: (rate: SelectableShippingRate) => Promise<void>;
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
    () => buildSelectableRates(shippingRates, shippoRates),
    [shippingRates, shippoRates]
  );

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
              label: String(feature?.properties?.full_address || feature?.properties?.name || '').trim(),
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
          console.warn('[checkout] address lookup unavailable; continuing with manual address entry', lookupError);
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
      <button
        type="button"
        className="checkout-v2-pay-top"
        onClick={() => void onCalculateShipping()}
      >
        Apple Pay
      </button>

      <div className="checkout-v2-divider">Or pay another way</div>

      <label>Email</label>
      <input
        type="email"
        name="email"
        value={shippingAddress.email}
        onChange={onAddressChange('email')}
        placeholder="mail@example.com"
        autoComplete="email"
        inputMode="email"
      />

      {requiresShipping ? (
        <>
          <label>Shipping address</label>
          <div className="checkout-v2-address-grid">
            <input
              type="text"
              name="given-name"
              value={shippingAddress.firstName}
              onChange={onAddressChange('firstName')}
              placeholder="First name"
              autoComplete="shipping given-name"
            />
            <input
              type="text"
              name="family-name"
              value={shippingAddress.lastName}
              onChange={onAddressChange('lastName')}
              placeholder="Last name"
              autoComplete="shipping family-name"
            />
            <div className="span-2" style={{ position: 'relative' }}>
              <input
                type="text"
                name="address-line1"
                value={shippingAddress.address1}
                onChange={handleAddress1Change}
                placeholder="Address line 1"
                autoComplete="shipping address-line1"
                onFocus={() => {
                  if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowAddressSuggestions(false), 120);
                }}
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
            <input
              type="text"
              name="address-line2"
              value={shippingAddress.address2}
              onChange={onAddressChange('address2')}
              placeholder="Address line 2"
              className="span-2"
              autoComplete="shipping address-line2"
            />
            <input
              type="text"
              name="address-level2"
              value={shippingAddress.city}
              onChange={onAddressChange('city')}
              placeholder="City"
              autoComplete="shipping address-level2"
            />
            <input
              type="text"
              name="address-level1"
              value={shippingAddress.province}
              onChange={onAddressChange('province')}
              placeholder="State / Province"
              autoComplete="shipping address-level1"
            />
            <input
              type="text"
              name="postal-code"
              value={shippingAddress.postalCode}
              onChange={onAddressChange('postalCode')}
              placeholder="Postal code"
              autoComplete="shipping postal-code"
              inputMode="numeric"
            />
            <input
              type="tel"
              name="tel"
              value={shippingAddress.phone}
              onChange={onAddressChange('phone')}
              placeholder="Phone"
              autoComplete="shipping tel"
              inputMode="tel"
            />
          </div>

          <label>Country or region</label>
          <select
            name="country"
            value={shippingAddress.countryCode.toUpperCase()}
            onChange={onAddressChange('countryCode')}
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
        className="checkout-v2-calc"
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
          <label>Shipping method</label>
          <div className="checkout-v2-rates">
            {selectableRates.length === 0 ? (
              <p className="muted">Enter shipping info and calculate rates to continue.</p>
            ) : (
              selectableRates.map((rate) => {
                return (
                  <button
                    type="button"
                    key={rate.id}
                    className={`rate ${selectedRateId === rate.id ? 'selected' : ''}`}
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
        </>
      )}

      {selectedShippoRate && (
        <p className="muted">
          UPS quote: {normalizeShippoServiceLabel(selectedShippoRate)} {selectedShippoRate.amount}{' '}
          {selectedShippoRate.currency}
        </p>
      )}

      <label>Card information</label>

      <label>Name on card</label>
      <input
        type="text"
        name="cc-name"
        value={`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()}
        autoComplete="cc-name"
        readOnly
      />

      <button
        type="button"
        className="checkout-v2-pay-bottom"
        onClick={() => void onCalculateShipping()}
      >
        Pay
      </button>
    </>
  );
}

function StripePaymentPane({
  cartId,
  cart,
  shippingAddress,
  selectedRateId,
  requiresShipping,
  processing,
  setProcessing,
  setError
}: {
  cartId: string;
  cart: Cart;
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

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmation`,
          receipt_email: shippingAddress.email || cart.email,
          shipping: requiresShipping
            ? {
                name:
                  `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() ||
                  'Customer',
                phone: shippingAddress.phone,
                address: {
                  line1: shippingAddress.address1,
                  line2: shippingAddress.address2 || '',
                  city: shippingAddress.city,
                  state: shippingAddress.province,
                  postal_code: shippingAddress.postalCode,
                  country: shippingAddress.countryCode
                }
              }
            : undefined
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        window.location.href = '/order/confirmation?payment_intent=' + paymentIntent.id;
        return;
      }

      if (paymentIntent?.status === 'processing') {
        window.location.href = '/order/confirmation?payment_intent=' + paymentIntent.id;
        return;
      }

      if (paymentIntent?.status === 'requires_action') {
        setError(
          'Additional authentication is required. Please complete verification and try again.'
        );
        return;
      }

      if (paymentIntent?.status === 'requires_payment_method') {
        setError(
          'Payment method was not accepted. Please review your payment details and try again.'
        );
        return;
      }

      if (paymentIntent?.status) {
        setError(`Payment did not complete (status: ${paymentIntent.status}). Please try again.`);
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
      <button
        type="button"
        className="checkout-v2-pay-top"
        disabled={processing || !stripe}
        onClick={() => void submit()}
      >
        {processing ? 'Processing...' : 'Apple Pay'}
      </button>

      <div className="checkout-v2-divider">Or pay another way</div>

      <label>Email</label>
      <input
        type="email"
        name="email"
        value={shippingAddress.email || cart.email || ''}
        autoComplete="email"
        readOnly
      />

      <label>Card information</label>
      <div className="checkout-v2-payment-element">
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

      <label>Name on card</label>
      <input
        type="text"
        name="cc-name"
        value={`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()}
        autoComplete="cc-name"
        readOnly
      />

      <label>Country or region</label>
      <input
        type="text"
        name="country"
        value={shippingAddress.countryCode.toUpperCase()}
        autoComplete="shipping country"
        readOnly
      />

      <button
        type="button"
        className="checkout-v2-pay-bottom"
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
