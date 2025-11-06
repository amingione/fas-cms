import Stripe from 'stripe';
import { readSession } from '../../server/auth/session';
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
});

const configuredBaseUrl = import.meta.env.PUBLIC_BASE_URL || '';
const STRIPE_CHECKOUT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com; frame-src https://*.stripe.com; connect-src 'self' https://*.stripe.com https://api.stripe.com; img-src 'self' https://*.stripe.com data:; font-src 'self' https://*.stripe.com https://r2cdn.perplexity.ai data:;";

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Security-Policy': STRIPE_CHECKOUT_CSP
    }
  });

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
    return jsonResponse(
      { error: 'PUBLIC_BASE_URL is missing or invalid. Must start with http or https.' },
      500
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

function parseList(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split(/[,|\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

type AllowedCountryCodes =
  Stripe.Checkout.SessionCreateParams.ShippingAddressCollection['allowed_countries'];

function resolveAllowedCountries(): AllowedCountryCodes {
  const envValue =
    import.meta.env.STRIPE_SHIPPING_ALLOWED_COUNTRIES ||
    import.meta.env.PUBLIC_STRIPE_SHIPPING_ALLOWED_COUNTRIES ||
    import.meta.env.PUBLIC_SHIPPING_ALLOWED_COUNTRIES ||
    '';

  const parsed = parseList(envValue)
    .map((code) => code.toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code)) as AllowedCountryCodes;

  if (parsed.length) {
    return parsed;
  }

  return ['US', 'CA'];
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
    return jsonResponse({ error: 'Unable to determine site base URL for checkout redirects.' }, 500);
  }
  const validationError = validateBaseUrl(validationTarget);
  if (validationError) return validationError;

  baseUrl = normalizeBaseUrl(validationTarget);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Missing or invalid JSON body' }, 400);
  }

  const { cart } = body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return jsonResponse({ error: 'Cart is empty or invalid' }, 400);
  }

  const normalizeCartId = (rawId?: string | null): string => {
    if (!rawId) return '';
    const trimmed = String(rawId).trim();
    if (!trimmed) return '';
    const [id] = trimmed.split('::');
    return id || trimmed;
  };

  type CartSelection = {
    group?: string;
    value?: string;
    label?: string;
    priceDelta?: number;
  };

  type CartItem = {
    id?: string;
    sku?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    productUrl?: string;
    installOnly?: boolean;
    shippingClass?: string;
    options?: Record<string, string>;
    selections?: CartSelection[] | Record<string, unknown>;
    basePrice?: number;
    extra?: number;
    upgrades?: unknown;
    addOns?: unknown;
    signature?: string;
  };

  const clamp = (value: string, max = 500) =>
    value.length > max ? value.slice(0, max) : value;

  const formatSelectedOptions = (
    input?: Record<string, unknown> | null,
    selectionsRaw?: unknown
  ) => {
    type EntryMap = Map<string, Set<string>>;
    const entriesMap: EntryMap = new Map();
    const addValue = (key: unknown, value: unknown) => {
      const rawKey = key != null ? String(key) : '';
      const rawValue = value != null ? String(value) : '';
      const keyTrimmed = rawKey.trim();
      const valueTrimmed = rawValue.trim();
      if (!keyTrimmed || !valueTrimmed) return;
      const normalizedKey = keyTrimmed.replace(/\s+/g, ' ');
      const bucket = entriesMap.get(normalizedKey) ?? new Set<string>();
      bucket.add(valueTrimmed);
      entriesMap.set(normalizedKey, bucket);
    };

    if (input && typeof input === 'object') {
      Object.entries(input).forEach(([key, value]) => {
        if (value == null || value === '') return;
        if (Array.isArray(value)) {
          value.forEach((entry) => addValue(key, entry));
        } else if (typeof value === 'object') {
          Object.values(value as Record<string, unknown>).forEach((entry) => addValue(key, entry));
        } else {
          addValue(key, value);
        }
      });
    }

    const selectionsArray = Array.isArray(selectionsRaw)
      ? selectionsRaw
      : selectionsRaw && typeof selectionsRaw === 'object'
        ? (Array.isArray((selectionsRaw as any)?.selections)
            ? (selectionsRaw as any).selections
            : Object.entries(selectionsRaw as Record<string, unknown>).flatMap(([key, value]) =>
                Array.isArray(value) ? value.map((entry) => ({ group: key, label: entry })) : []
              ))
        : [];

    selectionsArray.forEach((entry: any) => {
      if (!entry || typeof entry !== 'object') return;
      const group =
        entry.group ??
        entry.name ??
        (typeof entry.key === 'string' ? entry.key : undefined) ??
        'Option';
      const label = entry.label ?? entry.value ?? '';
      addValue(group, label);
    });

    if (!entriesMap.size) return null;

    const entries: Array<[string, string]> = Array.from(entriesMap.entries()).map(
      ([key, valueSet]) => [key, Array.from(valueSet).join(', ')]
    );
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) return null;
    const summary = entries.map(([key, value]) => `${key}: ${value}`).join(' • ');
    const json = JSON.stringify(Object.fromEntries(entries));
    return { entries, summary, json };
  };

  const collectUpgrades = (raw: unknown, selectionSource?: unknown): string[] => {
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

    const fromSelections = Array.isArray(selectionSource)
      ? selectionSource
      : Array.isArray((selectionSource as any)?.selections)
        ? (selectionSource as any).selections
        : [];

    const upgradeRegex = /(upgrade|add[\s_-]*on|addon|extra|package|kit)/i;
    fromSelections.forEach((entry: any) => {
      if (!entry || typeof entry !== 'object') return;
      const group = String(entry.group || entry.name || '');
      const label = entry.label || entry.value;
      if (typeof label !== 'string' || !label.trim()) return;
      const delta =
        typeof entry.priceDelta === 'number'
          ? entry.priceDelta
          : typeof entry.delta === 'number'
            ? entry.delta
            : undefined;
      if (upgradeRegex.test(group) || (typeof delta === 'number' && delta > 0)) {
        push(label);
      }
    });

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
    const optionDetails = formatSelectedOptions(
      item.options as Record<string, unknown> | null,
      item.selections
    );
    const upgradeValues = collectUpgrades(item.upgrades ?? item.addOns, item.selections);
    const metadata: Record<string, string> = {
      ...(item.sku ? { sku: String(item.sku) } : {}),
      ...(sanityProductId ? { sanity_product_id: sanityProductId } : {})
    };
    if (item?.name) metadata.product_name = clamp(String(item.name), 200);
    if (item?.productUrl) metadata.product_url = clamp(String(item.productUrl), 300);
    if (item?.image) metadata.product_image = clamp(String(item.image), 400);
    metadata.unit_price = Number(item.price ?? unitAmount / 100).toFixed(2);
    metadata.quantity = String(quantity);
    if (item?.signature) metadata.configuration_signature = clamp(String(item.signature), 120);

    if (optionDetails?.summary) {
      metadata.selected_options = clamp(optionDetails.summary);
      metadata.option_summary = clamp(optionDetails.summary);
    }
    if (optionDetails?.entries?.length) {
      const detailed = optionDetails.entries.map(([label, value]) => `${label}: ${value}`).join(' | ');
      metadata.options_readable = clamp(detailed);
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
      metadata.upgrades_readable = clamp(upgradeSummary);
    }
    if (typeof item.basePrice === 'number' && Number.isFinite(item.basePrice)) {
      metadata.base_price = Number(item.basePrice).toFixed(2);
      metadata.base_price_display = `$${Number(item.basePrice).toFixed(2)}`;
    }
    if (typeof item.extra === 'number' && Number.isFinite(item.extra)) {
      metadata.option_upcharge = Number(item.extra).toFixed(2);
      metadata.option_upcharge_display = `$${Number(item.extra).toFixed(2)}`;
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

  const extractSlugFromUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    try {
      const trimmed = url.trim();
      if (!trimmed) return undefined;
      const noOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, '');
      const withoutQuery = noOrigin.split(/[?#]/)[0];
      const segments = withoutQuery.replace(/^\/+/, '').split('/').filter(Boolean);
      if (!segments.length) return undefined;
      const slug = segments[segments.length - 1];
      return slug || undefined;
    } catch {
      return undefined;
    }
  };

  // Persist compact cart metadata (Stripe metadata fields are strings and size-limited)
  let metaCart = '';
  let cartSummary = '';
  try {
    const summaryParts: string[] = [];
    let compact = (cart as CartItem[]).map((i) => {
      const optionDetails = formatSelectedOptions(
        (i?.options as Record<string, unknown>) || undefined,
        i?.selections
      );
      const opts = optionDetails?.summary;
      const upgrades = collectUpgrades(i?.upgrades ?? i?.addOns, i?.selections);
      const normalizedId = normalizeCartId(typeof i?.id === 'string' ? i.id : undefined);
      const imageUrl = typeof i?.image === 'string' ? i.image : undefined;
      const productUrl = typeof i?.productUrl === 'string' ? i.productUrl : undefined;
      const slug = extractSlugFromUrl(productUrl);
      const sku = typeof i?.sku === 'string' ? i.sku : undefined;
      const meta: Record<string, string> = {};
      if (optionDetails?.summary) meta['Options'] = optionDetails.summary;
      if (optionDetails?.entries?.length) {
        meta['Options Detail'] = optionDetails.entries
          .map(([label, value]) => `${label}: ${value}`)
          .join(' | ');
      }
      if (upgrades.length) meta['Upgrades'] = upgrades.join(', ');
      if (typeof i?.basePrice === 'number' && Number.isFinite(i.basePrice)) {
        meta['Base Price'] = `$${Number(i.basePrice).toFixed(2)}`;
      }
      if (typeof i?.extra === 'number' && Number.isFinite(i.extra)) {
        meta['Option Upcharge'] = `$${Number(i.extra).toFixed(2)}`;
      }
      if (typeof i?.price === 'number' && Number.isFinite(i.price)) {
        meta['Unit Price'] = `$${Number(i.price).toFixed(2)}`;
      }
      if (typeof i?.quantity === 'number' && Number.isFinite(i.quantity)) {
        meta['Quantity'] = String(i.quantity);
      }
      if (i?.signature) meta['Configuration Signature'] = String(i.signature);
      if (productUrl) meta['Product URL'] = productUrl;
      if (imageUrl) meta['Image URL'] = imageUrl;
      if (slug) meta['Product Slug'] = slug;
      Object.keys(meta).forEach((key) => {
        const value = meta[key];
        if (typeof value === 'string' && value.length > 200) {
          meta[key] = value.slice(0, 200);
        }
      });

      const summaryBits: string[] = [];
      if (i?.name) summaryBits.push(String(i.name));
      if (opts) summaryBits.push(`Options: ${opts}`);
      if (upgrades.length) summaryBits.push(`Upgrades: ${upgrades.join(', ')}`);
      if (typeof i?.quantity === 'number' && Number.isFinite(i.quantity)) {
        summaryBits.push(`Qty: ${i.quantity}`);
      }
      if (summaryBits.length) summaryParts.push(summaryBits.join(' — '));

      const entry: Record<string, unknown> = {
        ...(normalizedId ? { i: normalizedId } : {}),
        ...(sku ? { sku } : {}),
        ...(imageUrl ? { img: imageUrl } : {}),
        ...(productUrl ? { url: productUrl } : {}),
        ...(slug ? { slug } : {}),
        n: i?.name,
        q: i?.quantity,
        p: i?.price,
        ...(opts ? { o: opts.slice(0, 160) } : {}),
        ...(upgrades.length ? { u: upgrades.join(', ').slice(0, 160) } : {})
      };
      if (Object.keys(meta).length) entry.meta = meta;
      return entry;
    });
    let serialized = JSON.stringify(compact);
    if (serialized.length > 460) {
      compact = compact.map((entry) => {
        if (entry && typeof entry === 'object' && 'meta' in entry) {
          const { meta: _meta, ...rest } = entry as Record<string, unknown>;
          return rest;
        }
        return entry;
      });
      serialized = JSON.stringify(compact);
    }
    if (serialized.length > 460) serialized = serialized.slice(0, 460);
    metaCart = serialized;
    if (summaryParts.length) {
      const joined = summaryParts.join(' | ');
      cartSummary = joined.length > 480 ? joined.slice(0, 480) : joined;
    }
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

  const allowedCountries = resolveAllowedCountries();
  try {
    const shippingAddressCollection: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection = {
      allowed_countries: allowedCountries
    };

    const customerEmail = userEmail || undefined;

    const baseMetadata: Record<string, string> = {
      ...(userId ? { userId } : {}),
      ...(userEmail ? { userEmail } : {}),
      site: baseUrl
    };

    const metadataForSession: Record<string, string> = {
      ...baseMetadata,
      ...(cartSummary ? { cart_summary: cartSummary } : {}),
      ...(metaCart ? { cart: metaCart } : {})
    };

    const paymentIntentMetadata = { ...metadataForSession };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      // Offer standard cards plus Affirm financing at checkout
      payment_method_types: ['card', 'affirm'],
      mode: 'payment',
      line_items: lineItems,
      metadata: metadataForSession,
      payment_intent_data: {
        metadata: paymentIntentMetadata
      },
      locale: 'en',
      tax_id_collection: { enabled: true },
      // Enable Stripe Tax for automatic sales tax calculation
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      shipping_address_collection: shippingAddressCollection,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 995, currency: 'usd' },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 5 }
            }
          }
        }
      ],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`
    };

    // Guard rail: Stripe rejects automatic tax when payment_intent_data.shipping is present.
    if (sessionParams.payment_intent_data && 'shipping' in sessionParams.payment_intent_data) {
      delete (sessionParams.payment_intent_data as { shipping?: unknown }).shipping;
    }

    sessionParams.customer_creation = 'if_required';
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    // With automatic tax enabled, Stripe expects to collect the shipping address at checkout.
    // Avoid passing payment_intent_data.shipping so we don't trigger the "cannot enable automatic tax" error.
    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ url: session.url }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Stripe Checkout Session Error:', err);
    return jsonResponse({ error: message }, 500);
  }
}
