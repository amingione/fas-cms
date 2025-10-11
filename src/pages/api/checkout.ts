import Stripe from 'stripe';
import { readSession } from '../../server/auth/session';
import {
  computeShippingQuote,
  type CartItemInput as ShippingCartItem,
  type Destination as ShippingDestination,
  type ShippingRate as CalculatedRate
} from '@/server/shipping/quote';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
});

const configuredBaseUrl = import.meta.env.PUBLIC_BASE_URL || '';

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    return url.origin;
  } catch {
    return baseUrl.replace(/\/+$/, '');
  }
}

function validateBaseUrl(baseUrl: string): Response | null {
  if (!baseUrl || !baseUrl.startsWith('http')) {
    console.error('❌ Invalid PUBLIC_BASE_URL:', baseUrl);
    return new Response(
      JSON.stringify({
        error: 'PUBLIC_BASE_URL is missing or invalid. Must start with http or https.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

const CARRIER_LABELS: Record<string, string> = {
  usps: 'USPS',
  ups: 'UPS',
  fedex: 'FedEx',
  dhl: 'DHL',
  ontrac: 'OnTrac'
};

function humanizeToken(token: string): string {
  const lower = token.toLowerCase();
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
  return cleaned.split(' ').filter(Boolean).map(humanizeToken).join(' ');
}

function formatShippingDisplay(rate: CalculatedRate): string {
  const rawService = rate.service || rate.serviceName || rate.serviceCode || 'Shipping';
  const service = humanizeCode(rawService) || 'Shipping';
  const carrier = humanizeCode(rate.carrier || '');
  const serviceLower = service.toLowerCase();
  const carrierLower = carrier.toLowerCase();
  if (!carrier) return service;
  if (carrierLower && serviceLower.startsWith(carrierLower)) return service;
  if (serviceLower.includes(`(${carrierLower})`)) return service;
  return `${service} (${carrier})`;
}

export async function POST({ request }: { request: Request }) {
  // Resolve base URL: prefer explicit env var, else Origin header during dev/preview
  const origin = request.headers.get('origin') || '';
  const xfProto = request.headers.get('x-forwarded-proto') || '';
  const xfHost = request.headers.get('x-forwarded-host') || '';
  const forwarded = xfProto && xfHost ? `${xfProto}://${xfHost}` : '';
  const rawBaseUrl = configuredBaseUrl || forwarded || origin;
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const validationError = validateBaseUrl(baseUrl);
  if (validationError) return validationError;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Missing or invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { cart, shipping: shippingInput, shippingRate: requestedRate } = body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return new Response(JSON.stringify({ error: 'Cart is empty or invalid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const normalizeCartId = (rawId?: string | null): string => {
    if (!rawId) return '';
    const trimmed = String(rawId).trim();
    if (!trimmed) return '';
    const [id] = trimmed.split('::');
    return id || trimmed;
  };

  type CartItem = { id?: string; sku?: string; name: string; price: number; quantity: number };
  const lineItems = (cart as CartItem[]).map((item) => {
    const rawId = typeof item.id === 'string' ? item.id : undefined;
    const sanityProductId = normalizeCartId(rawId);
    const unitAmount = Number.isFinite(item.price)
      ? Math.max(0, Math.round(Number(item.price) * 100))
      : 0;
    if (unitAmount <= 0) {
      console.warn('[checkout] Cart item missing price, defaulting to $0.00', item);
    }
    const quantity = Math.max(1, Number.isFinite(item.quantity) ? Number(item.quantity) : 1);

    return {
      price_data: {
        currency: 'usd',
        tax_behavior: 'exclusive',
        product_data: {
          name: item.name || 'Item',
          tax_code: 'txcd_99999999',
          // Help fulfillment map back to Sanity/Inventory
          metadata: {
            ...(item.sku ? { sku: String(item.sku) } : {}),
            ...(sanityProductId ? { sanity_product_id: sanityProductId } : {})
          }
        },
        unit_amount: unitAmount
      },
      quantity
    } satisfies Stripe.Checkout.SessionCreateParams.LineItem;
  });

  // Persist compact cart metadata (Stripe metadata fields are strings and size-limited)
  let metaCart = '';
  try {
    const compact = cart.map((i: any) => ({ n: i?.name, q: i?.quantity, p: i?.price }));
    metaCart = JSON.stringify(compact);
    if (metaCart.length > 450) metaCart = metaCart.slice(0, 450);
  } catch (error) {
    void error;
  }

  // Derive optional user identity for reliable joins in webhook
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { session } = await readSession(request);
    if (session?.user) {
      userId = String(session.user.id || '');
      userEmail = String(session.user.email || '');
    }
  } catch (error) {
    void error;
  }

  // Prepare shipping-related data (optional)
  type NormalizedShipping = ShippingDestination & {
    email?: string;
  };
  const hasShippingInput = shippingInput && typeof shippingInput === 'object';
  const normalizedDestination: NormalizedShipping | undefined = hasShippingInput
    ? {
        name: String(shippingInput.name || ''),
        phone: shippingInput.phone ? String(shippingInput.phone) : undefined,
        email: shippingInput.email ? String(shippingInput.email) : undefined,
        addressLine1: String(shippingInput.addressLine1 || ''),
        addressLine2: shippingInput.addressLine2 ? String(shippingInput.addressLine2) : undefined,
        city: String(shippingInput.city || ''),
        state: String(shippingInput.state || ''),
        postalCode: String(shippingInput.postalCode || ''),
        country: String(shippingInput.country || 'US')
      }
    : undefined;

  const cartForQuote: ShippingCartItem[] = (cart as CartItem[]).map((item) => ({
    id: normalizeCartId(item.id),
    quantity: Number(item.quantity || 1)
  }));

  let shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] | undefined;
  let selectedRate: CalculatedRate | undefined;
  let shippingMetadata: Record<string, string> = {};
  let installOnlyQuote = false;

  if (normalizedDestination) {
    try {
      const quote = await computeShippingQuote(cartForQuote, normalizedDestination);
      if (quote.installOnly) {
        installOnlyQuote = true;
      } else if (quote.freight) {
        return new Response(
          JSON.stringify({
            error:
              'This order requires a freight quote. Please contact support to complete your purchase.'
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (!installOnlyQuote && quote.success && quote.rates.length) {
        const requestedMatch: CalculatedRate | undefined = quote.rates.find((rate) => {
          if (!requestedRate) return false;
          const serviceCode = String(requestedRate.serviceCode || '') || undefined;
          const carrier = String(requestedRate.carrier || '') || undefined;
          const amount = Number(requestedRate.amount);
          const codeMatches = serviceCode
            ? (rate.serviceCode || '').toLowerCase() === serviceCode.toLowerCase()
            : false;
          const carrierMatches = carrier
            ? (rate.carrier || '').toLowerCase() === carrier.toLowerCase()
            : false;
          const amountMatches = Number.isFinite(amount)
            ? Math.round(rate.amount * 100) === Math.round(amount * 100)
            : false;
          return (codeMatches && carrierMatches) || (codeMatches && amountMatches) || amountMatches;
        });

        selectedRate = requestedMatch || quote.bestRate || quote.rates[0];

        const deliverableRates = quote.rates.slice(0, 3);
        const sortedRates = deliverableRates.sort((a, b) => a.amount - b.amount);

        // Ensure selected rate is first in the list so it appears as default in Stripe UI
        if (selectedRate) {
          sortedRates.sort((a, b) => {
            if (a === selectedRate) return -1;
            if (b === selectedRate) return 1;
            return a.amount - b.amount;
          });
        }

        shippingOptions = sortedRates.map((rate) => {
          const amount = Math.max(0, Math.round(rate.amount * 100));
          const displayName = formatShippingDisplay(rate);

          const deliveryEstimate = rate.deliveryDays
            ? {
                minimum: { unit: 'business_day' as const, value: Math.max(1, rate.deliveryDays) },
                maximum: { unit: 'business_day' as const, value: Math.max(1, rate.deliveryDays) }
              }
            : undefined;

          return {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount,
                currency: (rate.currency || 'USD').toLowerCase()
              },
              display_name: displayName,
              tax_behavior: 'exclusive',
              tax_code: 'txcd_92010001',
              delivery_estimate: deliveryEstimate,
              metadata: {
                carrier: rate.carrier || '',
                service_code: rate.serviceCode || ''
              }
            }
          } satisfies Stripe.Checkout.SessionCreateParams.ShippingOption;
        });

        if (selectedRate) {
          const carrier = selectedRate.carrier || '';
          const carrierId = selectedRate.carrierId || '';
          const serviceCode = selectedRate.serviceCode || '';
          const serviceName =
            selectedRate.service || selectedRate.serviceName || selectedRate.serviceCode || '';
          const amount = Number.isFinite(selectedRate.amount) ? selectedRate.amount : 0;
          const currency =
            (typeof selectedRate.currency === 'string' && selectedRate.currency.trim()) ||
            (normalizedDestination?.country === 'CA' ? 'CAD' : 'USD');
          const deliveryDays =
            typeof selectedRate.deliveryDays === 'number' && Number.isFinite(selectedRate.deliveryDays)
              ? String(selectedRate.deliveryDays)
              : undefined;
          const estimatedDeliveryDate =
            typeof selectedRate.estimatedDeliveryDate === 'string' &&
            selectedRate.estimatedDeliveryDate
              ? selectedRate.estimatedDeliveryDate
              : undefined;

          const currencyCode = (currency || 'USD').toUpperCase();

          shippingMetadata = {
            shipping_carrier: carrier,
            ...(carrierId ? { shipping_carrier_id: carrierId } : {}),
            ...(serviceCode ? { shipping_service_code: serviceCode } : {}),
            ...(serviceName ? { shipping_service: serviceName, shipping_service_name: serviceName } : {}),
            shipping_amount: amount.toFixed(2),
            shipping_currency: currencyCode,
            ...(deliveryDays ? { shipping_delivery_days: deliveryDays } : {}),
            ...(estimatedDeliveryDate
              ? { shipping_estimated_delivery_date: estimatedDeliveryDate }
              : {})
          };
        }
      } else if (installOnlyQuote) {
        shippingOptions = [];
      }
    } catch (err) {
      console.error('❌ Shipping quote failed, falling back to flat rates:', err);
      shippingOptions = undefined;
    }
  }

  try {
    const sessionMetadata: Record<string, string> = {
      ...(userId ? { userId } : {}),
      ...(userEmail ? { userEmail } : {}),
      site: baseUrl,
      ...shippingMetadata
    };

    const paymentIntentMetadata = { ...sessionMetadata };

  const shippingAddressCollection: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection =
    {
      allowed_countries: ['US', 'CA']
    };

  const customerEmail = userEmail || normalizedDestination?.email || undefined;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      // Offer standard cards plus Affirm financing at checkout
      payment_method_types: ['card', 'affirm'],
      mode: 'payment',
      line_items: lineItems,
      metadata: { ...sessionMetadata, ...(metaCart ? { cart: metaCart } : {}) },
      payment_intent_data: {
        metadata: paymentIntentMetadata
      },
      tax_id_collection: { enabled: true },
      // Enable Stripe Tax for automatic sales tax calculation
      automatic_tax: { enabled: true },
      shipping_address_collection: shippingAddressCollection,
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`
    };

    // Guard rail: Stripe rejects automatic tax when payment_intent_data.shipping is present.
    if (sessionParams.payment_intent_data && 'shipping' in sessionParams.payment_intent_data) {
      delete (sessionParams.payment_intent_data as { shipping?: unknown }).shipping;
    }

    sessionParams.customer_creation = 'if_required';
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    if (installOnlyQuote) {
      sessionParams.shipping_options = undefined;
    } else if (shippingOptions && shippingOptions.length) {
      sessionParams.shipping_options = shippingOptions;
    } else {
      sessionParams.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: 'usd' },
            display_name: 'Standard Shipping (5–7 business days)',
            tax_behavior: 'exclusive',
            tax_code: 'txcd_92010001',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 }
            }
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 3500, currency: 'usd' },
            display_name: 'Expedited Shipping (2–3 business days)',
            tax_behavior: 'exclusive',
            tax_code: 'txcd_92010001',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 }
            }
          }
        }
      ];
    }

    // With automatic tax enabled, Stripe expects to collect the shipping address at checkout.
    // Avoid passing payment_intent_data.shipping so we don't trigger the "cannot enable automatic tax" error.
    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Stripe Checkout Session Error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
