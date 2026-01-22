/* eslint-disable no-empty */
import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { stripe } from './_stripe';
import { sanity } from './_sanity';
import type { SanityDocumentStub } from '@sanity/client';
import { sendEmail } from './_resend';
import { extractResendMessageId } from '../../src/lib/resend';
import { createOrderCartItem, type OrderCartItem } from '../../src/server/sanity/order-cart';
import {
  type InventoryOrderItem,
  processOrderPayment,
  releaseInventory,
  reserveInventory
} from './_inventory';
import { trackPromotionUsage } from '../../src/server/sanity/promotions';
import {
  stripeCheckoutSessionSchema,
  stripePaymentIntentSchema,
  stripeWebhookEventSchema,
  stripeLineItemsSchema,
  stripeChargeSchema,
  stripeInvoiceSchema
} from '../../src/lib/validators/stripe';
import {
  sanityCustomerSchema,
  sanityOrderSchema,
  sanityQuoteSchema
} from '../../src/lib/validators/sanity';

type LineItemWithMetadata = Stripe.LineItem & { metadata?: Stripe.Metadata | null };

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

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

const extractSlugFromUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  try {
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, '');
    const withoutQuery = withoutOrigin.split(/[?#]/)[0];
    const segments = withoutQuery.replace(/^\/+/g, '').split('/').filter(Boolean);
    if (!segments.length) return undefined;
    return segments[segments.length - 1] || undefined;
  } catch {
    return undefined;
  }
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
  carrier?: string;
  carrierId?: string;
  serviceCode?: string;
  serviceName?: string;
  amount?: number;
  currency?: string;
  deliveryDays?: number | null;
  estimatedDeliveryDate?: string | null;
  metadata: Record<string, string>;
};

type OrderDocument = {
  _type: 'order';
  cart: OrderCartItem[];
  [key: string]: unknown;
};

const toInventoryOrderItems = (items: OrderCartItem[] = []): InventoryOrderItem[] => {
  const isPositiveQuantity = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;

  return items
    .map((item) => {
      const productId = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : undefined;
      const rawVariantSku =
        (item as any)?.metadata?.variantSku ||
        (item as any)?.metadata?.variant_sku ||
        (item as any)?.metadata?.variantSKU ||
        undefined;
      const variantSku =
        typeof rawVariantSku === 'string' && rawVariantSku.trim()
          ? rawVariantSku.trim()
          : undefined;
      const quantity = isPositiveQuantity(item.quantity) ? item.quantity : undefined;

      return {
        productId,
        quantity: quantity ?? 0,
        variantSku,
        sku: item.sku
      } satisfies InventoryOrderItem;
    })
    .filter((item) => item.productId && isPositiveQuantity(item.quantity));
};

const fetchOrderByPaymentIntent = async (paymentIntentId: string) => {
  if (!paymentIntentId) return null;
  try {
    const order = await sanity.fetch(
      `*[_type=="order" && paymentIntentId==$id][0]{ _id, cart, status }`,
      { id: paymentIntentId }
    );
    const orderResult = sanityOrderSchema.partial().safeParse(order);
    if (!orderResult.success) {
      console.warn('[sanity-validation]', {
        _id: (order as any)?._id,
        _type: 'order',
        errors: orderResult.error.format()
      });
      return null;
    }
    return orderResult.data;
  } catch (error) {
    console.warn('[stripe-webhook] unable to fetch order by paymentIntentId', error);
    return null;
  }
};

const parseShippingSelection = (session: Stripe.Checkout.Session): ShippingSelection | null => {
  const meta = (session.metadata || {}) as Record<string, string | null | undefined>;
  const metadata: Record<string, string> = {};

  const read = (key: string): string | undefined => {
    const raw = meta[key];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) {
        metadata[key] = trimmed;
        return trimmed;
      }
    }
    return undefined;
  };

  const carrier = read('shipping_carrier');
  const carrierId = read('shipping_carrier_id');
  const serviceCode = read('shipping_service_code');
  const serviceNameFromMetadata = read('shipping_service_name');
  const serviceLabel = read('shipping_service');
  const serviceName = serviceNameFromMetadata || serviceLabel;
  const amountStr = read('shipping_amount');
  const currencyRaw =
    read('shipping_currency') ||
    (typeof session.currency === 'string' ? session.currency : undefined);
  const deliveryDaysStr = read('shipping_delivery_days');
  const estimatedDeliveryDate = read('shipping_estimated_delivery_date');

  const amount = amountStr && Number.isFinite(Number(amountStr)) ? Number(amountStr) : undefined;
  const deliveryDays =
    deliveryDaysStr && Number.isFinite(Number(deliveryDaysStr)) ? Number(deliveryDaysStr) : null;
  const currency = currencyRaw ? currencyRaw.toUpperCase() : undefined;

  if (currency) metadata.shipping_currency = currency;
  if (amountStr) metadata.shipping_amount = amountStr;

  const hasMetadata = Object.keys(metadata).length > 0;
  if (
    !hasMetadata &&
    !carrier &&
    !carrierId &&
    !serviceCode &&
    !serviceName &&
    typeof amount === 'undefined'
  ) {
    return null;
  }

  return {
    carrier,
    carrierId,
    serviceCode,
    serviceName,
    amount,
    currency,
    deliveryDays,
    estimatedDeliveryDate: estimatedDeliveryDate || null,
    metadata
  };
};

const toShippingCarrierOption = (carrier?: string): string | undefined => {
  if (!carrier) return undefined;
  const value = carrier.trim().toLowerCase();
  if (!value) return undefined;
  if (value.includes('ups')) return 'UPS';
  if (value.includes('fedex')) return 'FedEx';
  if (value.includes('usps') || value.includes('postal')) return 'USPS';
  return 'Other';
};

export const handler: Handler = async (event) => {
  return json(410, {
    error: 'Deprecated webhook. Use /api/webhooks for Stripe events.'
  });

  try {
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) return json(500, { error: 'Missing STRIPE_WEBHOOK_SECRET' });
    if (!sig) return json(400, { error: 'Missing stripe-signature' });
    if (!event.body) return json(400, { error: 'Missing request body' });

    let evt: Stripe.Event;
    try {
      evt = stripe.webhooks.constructEvent(event.body, sig as string, secret);
    } catch (err: any) {
      console.error('[stripe-webhook] signature verification failed', err?.message || err);
      return json(400, { error: 'Invalid signature' });
    }

    const eventResult = stripeWebhookEventSchema.safeParse(evt);
    if (!eventResult.success) {
      console.error('[validation-failure]', {
        schema: 'stripeWebhookEventSchema',
        context: 'netlify/stripe-webhook',
        identifier: evt?.id || 'unknown',
        timestamp: new Date().toISOString(),
        errors: eventResult.error.format()
      });
      return json(400, { error: 'Invalid webhook payload', details: eventResult.error.format() });
    }

    if (evt.type === 'checkout.session.completed') {
      const sessionResult = stripeCheckoutSessionSchema.safeParse(evt.data.object);
      if (!sessionResult.success) {
        console.error('[validation-failure]', {
          schema: 'stripeCheckoutSessionSchema',
          context: 'netlify/stripe-webhook',
          identifier: evt?.id || 'unknown',
          timestamp: new Date().toISOString(),
          errors: sessionResult.error.format()
        });
        return json(400, {
          error: 'Invalid webhook payload',
          details: sessionResult.error.format()
        });
      }
      const session = sessionResult.data as unknown as Stripe.Checkout.Session;
      const promotionId =
        (session.metadata as any)?.promotion_id ||
        (session.metadata as any)?.promotionId ||
        (session.metadata as any)?.promotionID;
      const marketingOptIn =
        String((session.metadata as any)?.marketing_opt_in || '')
          .trim()
          .toLowerCase() === 'true' || session.consent?.promotions === 'opt_in';
      const marketingTimestamp = new Date().toISOString();

      // Prefer existing order by stripeSessionId to avoid duplicates (idempotent)
      let existingOrder = await sanity
        .fetch(`*[_type=="order" && stripeSessionId==$id][0]{_id}`, { id: session.id })
        .catch(() => null);
      if (existingOrder) {
        const existingOrderResult = sanityOrderSchema.partial().safeParse(existingOrder);
        if (!existingOrderResult.success) {
          console.warn('[sanity-validation]', {
            _id: (existingOrder as any)?._id,
            _type: 'order',
            errors: existingOrderResult.error.format()
          });
          existingOrder = null;
        } else {
          existingOrder = existingOrderResult.data;
        }
      }
      if (existingOrder?._id) {
        console.log('[stripe-webhook] order already exists for', session.id);
      }

      // Fetch line items
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      const itemsResult = stripeLineItemsSchema.safeParse(items);
      if (!itemsResult.success) {
        console.error('[stripe-validation]', {
          id: session.id,
          errors: itemsResult.error.format()
        });
        throw new Error('Invalid Stripe line items response');
      }
      const validatedItems = itemsResult.data;
      // Retrieve the full session with expanded shipping data
      const fullSession = (await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['shipping_cost.shipping_rate', 'shipping_details']
      })) as Stripe.Checkout.Session;

      // Extract shipping options
      const shippingOptions = fullSession.shipping_options?.map((option) => ({
        _type: 'object',
        shippingRateId: option.shipping_rate as string,
        shippingAmount: option.shipping_amount
      }));

      // Extract shipping cost details
      let shippingCostDetails: any = undefined;
      if (fullSession.shipping_cost) {
        const shippingRate = fullSession.shipping_cost.shipping_rate;
        const displayName =
          typeof shippingRate === 'string'
            ? shippingRate
            : (shippingRate as Stripe.ShippingRate)?.display_name;

        shippingCostDetails = {
          _type: 'object',
          amount: fullSession.shipping_cost.amount_total,
          displayName: displayName || undefined
        };

        // Add delivery estimate if available
        if (typeof shippingRate !== 'string' && shippingRate?.delivery_estimate) {
          const estimate = shippingRate.delivery_estimate;
          if (estimate.minimum || estimate.maximum) {
            shippingCostDetails.deliveryEstimate = {
              _type: 'object',
              minimum: estimate.minimum?.value || undefined,
              maximum: estimate.maximum?.value || undefined
            };
          }
        }
      }

      // Extract shipping details (address)
      let shippingDetailsData: any = undefined;
      const shippingDetails = (fullSession as any).shipping_details;
      if (shippingDetails) {
        shippingDetailsData = {
          _type: 'object',
          name: shippingDetails.name || undefined
        };

        if (shippingDetails.address) {
          shippingDetailsData.address = {
            _type: 'object',
            line1: shippingDetails.address.line1 || undefined,
            line2: shippingDetails.address.line2 || undefined,
            city: shippingDetails.address.city || undefined,
            state: shippingDetails.address.state || undefined,
            postalCode: shippingDetails.address.postal_code || undefined,
            country: shippingDetails.address.country || undefined
          };
        }
      }

      // Extract selected shipping rate ID
      const selectedShippingRate =
        typeof fullSession.shipping_cost?.shipping_rate === 'string'
          ? fullSession.shipping_cost.shipping_rate
          : (fullSession.shipping_cost?.shipping_rate as Stripe.ShippingRate)?.id;
      // Retrieve payment intent details
      let paymentIntent: Stripe.PaymentIntent | null = null;
      try {
        const piId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
        if (piId)
          paymentIntent = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
      } catch (e) {
        console.warn('[stripe-webhook] unable to retrieve PaymentIntent for', session.id);
      }
      if (paymentIntent) {
        const paymentIntentResult = stripePaymentIntentSchema.safeParse(paymentIntent);
        if (!paymentIntentResult.success) {
          console.error('[stripe-validation]', {
            id: paymentIntent?.id,
            errors: paymentIntentResult.error.format()
          });
          throw new Error('Invalid Stripe payment intent response');
        }
        paymentIntent = paymentIntentResult.data as unknown as Stripe.PaymentIntent;
      }

      // Find or create Sanity customer
      const email = session.customer_details?.email || session.customer_email || '';
      // Prefer userId from session metadata if provided during Checkout
      let userId: string | undefined = (session.metadata as any)?.userId || undefined;
      let customerRef: { _type: 'reference'; _ref: string } | undefined;
      if (email) {
        let existing = await sanity
          .fetch(
            `*[_type=="customer" && lower(email)==lower($email)][0]{_id,emailMarketing,marketingOptIn,emailOptIn}`,
            {
              email
            }
          )
          .catch(() => null);
        if (existing) {
          const existingResult = sanityCustomerSchema.partial().safeParse(existing);
          if (!existingResult.success) {
            console.warn('[sanity-validation]', {
              _id: (existing as any)?._id,
              _type: 'customer',
              errors: existingResult.error.format()
            });
            existing = null;
          } else {
            existing = existingResult.data;
          }
        }
        let customerId: string | undefined = existing?._id;
        if (!customerId) {
          const created = await sanity.create({
            _type: 'customer',
            email,
            name: session.customer_details?.name || '',
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
          // Pull authId from customer, if present, to align with userId-based queries
          try {
            const cust = await sanity.fetch(`*[_id==$id][0]{authId}`, { id: customerId });
            if (!userId && cust?.authId) userId = String(cust.authId);
          } catch {}

          // Persist marketing preference on customer
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
            console.warn('[stripe-webhook] unable to persist marketing opt-in', err as any);
          }
        }
      }

      // Compact cart metadata if present
      let cartLines: OrderCartItem[] = [];
      const metaCart = (session.metadata && (session.metadata as any).cart) || '';
      if (metaCart) {
        try {
          const parsed = JSON.parse(metaCart);
          if (Array.isArray(parsed)) {
            cartLines = parsed.map((l: any) => {
              const rawId = typeof l?.i === 'string' && l.i.trim() ? l.i : l?.id;
              const productUrl = typeof l?.url === 'string' ? l.url : undefined;
              const productSlug =
                typeof l?.slug === 'string' ? l.slug : extractSlugFromUrl(productUrl);
              const metadata: Record<string, unknown> = {};
              if (l?.o) metadata.option_summary = l.o;
              if (l?.u) metadata.upgrades = l.u;
              if (typeof l?.ut === 'number') metadata.upgrades_total = l.ut;
              if (l?.meta && typeof l.meta === 'object') {
                Object.assign(metadata, l.meta as Record<string, unknown>);
              }
              return createOrderCartItem({
                id: rawId,
                sku: l?.sku,
                name: l?.n || l?.name,
                price: typeof l?.p === 'number' ? l.p : Number(l?.p || 0),
                quantity: typeof l?.q === 'number' ? l.q : Number(l?.q || 0),
                categories: l?.categories,
                image: typeof l?.img === 'string' ? l.img : undefined,
                productUrl,
                productSlug,
                metadata: Object.keys(metadata).length ? metadata : undefined
              });
            });
          }
        } catch {}
      }
      if (!cartLines.length) {
        const fallbackLines: OrderCartItem[] = [];
        for (const rawItem of validatedItems?.data || []) {
          const li = rawItem as unknown as LineItemWithMetadata;
          const priceValue =
            typeof li.amount_subtotal === 'number'
              ? li.amount_subtotal / 100
              : typeof li.price?.unit_amount === 'number'
                ? li.price.unit_amount / 100
                : undefined;

          const priceMetadata = (li.price?.metadata || {}) as Record<string, unknown>;
          let productMetadata: Record<string, unknown> = {};
          const priceProduct = li.price?.product;
          if (priceProduct && typeof priceProduct === 'object' && (priceProduct as any).metadata) {
            productMetadata = ((priceProduct as any).metadata || {}) as Record<string, unknown>;
          } else if (typeof priceProduct === 'string') {
            try {
              const stripeProduct = await stripe.products.retrieve(priceProduct);
              productMetadata = (stripeProduct?.metadata || {}) as Record<string, unknown>;
            } catch (error) {
              console.error('[stripe-webhook] failed to load Stripe product metadata', error);
            }
          }

          const lineItemMetadata = (li.metadata || {}) as Record<string, unknown>;
          const combinedMetadata: Record<string, unknown> = {
            ...lineItemMetadata,
            ...productMetadata,
            ...priceMetadata
          };

          if (li.description && !combinedMetadata.product_name) {
            combinedMetadata.product_name = li.description;
          }
          if (li.quantity != null && combinedMetadata.quantity == null) {
            combinedMetadata.quantity = String(li.quantity);
          }
          if (!combinedMetadata.unit_price) {
            if (typeof li.price?.unit_amount === 'number') {
              combinedMetadata.unit_price = (li.price.unit_amount / 100).toFixed(2);
            } else if (typeof priceValue === 'number') {
              combinedMetadata.unit_price = priceValue.toFixed(2);
            }
          }
          if (
            combinedMetadata.option_summary &&
            typeof combinedMetadata.option_summary === 'string' &&
            !combinedMetadata.options_readable
          ) {
            combinedMetadata.options_readable = combinedMetadata.option_summary;
          }
          if (
            combinedMetadata.upgrades &&
            typeof combinedMetadata.upgrades === 'string' &&
            !combinedMetadata.upgrades_readable
          ) {
            combinedMetadata.upgrades_readable = combinedMetadata.upgrades;
          }

          const sanityProductId = (() => {
            const candidates = [
              combinedMetadata.sanity_product_id,
              combinedMetadata.product_id,
              combinedMetadata.sanityProductId,
              combinedMetadata.sanityProductID
            ];
            for (const candidate of candidates) {
              if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
            }
            return undefined;
          })();

          const productUrl = (() => {
            const candidates = [
              combinedMetadata.product_url,
              combinedMetadata.url,
              combinedMetadata.productUrl
            ];
            for (const candidate of candidates) {
              if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
            }
            return undefined;
          })();

          const productSlug = (() => {
            const candidates = [
              combinedMetadata.product_slug,
              combinedMetadata.slug,
              combinedMetadata.productSlug
            ];
            for (const candidate of candidates) {
              if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
            }
            return extractSlugFromUrl(productUrl);
          })();

          const imageUrl = (() => {
            const candidates = [
              combinedMetadata.imageUrl,
              combinedMetadata.image_url,
              combinedMetadata.image_url_original,
              combinedMetadata.product_image,
              combinedMetadata.productImage,
              combinedMetadata.thumbnail,
              combinedMetadata.thumbnailUrl,
              combinedMetadata.img,
              combinedMetadata.image
            ];
            for (const candidate of candidates) {
              if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
            }
            return undefined;
          })();

          fallbackLines.push(
            createOrderCartItem({
              id: sanityProductId,
              sku:
                (typeof combinedMetadata.sku === 'string' && combinedMetadata.sku) ||
                (typeof li.price?.id === 'string' ? li.price.id : undefined),
              name:
                li.description ||
                (typeof combinedMetadata.product_name === 'string'
                  ? combinedMetadata.product_name
                  : undefined) ||
                (typeof li.price?.nickname === 'string' ? li.price.nickname : undefined),
              price: priceValue,
              quantity: li.quantity,
              image: imageUrl,
              productUrl,
              productSlug,
              metadata: Object.keys(combinedMetadata).length ? combinedMetadata : undefined
            })
          );
        }
        cartLines = fallbackLines;
      }

      const shippingSelection = parseShippingSelection(session);
      const shippingCarrierOption = shippingSelection
        ? toShippingCarrierOption(shippingSelection.carrier)
        : undefined;

      const collectedShippingDetails = session.collected_information?.shipping_details || null;
      const shippingDetailsForEmail: Stripe.Checkout.Session.CustomerDetails | null =
        collectedShippingDetails
          ? {
              address: collectedShippingDetails.address,
              business_name: session.customer_details?.business_name ?? null,
              email: email || null,
              individual_name: session.customer_details?.individual_name ?? null,
              name: collectedShippingDetails.name,
              phone: session.customer_details?.phone ?? null,
              tax_exempt: session.customer_details?.tax_exempt ?? null,
              tax_ids: session.customer_details?.tax_ids ?? null
            }
          : null;

      // Create order if not exists
      let orderId = existingOrder?._id as string | undefined;
      let createdOrderDoc: Record<string, unknown> | null = null;
      if (!orderId) {
        const orderPayload: SanityDocumentStub<OrderDocument> = {
          _type: 'order',
          stripeSessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          paymentStatus: paymentIntent?.status || session.payment_status || 'unknown',
          chargeId:
            typeof (paymentIntent as any)?.latest_charge === 'string'
              ? (paymentIntent as any).latest_charge
              : (paymentIntent as any)?.latest_charge?.id,
          cardBrand:
            (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.brand || '',
          cardLast4:
            (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.last4 || '',
          receiptUrl: (paymentIntent as any)?.charges?.data?.[0]?.receipt_url || '',
          currency: session.currency || 'usd',
          amountSubtotal:
            typeof session.amount_subtotal === 'number' ? session.amount_subtotal / 100 : undefined,
          amountTax:
            typeof session.total_details?.amount_tax === 'number'
              ? session.total_details.amount_tax / 100
              : undefined,
          amountShipping:
            typeof session.shipping_cost?.amount_total === 'number'
              ? session.shipping_cost.amount_total / 100
              : undefined,
          customerEmail: email,
          customer: customerRef,
          userId,
          cart: cartLines,
          totalAmount: session.amount_total ? session.amount_total / 100 : 0,
          status: session.payment_status === 'paid' ? 'paid' : 'pending',
          createdAt: new Date().toISOString(),
          shippingAddress: {
            name: session.customer_details?.name || '',
            phone: session.customer_details?.phone || '',
            email: email,
            addressLine1: session.customer_details?.address?.line1 || '',
            addressLine2: session.customer_details?.address?.line2 || '',
            city: session.customer_details?.address?.city || '',
            state: session.customer_details?.address?.state || '',
            postalCode: session.customer_details?.address?.postal_code || '',
            country: session.customer_details?.address?.country || 'US'
          },
          shippingOptions:
            shippingOptions && shippingOptions.length > 0 ? shippingOptions : undefined,
          selectedShippingRate: selectedShippingRate || undefined,
          shippingCost: shippingCostDetails || undefined,
          shippingDetails: shippingDetailsData || undefined,
          webhookNotified: true
        };

        if (shippingCarrierOption) {
          orderPayload.shippingCarrier = shippingCarrierOption;
        }
        if (shippingSelection?.metadata && Object.keys(shippingSelection.metadata).length) {
          orderPayload.shippingMetadata = shippingSelection.metadata;
        }
        if (shippingSelection?.serviceCode) {
          orderPayload.shippingServiceCode = shippingSelection.serviceCode;
        }
        if (shippingSelection?.serviceName) {
          orderPayload.shippingServiceName = shippingSelection.serviceName;
        }
        if (typeof shippingSelection?.amount === 'number') {
          orderPayload.selectedShippingAmount = shippingSelection.amount;
        }
        if (shippingSelection?.currency) {
          orderPayload.selectedShippingCurrency = shippingSelection.currency;
        }
        if (
          shippingSelection?.deliveryDays !== undefined &&
          shippingSelection?.deliveryDays !== null
        ) {
          orderPayload.shippingDeliveryDays = shippingSelection.deliveryDays;
        }
        if (shippingSelection?.estimatedDeliveryDate) {
          orderPayload.shippingEstimatedDeliveryDate = shippingSelection.estimatedDeliveryDate;
        }

        const orderDoc = await sanity.create(orderPayload);
        orderId = orderDoc._id as string;
        createdOrderDoc = orderDoc;
      }

      try {
        const cartId = session.client_reference_id || session.id;
        await sanity
          .patch(cartId)
          .set({
            sessionId: session.id,
            status: 'complete',
            customerEmail: email,
            customerName: session.customer_details?.name || undefined,
            customerPhone: session.customer_details?.phone || undefined,
            amountSubtotal: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
            amountTax: session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0,
            amountShipping: session.shipping_cost?.amount_total
              ? session.shipping_cost.amount_total / 100
              : 0,
            totalAmount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency?.toUpperCase() || 'USD',
            shippingOptions:
              shippingOptions && shippingOptions.length > 0 ? shippingOptions : undefined,
            selectedShippingRate: selectedShippingRate || undefined,
            shippingCost: shippingCostDetails || undefined,
            shippingDetails: shippingDetailsData || undefined
          })
          .commit({ autoGenerateArrayKeys: true });
        console.log(`✅ Updated checkout session ${cartId} with shipping data`);
      } catch (err) {
        console.warn('[stripe-webhook] unable to update checkout session with shipping data', err);
      }

      // Create invoice doc for the order (idempotent by session)
      const existingInvoice = await sanity
        .fetch(`*[_type=="invoice" && stripeSessionId==$id][0]{_id}`, { id: session.id })
        .catch(() => null);
      if (!existingInvoice?._id) {
        await sanity.create({
          _type: 'invoice',
          order: orderId ? { _type: 'reference', _ref: orderId } : undefined,
          stripeSessionId: session.id,
          invoiceNumber: `INV-${(session.id || '').replace('cs_test_', '').slice(-10)}`,
          status: 'paid',
          currency: session.currency || 'usd',
          total: session.amount_total ? session.amount_total / 100 : undefined,
          amountSubtotal:
            typeof session.amount_subtotal === 'number' ? session.amount_subtotal / 100 : undefined,
          amountTax:
            typeof session.total_details?.amount_tax === 'number'
              ? session.total_details.amount_tax / 100
              : undefined,
          dateIssued: new Date().toISOString(),
          customerEmail: email,
          customer: customerRef,
          userId,
          lineItems: (validatedItems?.data || []).map((li) => ({
            _type: 'lineItem',
            description: li.description,
            quantity: li.quantity,
            amount_total: (li.amount_total || 0) / 100
          })),
          paymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          receiptUrl: (paymentIntent as any)?.charges?.data?.[0]?.receipt_url || ''
        });
      }

      if (orderId && (shippingCarrierOption || shippingSelection)) {
        const patchData: Record<string, any> = {};
        if (shippingCarrierOption) patchData.shippingCarrier = shippingCarrierOption;
        if (shippingSelection?.metadata && Object.keys(shippingSelection.metadata).length) {
          patchData.shippingMetadata = shippingSelection.metadata;
        }
        if (shippingSelection?.serviceCode) {
          patchData.shippingServiceCode = shippingSelection.serviceCode;
        }
        if (shippingSelection?.serviceName) {
          patchData.shippingServiceName = shippingSelection.serviceName;
        }
        if (typeof shippingSelection?.amount === 'number') {
          patchData.selectedShippingAmount = shippingSelection.amount;
        }
        if (shippingSelection?.currency) {
          patchData.selectedShippingCurrency = shippingSelection.currency;
        }
        if (
          shippingSelection?.deliveryDays !== undefined &&
          shippingSelection?.deliveryDays !== null
        ) {
          patchData.shippingDeliveryDays = shippingSelection.deliveryDays;
        }
        if (shippingSelection?.estimatedDeliveryDate) {
          patchData.shippingEstimatedDeliveryDate = shippingSelection.estimatedDeliveryDate;
        }

        if (Object.keys(patchData).length) {
          await sanity
            .patch(orderId)
            .set(patchData)
            .commit({ autoGenerateArrayKeys: true })
            .catch((err) =>
              console.warn(
                '[stripe-webhook] unable to persist shipping selection',
                (err as any)?.message || err
              )
            );
        }
      }

      // Reserve inventory immediately after order creation
      if (orderId && cartLines.length) {
        const inventoryItems = toInventoryOrderItems(cartLines);
        if (inventoryItems.length) {
          try {
            await reserveInventory(inventoryItems);
          } catch (error) {
            console.warn('[stripe-webhook] unable to reserve inventory', error);
          }

          if (session.payment_status === 'paid') {
            try {
              await processOrderPayment(orderId, inventoryItems);
            } catch (error) {
              console.warn('[stripe-webhook] unable to deduct inventory post-payment', error);
            }
          }
        }
      }

      // Send confirmation email if configured
      try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const to = email;
        if (RESEND_API_KEY && to) {
          let sanityOrder: {
            orderNumber?: string;
            customerName?: string;
            createdAt?: string;
            amountSubtotal?: number;
            amountTax?: number;
            amountShipping?: number;
            totalAmount?: number;
          } | null = null;
          if (orderId) {
            try {
              sanityOrder = await sanity.fetch(
                `*[_id==$id][0]{orderNumber,customerName,createdAt,amountSubtotal,amountTax,amountShipping,totalAmount}`,
                { id: orderId }
              );
              const sanityOrderResult = sanityOrderSchema.partial().safeParse(sanityOrder);
              if (!sanityOrderResult.success) {
                console.warn('[sanity-validation]', {
                  _id: (sanityOrder as any)?._id,
                  _type: 'order',
                  errors: sanityOrderResult.error.format()
                });
                sanityOrder = null;
              } else {
                sanityOrder = sanityOrderResult.data;
              }
            } catch (fetchErr) {
              console.warn(
                '[stripe-webhook] unable to fetch order metadata',
                (fetchErr as any)?.message || fetchErr
              );
            }
          }

          const sanityOrderNumber =
            typeof sanityOrder?.orderNumber === 'string' ? sanityOrder.orderNumber.trim() : '';
          const createdOrderNumber =
            typeof (createdOrderDoc as any)?.orderNumber === 'string'
              ? String((createdOrderDoc as any).orderNumber).trim()
              : '';
          const existingOrderNumber = sanityOrderNumber || createdOrderNumber;
          let generatedOrderNumber: string | undefined;
          const orderNumber =
            existingOrderNumber ||
            generateFallbackOrderNumber(session, orderId || session.id || '');
          if (!existingOrderNumber) {
            generatedOrderNumber = orderNumber;
          }

          const orderDate = formatOrderDate(
            sanityOrder?.createdAt || (createdOrderDoc as any)?.createdAt,
            session.created ?? (paymentIntent?.created as number | undefined)
          );
          const customerName =
            session.customer_details?.name ||
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
            typeof session.amount_subtotal === 'number'
              ? centsToDollars(session.amount_subtotal)
              : dollars(sanityOrder?.amountSubtotal ?? (session as any)?.amount_subtotal);
          const shippingTotal =
            typeof session.shipping_cost?.amount_total === 'number'
              ? centsToDollars(session.shipping_cost.amount_total)
              : dollars(sanityOrder?.amountShipping ?? (session as any)?.amount_shipping);
          const taxTotal =
            typeof session.total_details?.amount_tax === 'number'
              ? centsToDollars(session.total_details.amount_tax)
              : dollars(sanityOrder?.amountTax ?? (session as any)?.amount_tax);
          const discountTotal =
            typeof session.total_details?.amount_discount === 'number'
              ? centsToDollars(session.total_details.amount_discount)
              : 0;
          const orderTotal =
            typeof session.amount_total === 'number'
              ? centsToDollars(session.amount_total)
              : dollars(sanityOrder?.totalAmount ?? (session as any)?.amount_total);

          if (orderId && promotionId && discountTotal > 0) {
            try {
              await trackPromotionUsage(sanity, promotionId as string, orderTotal, discountTotal);
            } catch (err) {
              console.warn('[stripe-webhook] unable to track promotion usage', err);
            }
          }

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
                <td style="padding:6px 0;text-align:right;font-weight:${
                  row.emphasize ? 600 : 500
                };color:#111827;">
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
            shippingDetailsForEmail || session.customer_details || null
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

          const emailResponse = await sendEmail({
            to,
            subject: `Your FAS Motorsports Order Confirmation – ${orderNumber}`,
            html
          });
          if (!extractResendMessageId(emailResponse)) {
            console.warn('[stripe-webhook] resend confirmation email returned no id', {
              orderId,
              orderNumber
            });
          }

          if (orderId) {
            const patch = sanity.patch(orderId).set({ confirmationEmailSent: true });
            if (generatedOrderNumber) {
              patch.set({ orderNumber: generatedOrderNumber });
            }
            await patch.commit({ autoGenerateArrayKeys: true }).catch((err) => {
              console.warn(
                '[stripe-webhook] unable to update confirmation flags',
                (err as any)?.message || err
              );
            });
          }
        }
      } catch (e) {
        console.warn('[stripe-webhook] email send failed:', (e as any)?.message || e);
      }
    } else if (evt.type === 'invoice.finalized') {
      const invResult = stripeInvoiceSchema.safeParse(evt.data.object);
      if (!invResult.success) {
        console.error('[validation-failure]', {
          schema: 'stripeInvoiceSchema',
          context: 'netlify/stripe-webhook',
          identifier: evt?.id || 'unknown',
          timestamp: new Date().toISOString(),
          errors: invResult.error.format()
        });
        return json(400, { error: 'Invalid webhook payload', details: invResult.error.format() });
      }
      const inv = invResult.data as unknown as Stripe.Invoice;
      const stripeInvoiceId = inv.id;
      try {
        let quote = await sanity.fetch(`*[_type=="quote" && stripeInvoiceId==$id][0]{_id,status}`, {
          id: stripeInvoiceId
        });
        if (quote) {
          const quoteResult = sanityQuoteSchema.partial().safeParse(quote);
          if (!quoteResult.success) {
            console.warn('[sanity-validation]', {
              _id: (quote as any)?._id,
              _type: 'quote',
              errors: quoteResult.error.format()
            });
            quote = null;
          } else {
            quote = quoteResult.data;
          }
        }
        if (quote?._id) {
          await sanity
            .patch(quote._id)
            .set({
              status: quote.status === 'paid' ? 'paid' : 'invoiced',
              stripeInvoiceNumber: inv.number,
              stripeHostedInvoiceUrl: inv.hosted_invoice_url,
              stripeInvoiceTotal: typeof inv.total === 'number' ? inv.total / 100 : undefined
            })
            .commit();
        }
      } catch (e) {
        console.warn(
          '[stripe-webhook] update quote on invoice.finalized failed',
          (e as any)?.message || e
        );
      }
    } else if (evt.type === 'invoice.paid') {
      const invResult = stripeInvoiceSchema.safeParse(evt.data.object);
      if (!invResult.success) {
        console.error('[validation-failure]', {
          schema: 'stripeInvoiceSchema',
          context: 'netlify/stripe-webhook',
          identifier: evt?.id || 'unknown',
          timestamp: new Date().toISOString(),
          errors: invResult.error.format()
        });
        return json(400, { error: 'Invalid webhook payload', details: invResult.error.format() });
      }
      const inv = invResult.data as unknown as Stripe.Invoice;
      const stripeInvoiceId = inv.id;
      try {
        let quote = await sanity.fetch(`*[_type=="quote" && stripeInvoiceId==$id][0]{_id,status}`, {
          id: stripeInvoiceId
        });
        if (quote) {
          const quoteResult = sanityQuoteSchema.partial().safeParse(quote);
          if (!quoteResult.success) {
            console.warn('[sanity-validation]', {
              _id: (quote as any)?._id,
              _type: 'quote',
              errors: quoteResult.error.format()
            });
            quote = null;
          } else {
            quote = quoteResult.data;
          }
        }
        if (quote?._id && quote.status !== 'paid') {
          await sanity.patch(quote._id).set({ status: 'paid' }).commit();
        }
      } catch (e) {
        console.warn(
          '[stripe-webhook] update quote on invoice.paid failed',
          (e as any)?.message || e
        );
      }
    } else if (evt.type === 'payment_intent.succeeded') {
      const piResult = stripePaymentIntentSchema.safeParse(evt.data.object);
      if (!piResult.success) {
        console.error('[validation-failure]', {
          schema: 'stripePaymentIntentSchema',
          context: 'netlify/stripe-webhook',
          identifier: evt?.id || 'unknown',
          timestamp: new Date().toISOString(),
          errors: piResult.error.format()
        });
        return json(400, { error: 'Invalid webhook payload', details: piResult.error.format() });
      }
      const pi = piResult.data as unknown as Stripe.PaymentIntent;
      const order = await fetchOrderByPaymentIntent(pi.id);
      if (order?._id && order.status !== 'paid') {
        const cartItems = Array.isArray(order.cart) ? (order.cart as OrderCartItem[]) : [];
        await processOrderPayment(order._id, toInventoryOrderItems(cartItems));
      }
    } else if (evt.type === 'charge.succeeded') {
      const chargeResult = stripeChargeSchema.safeParse(evt.data.object);
      if (!chargeResult.success) {
        console.error('[validation-failure]', {
          schema: 'stripeChargeSchema',
          context: 'netlify/stripe-webhook',
          identifier: evt?.id || 'unknown',
          timestamp: new Date().toISOString(),
          errors: chargeResult.error.format()
        });
        return json(400, {
          error: 'Invalid webhook payload',
          details: chargeResult.error.format()
        });
      }
      const charge = chargeResult.data as unknown as Stripe.Charge;
      const piId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id || '';
      const order = await fetchOrderByPaymentIntent(piId);
      if (order?._id && order.status !== 'paid') {
        const cartItems = Array.isArray(order.cart) ? (order.cart as OrderCartItem[]) : [];
        await processOrderPayment(order._id, toInventoryOrderItems(cartItems));
      }
    } else if (evt.type === 'charge.refunded') {
      const chargeResult = stripeChargeSchema.safeParse(evt.data.object);
      if (!chargeResult.success) {
        console.error('[validation-failure]', {
          schema: 'stripeChargeSchema',
          context: 'netlify/stripe-webhook',
          identifier: evt?.id || 'unknown',
          timestamp: new Date().toISOString(),
          errors: chargeResult.error.format()
        });
        return json(400, {
          error: 'Invalid webhook payload',
          details: chargeResult.error.format()
        });
      }
      const charge = chargeResult.data as unknown as Stripe.Charge;
      const piId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id || '';
      const order = await fetchOrderByPaymentIntent(piId);
      if (order?._id) {
        const cartItems = Array.isArray(order.cart) ? (order.cart as OrderCartItem[]) : [];
        await releaseInventory(order._id, toInventoryOrderItems(cartItems));
        await sanity
          .patch(order._id)
          .set({ status: 'cancelled', paymentStatus: 'refunded' })
          .commit({ autoGenerateArrayKeys: true })
          .catch((error) => console.warn('[stripe-webhook] unable to mark order cancelled', error));
      }
    } else if (evt.type === 'payment_intent.canceled') {
      const piResult = stripePaymentIntentSchema.safeParse(evt.data.object);
      if (!piResult.success) {
        console.error('[validation-failure]', {
          schema: 'stripePaymentIntentSchema',
          context: 'netlify/stripe-webhook',
          identifier: evt?.id || 'unknown',
          timestamp: new Date().toISOString(),
          errors: piResult.error.format()
        });
        return json(400, { error: 'Invalid webhook payload', details: piResult.error.format() });
      }
      const pi = piResult.data as unknown as Stripe.PaymentIntent;
      const order = await fetchOrderByPaymentIntent(pi.id);
      if (order?._id) {
        const cartItems = Array.isArray(order.cart) ? (order.cart as OrderCartItem[]) : [];
        await releaseInventory(order._id, toInventoryOrderItems(cartItems));
        await sanity
          .patch(order._id)
          .set({ status: 'cancelled', paymentStatus: 'refunded' })
          .commit({ autoGenerateArrayKeys: true })
          .catch((error) => console.warn('[stripe-webhook] unable to mark order cancelled', error));
      }
    }

    return json(200, { received: true });
  } catch (e: any) {
    console.error('[stripe-webhook] unhandled error', e?.message || e);
    return json(500, { error: 'Server error' });
  }
};

export default { handler };
