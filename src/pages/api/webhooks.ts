import Stripe from 'stripe';
import { createClient } from '@sanity/client';
import type { SanityDocumentStub } from '@sanity/client';
import { createOrderCartItem, type OrderCartItem } from '@/server/sanity/order-cart';
import { extractResendMessageId, safeJsonParse } from '@/lib/resend';

/**
 * FIELD MAPPING CONTRACT
 * Canonical source: .docs/reports/field-to-api-map.md
 */

const stripeApiVersion = (import.meta.env.STRIPE_API_VERSION as string | undefined) || '2025-08-27.basil';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: stripeApiVersion as Stripe.LatestApiVersion
});

const sanity = createClient({
  projectId:
    (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
    (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
    (import.meta.env.SANITY_STUDIO_PROJECT_ID as string | undefined),
  dataset:
    (import.meta.env.SANITY_DATASET as string | undefined) ||
    (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
    (import.meta.env.SANITY_STUDIO_DATASET as string | undefined),
  apiVersion: '2024-01-01',
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

export const config = {
  runtime: 'nodejs' // Important: disable edge runtime so we can read raw body
};

const centsToDollars = (value?: number | null): number =>
  typeof value === 'number' && Number.isFinite(value) ? value / 100 : 0;

const dollars = (value?: number | null): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

const escapeHtml = (input: unknown): string =>
  String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeString = (value?: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const normalizePaymentStatus = (
  sessionStatus?: string | null,
  paymentIntentStatus?: string | null
): 'pending' | 'unpaid' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled' => {
  const normalizedSession = (sessionStatus || '').toLowerCase().trim();
  if (normalizedSession === 'paid') return 'paid';
  if (normalizedSession === 'unpaid') return 'unpaid';
  if (normalizedSession === 'no_payment_required') return 'paid';

  const normalizedIntent = (paymentIntentStatus || '').toLowerCase().trim();
  if (normalizedIntent === 'succeeded') return 'paid';
  if (normalizedIntent === 'processing' || normalizedIntent === 'requires_capture')
    return 'pending';
  if (normalizedIntent === 'requires_action' || normalizedIntent === 'requires_confirmation')
    return 'pending';
  if (normalizedIntent === 'requires_payment_method') return 'failed';
  if (normalizedIntent === 'canceled' || normalizedIntent === 'cancelled') return 'cancelled';

  return 'pending';
};

const splitShippingDisplayName = (
  displayName?: string | null
): { carrier?: string; service?: string } => {
  const name = (displayName || '').trim();
  if (!name) return {};
  const parts = name
    .split(/[\u2013\u2014-]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      carrier: parts[0],
      service: parts.slice(1).join(' - ')
    };
  }
  return { service: name };
};

const deriveDeliveryEstimate = (
  shippingRate?: Stripe.ShippingRate | null
): { deliveryDays?: number; estimatedDeliveryDate?: string } => {
  const estimate = shippingRate?.delivery_estimate;
  const value = estimate?.maximum?.value ?? estimate?.minimum?.value;
  if (!Number.isFinite(value)) return {};
  const days = Math.max(0, Math.trunc(Number(value)));
  if (!days) return {};
  const base = new Date();
  base.setDate(base.getDate() + days);
  return {
    deliveryDays: days,
    estimatedDeliveryDate: base.toISOString()
  };
};

const parseResendResponse = async (response: Response) => {
  const rawText = await response.text().catch(() => '');
  return { body: safeJsonParse(rawText), rawText };
};

const formatOrderDate = (iso?: string | null, createdAtSeconds?: number | null): string => {
  let date: Date;
  if (iso) {
    date = new Date(iso);
  } else if (typeof createdAtSeconds === 'number' && Number.isFinite(createdAtSeconds)) {
    date = new Date(createdAtSeconds * 1000);
  } else {
    date = new Date();
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

type StripeSessionWithShippingRate = Stripe.Checkout.Session & {
  shipping_rate?: Stripe.ShippingRate | null;
};

const generateFallbackOrderNumber = (
  session: Stripe.Checkout.Session,
  fallbackId: string
): string => {
  const created =
    typeof session.created === 'number' && Number.isFinite(session.created)
      ? new Date(session.created * 1000)
      : new Date();
  const yyyy = created.getUTCFullYear();
  const mm = String(created.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(created.getUTCDate()).padStart(2, '0');
  const idSource =
    (typeof session.id === 'string' && session.id) ||
    (typeof session.payment_intent === 'string' && session.payment_intent) ||
    fallbackId;
  const idPart = idSource.slice(-6).toUpperCase();
  return `FAS-${yyyy}${mm}${dd}-${idPart}`;
};

const buildAddressHtml = (details?: Stripe.Checkout.Session.CustomerDetails | null): string => {
  if (!details) return '';
  const { address } = details;
  const lines: string[] = [];
  if (details.name) lines.push(escapeHtml(details.name));
  if (address?.line1) lines.push(escapeHtml(address.line1));
  if (address?.line2) lines.push(escapeHtml(address.line2));

  const cityStateComponents = [
    address?.city ? escapeHtml(address.city) : '',
    address?.state ? escapeHtml(address.state) : ''
  ].filter(Boolean);
  const cityState = cityStateComponents.join(', ');
  const postalLine = [cityState, address?.postal_code ? escapeHtml(address.postal_code) : '']
    .filter(Boolean)
    .join(' ');
  if (postalLine) lines.push(postalLine);
  if (address?.country) lines.push(escapeHtml(address.country));
  if (details.email) lines.push(escapeHtml(details.email));
  if (details.phone) lines.push(`Phone: ${escapeHtml(details.phone)}`);
  if (!lines.length) return '';
  return `<div style="margin-top:24px;">
    <h3 style="font-size:16px;font-weight:600;margin:0 0 8px 0;">Shipping To</h3>
    <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      ${lines.map((line) => `<div style="margin:2px 0;">${line}</div>`).join('')}
    </div>
  </div>`;
};

type ShippingSelection = {
  deliveryDays?: number | null;
  estimatedDeliveryDate?: string | null;
};

type OrderDocument = {
  _type: 'order';
  cart: OrderCartItem[];
  [key: string]: unknown;
};

const parseShippingSelection = (
  session: Stripe.Checkout.Session,
  shippingRate?: Stripe.ShippingRate | null
): ShippingSelection | null => {
  const meta = (session.metadata || {}) as Record<string, string | null | undefined>;
  const deliveryDaysStr = meta.shipping_delivery_days;
  const estimatedDeliveryDate = meta.shipping_estimated_delivery_date;
  const deliveryDays =
    deliveryDaysStr && Number.isFinite(Number(deliveryDaysStr)) ? Number(deliveryDaysStr) : null;
  const derived = deriveDeliveryEstimate(shippingRate);
  const resolvedDeliveryDays =
    deliveryDays !== null ? deliveryDays : derived.deliveryDays ?? null;
  const resolvedEstimatedDate = estimatedDeliveryDate || derived.estimatedDeliveryDate || null;

  if (resolvedDeliveryDays === null && !resolvedEstimatedDate) {
    return null;
  }

  return {
    deliveryDays: resolvedDeliveryDays,
    estimatedDeliveryDate: resolvedEstimatedDate,
  };
};

export async function POST({ request }: { request: Request }) {
  const secret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET in env.');
    return new Response('Webhook secret not configured.', { status: 500 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    console.error('❌ Missing stripe-signature header.');
    return new Response('Missing stripe-signature.', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err);
    return new Response('Webhook signature verification failed.', { status: 400 });
  }

  // Handle event types
  switch (event.type) {
    case 'payment_intent.updated': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = (paymentIntent.metadata || {}) as Record<string, string | null | undefined>;

      const shipStatus = sanitizeString(metadata.ship_status);
      const shipDate = sanitizeString(metadata.ship_date);
      const trackingNumber = sanitizeString(metadata.tracking_number);
      const trackingUrl = sanitizeString(metadata.tracking_URL) ?? sanitizeString(metadata.tracking_url);
      const serviceName = sanitizeString(metadata.service_name);

      const hasParcelcraftSignal = Boolean(shipStatus || shipDate || trackingNumber || trackingUrl || serviceName);
      if (!hasParcelcraftSignal) {
        return new Response('Ignored payment_intent.updated', { status: 200 });
      }

      try {
        const orderId = await sanity.fetch<string | null>(
          '*[_type == "order" && paymentIntentId == $piId][0]._id',
          { piId: paymentIntent.id }
        );
        if (!orderId) {
          return new Response('No matching order', { status: 200 });
        }

        const patch = sanity.patch(orderId);
        if (shipDate) patch.set({ shippedAt: shipDate });
        if (trackingNumber) patch.set({ trackingNumber });
        if (trackingUrl) patch.set({ trackingUrl });
        if (serviceName) patch.set({ service: serviceName });

        await patch.commit({ autoGenerateArrayKeys: true });
      } catch (err) {
        console.error('[astro webhook] failed to sync Parcelcraft metadata from PaymentIntent', err);
        return new Response('Failed to sync Parcelcraft metadata', { status: 500 });
      }

      return new Response('Synced payment_intent.updated', { status: 200 });
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const existingOrderId = await sanity.fetch<string | null>(
        '*[_type == "order" && stripeSessionId == $sessionId][0]._id',
        {sessionId: session.id}
      );
      if (existingOrderId) {
        console.log('[astro webhook] order already exists for session', {
          sessionId: session.id,
          orderId: existingOrderId
        });
        return new Response('Order already processed', {status: 200});
      }
      const sessionMetadata = (session.metadata || {}) as Record<string, string | null | undefined>;
      const customerEmailFromMetadata: string | undefined =
        sessionMetadata.customer_email || undefined;
      const orderTypeFromMetadata = sessionMetadata.order_type || 'retail';
      const marketingOptIn =
        String(sessionMetadata.marketing_opt_in || '')
          .trim()
          .toLowerCase() === 'true' ||
        session.consent?.promotions === 'opt_in';
      const marketingTimestamp = new Date().toISOString();

      console.log('✅ Payment confirmed for session:', session.id);
      console.log('Customer Email:', session.customer_details?.email);

        try {
          let sessionDetails: Stripe.Checkout.Session = session;
          try {
            sessionDetails = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['line_items.data.price.product', 'shipping_cost.shipping_rate']
            });
          } catch (error) {
            console.warn('[astro webhook] unable to retrieve expanded session', error);
          }

          // Parcelcraft: persist "company" onto the Stripe Customer record so it can be used in labels.
          try {
            const company = sessionDetails.custom_fields?.find((field) => field.key === 'company')
              ?.text?.value;
            const normalizedCompany = sanitizeString(company);
            const customerId = typeof sessionDetails.customer === 'string' ? sessionDetails.customer : null;
            if (normalizedCompany && customerId) {
              await stripe.customers.update(customerId, { metadata: { company: normalizedCompany } });
            }
          } catch (err) {
            console.warn('[astro webhook] unable to update Stripe customer company metadata', err);
          }

          // Fetch line items to capture cart details
          const lineItems =
            sessionDetails.line_items?.data && sessionDetails.line_items.data.length
              ? sessionDetails.line_items.data
              : (
                await stripe.checkout.sessions.listLineItems(sessionDetails.id, { limit: 100 })
              ).data;

        // Retrieve payment intent details (brand/last4/receipt)
        let paymentIntent: Stripe.PaymentIntent | null = null;
        try {
          const piId =
            typeof sessionDetails.payment_intent === 'string'
              ? sessionDetails.payment_intent
              : sessionDetails.payment_intent?.id;
          if (piId) {
            paymentIntent = await stripe.paymentIntents.retrieve(piId, {
              expand: ['latest_charge']
            });
          }
        } catch (e) {
          console.warn('Unable to retrieve PaymentIntent for session:', sessionDetails.id);
        }

        // Find or create a Customer document
        let customerRef: { _type: 'reference'; _ref: string } | undefined;
        const email =
          sessionDetails.customer_details?.email ||
          sessionDetails.customer_email ||
          customerEmailFromMetadata ||
          '';
        if (email) {
          const existing = await sanity.fetch(
            `*[_type=="customer" && lower(email)==lower($email)][0]{_id,emailMarketing,marketingOptIn,emailOptIn}`,
            { email }
          );
          let customerId = existing?._id as string | undefined;
          if (!customerId) {
            const created = await sanity.create({
              _type: 'customer',
              email,
              name: sessionDetails.customer_details?.name || email,
              marketingOptIn,
              emailOptIn: marketingOptIn,
              emailMarketing: marketingOptIn
                ? { subscribed: true, subscribedAt: marketingTimestamp, source: 'checkout' }
                : { subscribed: false }
            });
            customerId = created._id as string;
          }
          if (customerId) {
            customerRef = { _type: 'reference', _ref: customerId };
            try {
              const patch = sanity
                .patch(customerId)
                .set({
                  marketingOptIn,
                  emailOptIn: marketingOptIn,
                  'emailMarketing.subscribed': marketingOptIn
                })
                .setIfMissing({ emailMarketing: {} });
              if (marketingOptIn) {
                patch.set({
                  'emailMarketing.subscribedAt': marketingTimestamp,
                  'emailMarketing.source': 'checkout'
                });
              }
              await patch.commit({ autoGenerateArrayKeys: true });
            } catch (err) {
              console.warn('[astro webhook] unable to persist marketing opt-in', err as any);
            }
          }
        }

        // Prefer cart metadata if present
        let cartLines: OrderCartItem[] = [];
        const metaCart =
          (sessionDetails.metadata && (sessionDetails.metadata as any).cart_data) ||
          (sessionDetails.metadata && (sessionDetails.metadata as any).cart) ||
          '';
        if (metaCart) {
          try {
            const parsed = JSON.parse(metaCart);
            if (Array.isArray(parsed)) {
              cartLines = parsed.map((l: any) => {
                const isFull =
                  l &&
                  typeof l === 'object' &&
                  ('productId' in l || 'productName' in l || 'imageUrl' in l);
                if (isFull) {
                  const metadata: Record<string, unknown> = {};
                  if (l?.options != null) {
                    if (typeof l.options === 'string') {
                      metadata.selected_options = l.options;
                    } else {
                      metadata.selected_options_json = JSON.stringify(l.options);
                    }
                  }
                  if (l?.upgrades != null) metadata.upgrades = l.upgrades;
                  if (l?.imageUrl) metadata.product_image = l.imageUrl;
                  return createOrderCartItem({
                    id: l?.productId,
                    sku: l?.sku,
                    name: l?.productName,
                    price: typeof l?.price === 'number' ? l.price : Number(l?.price || 0),
                    quantity:
                      typeof l?.quantity === 'number' ? l.quantity : Number(l?.quantity || 0),
                    image: l?.imageUrl,
                    metadata
                  });
                }
                return createOrderCartItem({
                  id: l?.i ?? l?.id,
                  sku: l?.sku,
                  name: l?.n || l?.name,
                  price: typeof l?.p === 'number' ? l.p : Number(l?.p || 0),
                  quantity: typeof l?.q === 'number' ? l.q : Number(l?.q || 0),
                  categories: Array.isArray(l?.categories) ? l.categories : undefined,
                  image: l?.img || l?.image,
                  productUrl: l?.url || l?.productUrl,
                  productSlug: l?.slug || l?.productSlug,
                  metadata: l?.metadata && typeof l.metadata === 'object' ? l.metadata : undefined
                });
              });
            }
          } catch (error) {
            void error;
          }
        }
        if (!cartLines.length) {
          cartLines = lineItems.map((li) => {
            const product = (li.price?.product as Stripe.Product) || null;
            const productMetadata: Record<string, unknown> = product?.metadata
              ? { ...product.metadata }
              : {};
            if (typeof productMetadata.options === 'string') {
              const trimmed = productMetadata.options.trim();
              if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                productMetadata.selected_options_json = productMetadata.options;
              } else {
                productMetadata.selected_options = productMetadata.options;
              }
            }
            if (typeof productMetadata.upgrades === 'string') {
              const trimmed = productMetadata.upgrades.trim();
              if (trimmed.startsWith('[')) {
                try {
                  const parsedUpgrades = JSON.parse(trimmed);
                  if (Array.isArray(parsedUpgrades)) {
                    productMetadata.upgrades = parsedUpgrades;
                  }
                } catch {
                  void 0;
                }
              }
            }
            return createOrderCartItem({
              id:
                (typeof productMetadata.sanity_product_id === 'string'
                  ? productMetadata.sanity_product_id
                  : undefined) ||
                (typeof li.price?.product === 'string' ? li.price.product : undefined),
              sku:
                (typeof productMetadata.sku === 'string' ? productMetadata.sku : undefined) ||
                (typeof li.price?.id === 'string' ? li.price.id : undefined),
              name:
                li.description ||
                (typeof li.price?.nickname === 'string' ? li.price.nickname : undefined) ||
                product?.name,
              price:
                typeof li.amount_subtotal === 'number'
                  ? li.amount_subtotal / 100
                  : typeof li.price?.unit_amount === 'number'
                  ? li.price.unit_amount / 100
                  : undefined,
              quantity: li.quantity,
              image: product?.images?.[0],
              metadata: productMetadata
            });
          });
        }

        // ENFORCED: Order Shipping Snapshot Contract
        type ProductShippingConfig = {
          weight?: number | null;
          dimensions?: {
            length?: number | null;
            width?: number | null;
            height?: number | null;
          } | null;
          requiresShipping?: boolean | null;
        };

        const productIds = Array.from(
          new Set(
            cartLines
              .map((item) => {
                const metadata =
                  item.metadata && typeof item.metadata === 'object'
                    ? (item.metadata as Record<string, unknown>)
                    : undefined;
                const metadataId =
                  metadata && typeof metadata.sanity_product_id === 'string'
                    ? metadata.sanity_product_id
                    : undefined;
                const itemId = typeof item.id === 'string' ? item.id : undefined;
                return metadataId || itemId || null;
              })
              .filter((id): id is string => Boolean(id))
          )
        );

        const productShippingConfigs = productIds.length
          ? await sanity.fetch<
              {
                _id: string;
                weight?: number | null;
                dimensions?: {
                  length?: number | null;
                  width?: number | null;
                  height?: number | null;
                } | null;
                requiresShipping?: boolean | null;
              }[]
            >(
              `*[_type == "product" && _id in $productIds]{
                _id,
                "weight": shippingConfig.weight,
                "dimensions": shippingConfig.dimensions,
                "requiresShipping": shippingConfig.requiresShipping
              }`,
              { productIds }
            )
          : [];

        const productShippingMap = productShippingConfigs.reduce<Record<string, ProductShippingConfig>>(
          (acc, product) => {
            acc[product._id] = {
              weight: product.weight ?? null,
              dimensions: product.dimensions ?? null,
              requiresShipping: product.requiresShipping ?? null
            };
            return acc;
          },
          {}
        );

        let totalWeightLbs = 0;
        let maxLength = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        let hasShippingData = false;

        cartLines.forEach((item) => {
          const metadata =
            item.metadata && typeof item.metadata === 'object'
              ? (item.metadata as Record<string, unknown>)
              : undefined;
          const productId =
            (metadata && typeof metadata.sanity_product_id === 'string'
              ? metadata.sanity_product_id
              : undefined) || (typeof item.id === 'string' ? item.id : undefined);
          const config = productId ? productShippingMap[productId] : null;

          if (config?.requiresShipping === false) return;

          const weight = typeof config?.weight === 'number' ? config.weight : 0;
          const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
          if (weight > 0) {
            totalWeightLbs += weight * quantity;
            hasShippingData = true;
          } else if (productId) {
            console.warn(`[webhook] Product ${productId} missing shipping weight`);
          }

          const dims = config?.dimensions;
          if (dims) {
            const length = typeof dims.length === 'number' ? dims.length : 0;
            const width = typeof dims.width === 'number' ? dims.width : 0;
            const height = typeof dims.height === 'number' ? dims.height : 0;
            if (length > 0 && width > 0 && height > 0) {
              if (length > maxLength) maxLength = length;
              if (width > maxWidth) maxWidth = width;
              if (height > maxHeight) maxHeight = height;
              hasShippingData = true;
            }
          } else if (productId) {
            console.warn(`[webhook] Product ${productId} missing shipping dimensions`);
          }
        });

        const orderShippingData: {
          weight?: { value: number; unit: string };
          dimensions?: { length: number; width: number; height: number };
        } = {};

        if (hasShippingData) {
          if (totalWeightLbs > 0) {
            orderShippingData.weight = {
              value: totalWeightLbs,
              unit: 'pound'
            };
          }
          if (maxLength > 0 && maxWidth > 0 && maxHeight > 0) {
            orderShippingData.dimensions = {
              length: maxLength,
              width: maxWidth,
              height: maxHeight
            };
          }
        } else {
          console.error(
            `[webhook] No shipping data found for order ${sessionDetails.id} - fulfillment will use defaults`
          );
          orderShippingData.weight = { value: 1, unit: 'pound' };
          orderShippingData.dimensions = { length: 10, width: 8, height: 4 };
        }

        const collectedShippingDetails =
          sessionDetails.collected_information?.shipping_details || null;
        const shippingDetailsForEmail: Stripe.Checkout.Session.CustomerDetails | null =
          collectedShippingDetails
            ? {
                address: collectedShippingDetails.address,
                business_name: sessionDetails.customer_details?.business_name ?? null,
                email: email || null,
                individual_name: sessionDetails.customer_details?.individual_name ?? null,
                name: collectedShippingDetails.name,
                phone: sessionDetails.customer_details?.phone ?? null,
                tax_exempt: sessionDetails.customer_details?.tax_exempt ?? null,
                tax_ids: sessionDetails.customer_details?.tax_ids ?? null
              }
            : null;

        const shippingDetails =
          sessionDetails.collected_information?.shipping_details ||
          (sessionDetails as any)?.shipping_details ||
          null;
        const customerDetails = sessionDetails.customer_details;
        const shippingCost = (sessionDetails as any)?.shipping_cost as
          | Stripe.Checkout.Session.ShippingCost
          | null
          | undefined;
        const shippingRate =
          shippingCost && typeof shippingCost.shipping_rate === 'object'
            ? (shippingCost.shipping_rate as Stripe.ShippingRate)
            : null;
        const shippingRateId =
          shippingCost && typeof shippingCost.shipping_rate === 'string'
            ? shippingCost.shipping_rate
            : shippingRate?.id ?? null;
        const shippingSelection = parseShippingSelection(sessionDetails, shippingRate);
        const shippingRateMetadata =
          shippingRate?.metadata && typeof shippingRate.metadata === 'object'
            ? (shippingRate.metadata as Record<string, string | null | undefined>)
            : {};
        const sessionMetadata = (sessionDetails.metadata || {}) as Record<
          string,
          string | null | undefined
        >;
        const extractShippingMeta = (key: string): string | null => {
          const candidate =
            sanitizeString(shippingRateMetadata[key]) ?? sanitizeString(sessionMetadata[key]);
          return candidate;
        };
        const shippingQuoteId = extractShippingMeta('shipping_quote_id');
        const shippingQuoteKey = extractShippingMeta('shipping_quote_key');
        const shippingQuoteRequestId = extractShippingMeta('shipping_quote_request_id');
        const selectedRateId = extractShippingMeta('selected_rate_id') ?? shippingRateId;
        const stripeShippingRateId =
          shippingRateId || (selectedRateId && selectedRateId.startsWith('shr_') ? selectedRateId : null);
        const { carrier: displayCarrier, service: displayService } = splitShippingDisplayName(
          shippingRate?.display_name
        );
        const shippingCarrier =
          extractShippingMeta('shipping_carrier') ??
          extractShippingMeta('carrier') ??
          displayCarrier ??
          null;
        const shippingService =
          extractShippingMeta('shipping_service') ??
          extractShippingMeta('service') ??
          displayService ??
          null;
        const shippingAddress = shippingDetails?.address
          ? {
              name: shippingDetails.name || '',
              phone: customerDetails?.phone || '',
              email: customerDetails?.email || '',
              addressLine1: shippingDetails.address.line1 || '',
              addressLine2: shippingDetails.address.line2 || '',
              city: shippingDetails.address.city || '',
              state: shippingDetails.address.state || '',
              postalCode: shippingDetails.address.postal_code || '',
              country: shippingDetails.address.country || ''
            }
          : undefined;
        const billingAddress = customerDetails?.address
          ? {
              name: customerDetails.name || '',
              phone: customerDetails.phone || '',
              email: customerDetails.email || '',
              addressLine1: customerDetails.address.line1 || '',
              addressLine2: customerDetails.address.line2 || '',
              city: customerDetails.address.city || '',
              state: customerDetails.address.state || '',
              postalCode: customerDetails.address.postal_code || '',
              country: customerDetails.address.country || ''
            }
          : undefined;

        const amountSubtotal =
          typeof sessionDetails.amount_subtotal === 'number'
            ? sessionDetails.amount_subtotal / 100
            : undefined;
        const amountTax =
          typeof sessionDetails.total_details?.amount_tax === 'number'
            ? sessionDetails.total_details.amount_tax / 100
            : undefined;
        const amountShipping =
          typeof sessionDetails.total_details?.amount_shipping === 'number'
            ? sessionDetails.total_details.amount_shipping / 100
            : undefined;
        const amountDiscount =
          typeof sessionDetails.total_details?.amount_discount === 'number'
            ? sessionDetails.total_details.amount_discount / 100
            : 0;
        const totalAmount = sessionDetails.amount_total ? sessionDetails.amount_total / 100 : 0;
        const normalizedPaymentStatus = normalizePaymentStatus(
          sessionDetails.payment_status,
          paymentIntent?.status
        );
        const paymentCaptured = normalizedPaymentStatus === 'paid';
        const paymentCapturedAt = paymentCaptured ? new Date().toISOString() : undefined;

        const orderNumber = generateFallbackOrderNumber(sessionDetails, session.id);
        const orderPayload: SanityDocumentStub<OrderDocument> = {
          _type: 'order',
          orderNumber,
          stripeSessionId: sessionDetails.id,
          paymentIntentId:
            typeof sessionDetails.payment_intent === 'string'
              ? sessionDetails.payment_intent
              : sessionDetails.payment_intent?.id,
          stripePaymentIntentId:
            typeof sessionDetails.payment_intent === 'string'
              ? sessionDetails.payment_intent
              : sessionDetails.payment_intent?.id,
          paymentStatus: normalizedPaymentStatus,
          chargeId:
            typeof (paymentIntent as any)?.latest_charge === 'string'
              ? (paymentIntent as any).latest_charge
              : (paymentIntent as any)?.latest_charge?.id,
          cardBrand:
            (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.brand || '',
          cardLast4:
            (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.last4 || '',
          receiptUrl: (paymentIntent as any)?.charges?.data?.[0]?.receipt_url || '',
          currency: sessionDetails.currency || 'usd',
          amountSubtotal,
          amountTax,
          amountShipping,
          amountDiscount,
          totalAmount,
          // ENFORCED: Order Shipping Snapshot Contract
          weight: orderShippingData.weight,
          dimensions: orderShippingData.dimensions,
          customerRef,
          customerName: customerDetails?.name || '',
          customerEmail: customerDetails?.email || email || '',
          cart: cartLines,
          status: normalizedPaymentStatus === 'paid' ? 'paid' : 'pending',
          createdAt: new Date().toISOString(),
          orderType: orderTypeFromMetadata,
          carrier:
            shippingCarrier ??
            sessionMetadata?.shipping_carrier ??
            sessionDetails.metadata?.shipping_carrier ??
            null,
          service:
            shippingService ??
            sessionMetadata?.shipping_service ??
            sessionDetails.metadata?.shipping_service ??
            null,
          stripeShippingRateId: stripeShippingRateId ?? undefined,
          shippingQuoteId: shippingQuoteId ?? undefined,
          shippingQuoteKey: shippingQuoteKey ?? undefined,
          shippingQuoteRequestId: shippingQuoteRequestId ?? undefined,
          shippingAddress,
          billingAddress,
          paymentCaptured,
          paymentCapturedAt,
          stripeSummary: {
            data: JSON.stringify(sessionDetails)
          },
          webhookNotified: true
        };

        if (
          shippingSelection?.deliveryDays !== undefined &&
          shippingSelection?.deliveryDays !== null
        ) {
          orderPayload.deliveryDays = shippingSelection.deliveryDays;
        }
        if (shippingSelection?.estimatedDeliveryDate) {
          orderPayload.estimatedDeliveryDate = shippingSelection.estimatedDeliveryDate;
        }

        const newOrder = await sanity.create(orderPayload);

        console.log('📝 Order saved to Sanity:', newOrder._id);

        // Track attribution if UTM params exist
        if (sessionDetails.metadata?.utm_source) {
          try {
            await sanity.create({
              _type: 'attribution',
              order: {
                _type: 'reference',
                _ref: newOrder._id
              },
              sessionId: sessionDetails.metadata.session_id || null,
              utmSource: sessionDetails.metadata.utm_source || null,
              utmMedium: sessionDetails.metadata.utm_medium || null,
              utmCampaign: sessionDetails.metadata.utm_campaign || null,
              utmTerm: sessionDetails.metadata.utm_term || null,
              utmContent: sessionDetails.metadata.utm_content || null,
              timestamp: new Date().toISOString()
            });
            console.log('✅ Attribution tracked for order:', newOrder._id);
          } catch (err) {
            console.error('Failed to track attribution:', err);
          }
        }

        // Send confirmation email via Resend if configured
        const RESEND_API_KEY = import.meta.env.RESEND_API_KEY as string | undefined;
        const RESEND_FROM =
          (import.meta.env.RESEND_FROM as string | undefined) ||
          'noreply@updates.fasmotorsports.com';
        const to = sessionDetails.customer_details?.email;
        if (RESEND_API_KEY && to) {
          const orderId = String(newOrder._id || '');
          let sanityOrder:
            | {
                orderNumber?: string;
                customerName?: string;
                createdAt?: string;
                amountSubtotal?: number;
                amountTax?: number;
                amountShipping?: number;
                totalAmount?: number;
              }
            | null = null;
          if (orderId) {
            try {
              sanityOrder = await sanity.fetch(
                `*[_id==$id][0]{orderNumber,customerName,createdAt,amountSubtotal,amountTax,amountShipping,totalAmount}`,
                { id: orderId }
              );
            } catch (fetchErr) {
              console.warn(
                '[astro webhook] unable to fetch order metadata',
                (fetchErr as any)?.message || fetchErr
              );
            }
          }

          const sanityOrderNumber =
            typeof sanityOrder?.orderNumber === 'string' ? sanityOrder.orderNumber.trim() : '';
          const createdOrderNumber =
            typeof (newOrder as any)?.orderNumber === 'string'
              ? (newOrder as any).orderNumber.trim()
              : '';
          const existingOrderNumber = sanityOrderNumber || createdOrderNumber;
          let generatedOrderNumber: string | undefined;
          const orderNumber =
            existingOrderNumber ||
            generateFallbackOrderNumber(sessionDetails, orderId || sessionDetails.id || '');
          if (!existingOrderNumber) {
            generatedOrderNumber = orderNumber;
          }

          const orderDate = formatOrderDate(
            sanityOrder?.createdAt || (newOrder as any)?.createdAt,
            sessionDetails.created
          );
          const customerName =
            sessionDetails.customer_details?.name ||
            sanityOrder?.customerName ||
            shippingDetailsForEmail?.name ||
            'there';

          const rows = cartLines
            .map((line) => {
              const quantity = line.quantity ?? 1;
              const unit = line.price ?? 0;
              const total = unit * quantity;
              return `<tr>
                <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
                  line.name || 'Item'
                )}</td>
                <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${quantity}</td>
                <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(
                  total
                )}</td>
              </tr>`;
            })
            .join('');

          const subtotal =
            typeof sessionDetails.amount_subtotal === 'number'
              ? centsToDollars(sessionDetails.amount_subtotal)
              : dollars((newOrder as any)?.amountSubtotal ?? sanityOrder?.amountSubtotal);
          const shippingTotal =
            typeof sessionDetails.total_details?.amount_shipping === 'number'
              ? centsToDollars(sessionDetails.total_details.amount_shipping)
              : dollars((newOrder as any)?.amountShipping ?? sanityOrder?.amountShipping);
          const taxTotal =
            typeof sessionDetails.total_details?.amount_tax === 'number'
              ? centsToDollars(sessionDetails.total_details.amount_tax)
              : dollars((newOrder as any)?.amountTax ?? sanityOrder?.amountTax);
          const discountTotal =
            typeof sessionDetails.total_details?.amount_discount === 'number'
              ? centsToDollars(sessionDetails.total_details.amount_discount)
              : 0;
          const orderTotal =
            typeof sessionDetails.amount_total === 'number'
              ? centsToDollars(sessionDetails.amount_total)
              : dollars((newOrder as any)?.totalAmount ?? sanityOrder?.totalAmount);

          const summaryRows = [
            { label: 'Subtotal', value: subtotal, emphasize: false, hideIfZero: false },
            { label: 'Shipping', value: shippingTotal, emphasize: false, hideIfZero: true },
            { label: 'Tax', value: taxTotal, emphasize: false, hideIfZero: true },
            {
              label: 'Discounts',
              value: discountTotal > 0 ? -discountTotal : 0,
              emphasize: false,
              hideIfZero: discountTotal <= 0
            },
            { label: 'Order Total', value: orderTotal, emphasize: true, hideIfZero: false }
          ]
            .filter((row) => !(row.hideIfZero && Math.abs(row.value) < 0.005))
            .map(
              (row) => `<tr>
                <td style="padding:6px 0;color:#4b5563;">${row.label}</td>
                <td style="padding:6px 0;text-align:right;font-weight:${row.emphasize ? 600 : 500};color:#111827;">
                  ${row.value < 0 ? '-' : ''}${formatCurrency(Math.abs(row.value))}
                </td>
              </tr>`
            )
            .join('');

          const paymentMethod = (() => {
            const charge = (paymentIntent as any)?.charges?.data?.[0];
            const brand = charge?.payment_method_details?.card?.brand;
            const last4 = charge?.payment_method_details?.card?.last4;
            if (!brand && !last4) return '';
            return `<div style="margin-top:24px;">
              <h3 style="font-size:16px;font-weight:600;margin:0 0 8px 0;">Payment Method</h3>
              <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
                <div style="margin:0;color:#111827;">${escapeHtml(
                  String(brand || 'Card')
                ).toUpperCase()} ending in ${escapeHtml(last4 || '••••')}</div>
              </div>
            </div>`;
          })();

          const shippingBlock = buildAddressHtml(
            shippingDetailsForEmail || sessionDetails.customer_details || null
          );

          const html = `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;background-color:#f4f5f7;padding:24px;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 35px rgba(15,23,42,0.12);">
              <div style="background:#111827;padding:24px;text-align:center;">
                <img src="https://www.fasmotorsports.com/logo/chromelogofas.webp" alt="FAS Motorsports" style="display:inline-block;max-width:160px;width:100%;height:auto;" />
              </div>
              <div style="padding:24px;">
                <p style="font-size:24px;font-weight:600;margin:0 0 8px 0;color:#111827;">Thank you for your order!</p>
                <p style="margin:0 0 24px 0;color:#4b5563;">Hi ${escapeHtml(
                  customerName
                )}, we’re processing your order and will email tracking details once it ships.</p>
                <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;background:#f9fafb;">
                  <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Order Number</div>
                  <div style="font-size:18px;font-weight:600;margin:4px 0 12px 0;color:#111827;">${escapeHtml(
                    orderNumber
                  )}</div>
                  <div style="font-size:14px;color:#6b7280;">Placed on ${escapeHtml(orderDate)}</div>
                </div>
                <h3 style="font-size:16px;font-weight:600;margin:0 0 12px 0;color:#111827;">Order Summary</h3>
                <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                  <thead>
                    <tr style="background-color:#f3f4f6;">
                      <th style="text-align:left;padding:12px;font-size:13px;color:#6b7280;font-weight:600;">Item</th>
                      <th style="text-align:center;padding:12px;font-size:13px;color:#6b7280;font-weight:600;">Qty</th>
                      <th style="text-align:right;padding:12px;font-size:13px;color:#6b7280;font-weight:600;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      rows ||
                      `<tr><td colspan="3" style="padding:16px;text-align:center;color:#6b7280;">No items found</td></tr>`
                    }
                  </tbody>
                </table>
                <table style="width:100%;margin-top:16px;border-collapse:collapse;">
                  ${summaryRows}
                </table>
                ${shippingBlock}
                ${paymentMethod}
                <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;line-height:1.6;">
                  <p style="margin:0 0 8px 0;">If you have any questions, reply to this email or contact us at <a href="mailto:sales@fasmotorsports.com" style="color:#ef4444;text-decoration:none;">sales@fasmotorsports.com</a>.</p>
                  <p style="margin:0;">Thank you for choosing FAS Motorsports.</p>
                </div>
              </div>
            </div>
          </div>`;

        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: RESEND_FROM,
              to,
              subject: `Your FAS Motorsports Order Confirmation – ${orderNumber}`,
              html
            })
          });
          const { body, rawText } = await parseResendResponse(response);
          if (!extractResendMessageId(body)) {
            console.warn('[astro webhook] resend confirmation email missing id', {
              orderNumber
            });
          }
          if (!response.ok) {
            console.warn('[astro webhook] confirmation email failed', response.status, rawText);
          }
        } catch (error) {
          console.warn('Email send failed', error);
        }

        // Create email log
        await sanity
          .create({
            _type: 'emailLog',
            to,
            subject: `Order Confirmation - ${orderNumber}`,
            status: 'sent',
            sentAt: new Date().toISOString(),
            emailType: 'order_confirmation',
            relatedOrder: {
              _type: 'reference',
              _ref: newOrder._id
            }
          })
          .catch((err) => console.error('Failed to log email:', err));

        if (orderId) {
          const patch = sanity.patch(orderId).set({ confirmationEmailSent: true });
          if (generatedOrderNumber) {
            patch.set({ orderNumber: generatedOrderNumber });
          }
          await patch.commit({ autoGenerateArrayKeys: true }).catch((err) => {
            console.warn(
              '[astro webhook] unable to update confirmation flags',
              (err as any)?.message || err
            );
          });
        }

        // Internal notifications to support + info
        const internalHtml = `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111">
            <h2 style="margin:0 0 8px 0">New order received</h2>
            <p style="margin:0 0 8px 0"><strong>Order:</strong> ${escapeHtml(orderNumber)}</p>
            <p style="margin:0 0 8px 0"><strong>Customer:</strong> ${escapeHtml(email)}</p>
            <p style="margin:0 0 8px 0"><strong>Total:</strong> ${formatCurrency(orderTotal)}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:8px">
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc">Item</th>
                  <th style="text-align:center;padding:8px;border-bottom:1px solid #ccc">Qty</th>
                  <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: RESEND_FROM,
              to: ['sales@fasmotorsports.com', 'info@fasmotorsports.com'],
              subject: `New Order: ${orderNumber}`,
              html: internalHtml
            })
          });
          const { body, rawText } = await parseResendResponse(response);
          if (!extractResendMessageId(body)) {
            console.warn('[astro webhook] resend internal email missing id', {
              orderNumber
            });
          }
          if (!response.ok) {
            console.warn('Internal email send failed', response.status, rawText);
          }
        } catch (error) {
          console.warn('Internal email send failed', error);
        }
      }
    } catch (err) {
      console.error('❌ Failed to save order to Sanity:', err);
    }
    break;
  }
  case 'charge.refunded': {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      console.warn('No payment intent ID in refund charge');
      break;
    }

    const orders = await sanity.fetch(
      `*[_type == "order" && stripePaymentIntentId == $paymentIntentId]`,
      { paymentIntentId }
    );

    if (orders.length === 0) {
      console.warn('No order found for payment intent:', paymentIntentId);
      break;
    }

    const order = orders[0];
    await sanity
      .patch(order._id)
      .set({
        status: 'refunded',
        paymentStatus: 'refunded',
        amountRefunded: charge.amount_refunded / 100,
        lastRefundedAt: new Date().toISOString()
      })
      .commit();

    console.log('✅ Order refunded:', order._id);
    break;
  }
  default:
    break;
  }

  return new Response('Webhook received.', { status: 200 });
}
