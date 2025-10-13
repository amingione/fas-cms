import Stripe from 'stripe';
import { createClient } from '@sanity/client';
import type { SanityDocumentStub } from '@sanity/client';
import { createOrderCartItem, type OrderCartItem } from '@/server/sanity/order-cart';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
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
  apiVersion: '2023-06-07',
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
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userIdFromMetadata: string | undefined = (session.metadata as any)?.userId || undefined;

    console.log('✅ Payment confirmed for session:', session.id);
    console.log('Customer Email:', session.customer_details?.email);

    try {
      // Fetch line items to capture cart details
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

      // Retrieve payment intent details (brand/last4/receipt)
      let paymentIntent: Stripe.PaymentIntent | null = null;
      try {
        const piId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
        if (piId) {
          paymentIntent = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
        }
      } catch (e) {
        console.warn('Unable to retrieve PaymentIntent for session:', session.id);
      }

      // Find or create a Customer document
      let customerRef: { _type: 'reference'; _ref: string } | undefined;
      let userId: string | undefined = userIdFromMetadata;
      const email = session.customer_details?.email || '';
      if (email) {
        const existing = await sanity.fetch(
          `*[_type=="customer" && lower(email)==lower($email)][0]{_id}`,
          { email }
        );
        let customerId = existing?._id as string | undefined;
        if (!customerId) {
          const created = await sanity.create({
            _type: 'customer',
            email,
            name: session.customer_details?.name || ''
          });
          customerId = created._id as string;
        }
        if (customerId) {
          customerRef = { _type: 'reference', _ref: customerId };
          try {
            const cust: any = await sanity.fetch(`*[_id==$id][0]{authId}`, { id: customerId });
            if (cust?.authId) userId = String(cust.authId);
          } catch (error) {
            void error;
          }
        }
      }

      // Prefer cart metadata if present
      let cartLines: OrderCartItem[] = [];
      const metaCart = (session.metadata && (session.metadata as any).cart) || '';
      if (metaCart) {
        try {
          const parsed = JSON.parse(metaCart);
          if (Array.isArray(parsed)) {
            cartLines = parsed.map((l: any) =>
              createOrderCartItem({
                id: l?.id,
                sku: l?.sku,
                name: l?.n || l?.name,
                price: typeof l?.p === 'number' ? l.p : Number(l?.p || 0),
                quantity: typeof l?.q === 'number' ? l.q : Number(l?.q || 0),
                categories: l?.categories
              })
            );
          }
        } catch (error) {
          void error;
        }
      }
      if (!cartLines.length) {
        cartLines = (items?.data || []).map((li) =>
          createOrderCartItem({
            id: typeof li.price?.product === 'string' ? li.price.product : undefined,
            sku: typeof li.price?.id === 'string' ? li.price.id : undefined,
            name:
              li.description ||
              (typeof li.price?.nickname === 'string' ? li.price.nickname : undefined),
            price:
              typeof li.amount_subtotal === 'number'
                ? li.amount_subtotal / 100
                : typeof li.price?.unit_amount === 'number'
                ? li.price.unit_amount / 100
                : undefined,
            quantity: li.quantity
          })
        );
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
              email: session.customer_details?.email ?? null,
              name: collectedShippingDetails.name,
              phone: session.customer_details?.phone ?? null,
              tax_exempt: session.customer_details?.tax_exempt ?? null,
              tax_ids: session.customer_details?.tax_ids ?? null
            }
          : null;

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
        customerEmail: session.customer_details?.email || '',
        customer: customerRef,
        userId,
        cart: cartLines,
        totalAmount: session.amount_total ? session.amount_total / 100 : 0, // Convert cents to dollars
        status: 'paid',
        createdAt: new Date().toISOString(),
        shippingAddress: {
          name: session.customer_details?.name || '',
          phone: session.customer_details?.phone || '',
          email: session.customer_details?.email || '',
          addressLine1: session.customer_details?.address?.line1 || '',
          addressLine2: session.customer_details?.address?.line2 || '',
          city: session.customer_details?.address?.city || '',
          state: session.customer_details?.address?.state || '',
          postalCode: session.customer_details?.address?.postal_code || '',
          country: session.customer_details?.address?.country || 'US'
        },
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

      const newOrder = await sanity.create(orderPayload);

      console.log('📝 Order saved to Sanity:', newOrder._id);

      if (newOrder?._id && (shippingCarrierOption || shippingSelection)) {
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
            .patch(newOrder._id)
            .set(patchData)
            .commit({ autoGenerateArrayKeys: true })
            .catch((err) =>
              console.warn(
                '[astro webhook] unable to persist shipping selection',
                (err as any)?.message || err
              )
            );
        }
      }

      // Send confirmation email via Resend if configured
      const RESEND_API_KEY = import.meta.env.RESEND_API_KEY as string | undefined;
      const RESEND_FROM =
        (import.meta.env.RESEND_FROM as string | undefined) || 'noreply@fasmotorsports.com';
      const to = session.customer_details?.email;
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
          existingOrderNumber || generateFallbackOrderNumber(session, orderId || session.id || '');
        if (!existingOrderNumber) {
          generatedOrderNumber = orderNumber;
        }

        const orderDate = formatOrderDate(
          sanityOrder?.createdAt || (newOrder as any)?.createdAt,
          session.created
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
            : dollars((newOrder as any)?.amountSubtotal ?? sanityOrder?.amountSubtotal);
        const shippingTotal =
          typeof session.shipping_cost?.amount_total === 'number'
            ? centsToDollars(session.shipping_cost.amount_total)
            : dollars((newOrder as any)?.amountShipping ?? sanityOrder?.amountShipping);
        const taxTotal =
          typeof session.total_details?.amount_tax === 'number'
            ? centsToDollars(session.total_details.amount_tax)
            : dollars((newOrder as any)?.amountTax ?? sanityOrder?.amountTax);
        const discountTotal =
          typeof session.total_details?.amount_discount === 'number'
            ? centsToDollars(session.total_details.amount_discount)
            : 0;
        const orderTotal =
          typeof session.amount_total === 'number'
            ? centsToDollars(session.amount_total)
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
          shippingDetailsForEmail || session.customer_details || null
        );

        const html = `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;background-color:#f4f5f7;padding:24px;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 35px rgba(15,23,42,0.12);">
              <div style="background:#111827;padding:24px;text-align:center;">
                <img src="https://www.fasmotorsports.com/logo/chromelogofas.png" alt="FAS Motorsports" style="display:inline-block;max-width:160px;width:100%;height:auto;" />
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
                  <p style="margin:0 0 8px 0;">If you have any questions, reply to this email or contact us at <a href="mailto:support@fasmotorsports.com" style="color:#ef4444;text-decoration:none;">support@fasmotorsports.com</a>.</p>
                  <p style="margin:0;">Thank you for choosing FAS Motorsports.</p>
                </div>
              </div>
            </div>
          </div>`;

        await fetch('https://api.resend.com/emails', {
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
        }).catch((e) => console.warn('Email send failed', e));

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
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: ['support@fasmotorsports.com', 'info@fasmotorsports.com'],
            subject: `New Order: ${orderNumber}`,
            html: internalHtml
          })
        }).catch((e) => console.warn('Internal email send failed', e));
      }
    } catch (err) {
      console.error('❌ Failed to save order to Sanity:', err);
    }
  }

  return new Response('Webhook received.', { status: 200 });
}
