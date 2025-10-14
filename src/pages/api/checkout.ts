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

function hostKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    const match = url.replace(/^https?:\/\//i, '').split('/')[0];
    return match ? match.replace(/^www\./i, '').toLowerCase() : null;
  }
}

const CARRIER_LABELS: Record<string, string> = {
  usps: 'USPS',
  ups: 'UPS',
  fedex: 'FedEx',
  dhl: 'DHL',
  ontrac: 'OnTrac'
};

const KNOWN_CARRIER_IDS: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /dhl/, id: 'se-3809716' },
  { pattern: /\bups\b/, id: 'se-3809553' },
  { pattern: /seko/, id: 'se-3809712' },
  { pattern: /fedex/, id: 'se-3809554' },
  { pattern: /(global\s*post)/, id: 'se-3809713' },
  { pattern: /(stamps|usps|postal)/, id: 'se-3809552' }
];

const STATE_MAP: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'district of columbia': 'DC',
  'washington dc': 'DC',
  'washington d c': 'DC',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'american samoa': 'AS',
  'guam': 'GU',
  'northern mariana islands': 'MP',
  'puerto rico': 'PR',
  'virgin islands': 'VI',
  'us virgin islands': 'VI',
  'u s virgin islands': 'VI',
  'american virgin islands': 'VI',
  'alberta': 'AB',
  'british columbia': 'BC',
  'manitoba': 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'newfoundland labrador': 'NL',
  'newfoundland': 'NL',
  'nova scotia': 'NS',
  'northwest territories': 'NT',
  'northwest territory': 'NT',
  'nunavut': 'NU',
  'ontario': 'ON',
  'prince edward island': 'PE',
  'pei': 'PE',
  'quebec': 'QC',
  'saskatchewan': 'SK',
  'yukon': 'YT',
  'yukon territory': 'YT'
};

const isAlphaTwo = (value: string) => /^[A-Za-z]{2}$/.test(value);

const normalizeStateCode = (rawValue: string): string => {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';
  if (isAlphaTwo(trimmed)) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  const normalizedKey = lower.replace(/[^a-z0-9]+/g, ' ').trim();
  if (STATE_MAP[normalizedKey]) return STATE_MAP[normalizedKey];
  if (STATE_MAP[lower]) return STATE_MAP[lower];
  const fallback = normalizedKey || lower;
  return fallback.length >= 2 ? fallback.slice(0, 2).toUpperCase() : trimmed.slice(0, 2).toUpperCase();
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

function inferCarrierId(carrier?: string, explicit?: string | null): string | undefined {
  const trimmed = (explicit || '').trim();
  if (trimmed) return trimmed;
  const normalized = (carrier || '').toLowerCase();
  if (!normalized) return undefined;
  for (const entry of KNOWN_CARRIER_IDS) {
    if (entry.pattern.test(normalized)) return entry.id;
  }
  return undefined;
}

export async function POST({ request }: { request: Request }) {
  // Resolve base URL: prefer explicit env var, else Origin header during dev/preview
  const origin = request.headers.get('origin') || '';
  const xfProto = request.headers.get('x-forwarded-proto') || '';
  const xfHost = request.headers.get('x-forwarded-host') || '';
  const forwarded = xfProto && xfHost ? `${xfProto}://${xfHost}` : '';
  const normalizedConfigured = normalizeBaseUrl(configuredBaseUrl);
  const normalizedRequest = normalizeBaseUrl(forwarded || origin);

  let baseUrl = normalizedRequest || normalizedConfigured;
  const configKey = hostKey(normalizedConfigured);
  const requestKey = hostKey(normalizedRequest);
  if (normalizedConfigured && configKey && requestKey && configKey === requestKey) {
    baseUrl = normalizedConfigured;
  } else if (!baseUrl && normalizedConfigured) {
    baseUrl = normalizedConfigured;
  }

  const validationTarget = baseUrl || normalizedConfigured || normalizedRequest;
  if (!validationTarget) {
    return new Response(
      JSON.stringify({ error: 'Unable to determine site base URL for checkout redirects.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const validationError = validateBaseUrl(validationTarget);
  if (validationError) return validationError;

  baseUrl = normalizeBaseUrl(validationTarget);

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

  type CartItem = {
    id?: string;
    sku?: string;
    name: string;
    price: number;
    quantity: number;
    options?: Record<string, string>;
    basePrice?: number;
    extra?: number;
    upgrades?: unknown;
    addOns?: unknown;
  };

  const clamp = (value: string, max = 500) =>
    value.length > max ? value.slice(0, max) : value;

  const formatSelectedOptions = (input?: Record<string, unknown>) => {
    if (!input || typeof input !== 'object') return null;
    const entries: Array<[string, string]> = Object.entries(input)
      .filter(([key, value]) => Boolean(key) && value != null && value !== '')
      .map(([key, value]) => [String(key), String(value)]);
    if (!entries.length) return null;
    const summary = entries.map(([key, value]) => `${key}: ${value}`).join(' • ');
    const json = JSON.stringify(Object.fromEntries(entries));
    return { entries, summary, json };
  };

  const collectUpgrades = (raw: unknown): string[] => {
    const values: string[] = [];
    const push = (val?: string | null) => {
      if (!val) return;
      const trimmed = val.trim();
      if (trimmed) values.push(trimmed);
    };
    if (Array.isArray(raw)) {
      raw.forEach((entry) => {
        if (typeof entry === 'string') push(entry);
        else if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>;
          push(
            (obj.label as string | undefined) ||
              (obj.name as string | undefined) ||
              (obj.title as string | undefined) ||
              (obj.value as string | undefined)
          );
        }
      });
    } else if (raw && typeof raw === 'object') {
      Object.values(raw).forEach((entry) => {
        if (typeof entry === 'string') push(entry);
      });
    } else if (typeof raw === 'string') {
      push(raw);
    }
    return Array.from(new Set(values));
  };

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
    const optionDetails = formatSelectedOptions(item.options);
    const upgradeValues = collectUpgrades(item.upgrades ?? item.addOns);
    const metadata: Record<string, string> = {
      ...(item.sku ? { sku: String(item.sku) } : {}),
      ...(sanityProductId ? { sanity_product_id: sanityProductId } : {})
    };
    if (optionDetails?.summary) {
      metadata.selected_options = clamp(optionDetails.summary);
      metadata.option_summary = clamp(optionDetails.summary);
    }
    if (optionDetails?.json) {
      metadata.selected_options_json = clamp(optionDetails.json);
      metadata.option_details_json = clamp(optionDetails.json);
    }
    if (optionDetails?.entries?.length) {
      optionDetails.entries.forEach(([label, value], idx) => {
        const index = idx + 1;
        metadata[`option${index}_name`] = clamp(label, 100);
        metadata[`option${index}_value`] = clamp(value, 200);
        const normalizedKey = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
        if (normalizedKey) {
          const keyName = `option_${normalizedKey}`;
          if (!(keyName in metadata)) metadata[keyName] = clamp(value, 200);
          if (!metadata.option_vehicle && (normalizedKey.includes('vehicle') || normalizedKey.includes('platform'))) {
            metadata.option_vehicle = clamp(value, 200);
          }
          if (normalizedKey.includes('upgrade') && !upgradeValues.includes(value)) {
            upgradeValues.push(value);
          }
        }
      });
    }
    if (upgradeValues.length) {
      const upgradeSummary = upgradeValues.join(', ');
      metadata.upgrades = clamp(upgradeSummary);
      const upgradePipe = upgradeValues.join('|');
      metadata.upgrade_list = clamp(upgradePipe);
      metadata.upgrade_titles = clamp(upgradePipe);
      upgradeValues.forEach((value, idx) => {
        metadata[`upgrade_${idx + 1}`] = clamp(value, 200);
      });
    }
    if (typeof item.basePrice === 'number' && Number.isFinite(item.basePrice)) {
      metadata.base_price = Number(item.basePrice).toFixed(2);
    }
    if (typeof item.extra === 'number' && Number.isFinite(item.extra)) {
      metadata.option_upcharge = Number(item.extra).toFixed(2);
    }
    const descriptionParts: string[] = [];
    if (optionDetails?.summary) descriptionParts.push(optionDetails.summary);
    if (upgradeValues.length) descriptionParts.push(`Upgrades: ${upgradeValues.join(', ')}`);
    const description = descriptionParts.length ? clamp(descriptionParts.join(' • '), 250) : undefined;

    return {
      price_data: {
        currency: 'usd',
        tax_behavior: 'exclusive',
        product_data: {
          name: item.name || 'Item',
          tax_code: 'txcd_99999999',
          ...(description ? { description } : {}),
          // Help fulfillment map back to Sanity/Inventory and capture configured options
          metadata
        },
        unit_amount: unitAmount
      },
      quantity
    } satisfies Stripe.Checkout.SessionCreateParams.LineItem;
  });

  // Persist compact cart metadata (Stripe metadata fields are strings and size-limited)
  let metaCart = '';
  try {
    const compact = (cart as CartItem[]).map((i) => {
      const opts = formatSelectedOptions(i?.options || undefined)?.summary;
      const upgrades = collectUpgrades(i?.upgrades ?? i?.addOns);
      return {
        n: i?.name,
        q: i?.quantity,
        p: i?.price,
        ...(opts ? { o: opts.slice(0, 120) } : {}),
        ...(upgrades.length ? { u: upgrades.join(', ').slice(0, 120) } : {})
      };
    });
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
        state: normalizeStateCode(String(shippingInput.state || '')),
        postalCode: String(shippingInput.postalCode || ''),
        country: String(shippingInput.country || 'US').toUpperCase()
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
        const installOnlyCurrency =
          normalizedDestination?.country === 'CA' ? 'CAD' : 'USD';
        shippingMetadata = {
          shipping_carrier: 'Install Only',
          shipping_service: 'Install-Only Service',
          shipping_service_name: 'Install-Only Service',
          shipping_amount: '0.00',
          shipping_currency: installOnlyCurrency,
          shipping_install_only: 'true'
        };
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
          const currencyCode = (rate.currency || 'USD').toUpperCase();
          const inferredCarrierId = inferCarrierId(rate.carrier, rate.carrierId);
          const serviceCode = rate.serviceCode || '';
          const serviceName = rate.service || rate.serviceName || rate.serviceCode || '';

          const optionMetadata: Record<string, string> = {
            amount: (amount / 100).toFixed(2),
            currency: currencyCode,
            source: 'shipengine'
          };
          if (rate.carrier) optionMetadata.carrier = rate.carrier;
          if (inferredCarrierId) optionMetadata.carrier_id = inferredCarrierId;
          if (serviceCode) optionMetadata.service_code = serviceCode;
          if (serviceName) optionMetadata.service = serviceName;

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
              metadata: optionMetadata
            }
          } satisfies Stripe.Checkout.SessionCreateParams.ShippingOption;
        });

        if (selectedRate) {
          const carrier = selectedRate.carrier || '';
          const carrierId = inferCarrierId(selectedRate.carrier, selectedRate.carrierId) || '';
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
    const shippingAddressCollection: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection | undefined =
      installOnlyQuote
        ? undefined
        : {
            allowed_countries: ['US', 'CA']
          };

    const customerEmail = userEmail || normalizedDestination?.email || undefined;

    const applyOptionMetadata = (meta?: Record<string, string>) => {
      if (!meta) return;
      const carrierLabel = meta.carrier || shippingMetadata.shipping_carrier || 'Manual Fulfillment';
      const serviceLabel =
        meta.service ||
        meta.service_code ||
        shippingMetadata.shipping_service ||
        'Standard Shipping';

      if (!shippingMetadata.shipping_carrier && carrierLabel) {
        shippingMetadata.shipping_carrier = carrierLabel;
      }
      if (!shippingMetadata.shipping_carrier_id && meta.carrier_id) {
        shippingMetadata.shipping_carrier_id = meta.carrier_id;
      }
      if (!shippingMetadata.shipping_service_code && meta.service_code) {
        shippingMetadata.shipping_service_code = meta.service_code;
      }
      if (!shippingMetadata.shipping_service) {
        shippingMetadata.shipping_service = serviceLabel;
        shippingMetadata.shipping_service_name = serviceLabel;
      }
      const amountValue = meta.amount ? Number(meta.amount) : undefined;
      if (!shippingMetadata.shipping_amount && meta.amount) {
        shippingMetadata.shipping_amount = Number.isFinite(amountValue)
          ? amountValue!.toFixed(2)
          : meta.amount;
      }
      if (!shippingMetadata.shipping_currency && meta.currency) {
        shippingMetadata.shipping_currency = meta.currency.toUpperCase();
      }
    };

    let finalShippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] | undefined;
    if (installOnlyQuote) {
      finalShippingOptions = undefined;
    } else if (shippingOptions && shippingOptions.length) {
      finalShippingOptions = shippingOptions;
      const optionMeta =
        shippingOptions[0]?.shipping_rate_data?.metadata as Record<string, string> | undefined;
      applyOptionMetadata(optionMeta);
    } else {
      finalShippingOptions = [
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
            },
            metadata: {
              carrier: 'Manual Fulfillment',
              carrier_id: 'manual-flat-standard',
              service_code: 'standard_fallback',
              service: 'Standard Shipping (Fallback)',
              amount: '15.00',
              currency: 'USD',
              source: 'fallback'
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
            },
            metadata: {
              carrier: 'Manual Fulfillment',
              carrier_id: 'manual-flat-expedited',
              service_code: 'expedited_fallback',
              service: 'Expedited Shipping (Fallback)',
              amount: '35.00',
              currency: 'USD',
              source: 'fallback'
            }
          }
        }
      ];
      const firstOption = finalShippingOptions[0];
      if (firstOption?.shipping_rate_data?.metadata) {
        applyOptionMetadata(firstOption.shipping_rate_data.metadata as Record<string, string>);
      }
      if (!shippingMetadata.shipping_currency) {
        shippingMetadata.shipping_currency = 'USD';
      }
      if (!shippingMetadata.shipping_amount) {
        shippingMetadata.shipping_amount = '15.00';
      }
    }

    if (!shippingMetadata.shipping_currency) {
      shippingMetadata.shipping_currency =
        normalizedDestination?.country === 'CA' ? 'CAD' : 'USD';
    }

    const baseMetadata: Record<string, string> = {
      ...(userId ? { userId } : {}),
      ...(userEmail ? { userEmail } : {}),
      site: baseUrl
    };

    const sessionMetadata: Record<string, string> = {
      ...baseMetadata,
      ...shippingMetadata
    };

    const paymentIntentMetadata = { ...sessionMetadata };

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
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`
    };

    if (shippingAddressCollection) {
      sessionParams.shipping_address_collection = shippingAddressCollection;
    }

    // Guard rail: Stripe rejects automatic tax when payment_intent_data.shipping is present.
    if (sessionParams.payment_intent_data && 'shipping' in sessionParams.payment_intent_data) {
      delete (sessionParams.payment_intent_data as { shipping?: unknown }).shipping;
    }

    sessionParams.customer_creation = 'if_required';
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    if (typeof finalShippingOptions !== 'undefined') {
      sessionParams.shipping_options = finalShippingOptions;
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
