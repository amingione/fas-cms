import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { stripe } from './_stripe';
import { sanity } from './_sanity';
import { sendEmail } from './_resend';
import { createOrderCartItem, type OrderCartItem } from '../../src/server/sanity/order-cart';

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

export const handler: Handler = async (event) => {
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

    if (evt.type === 'checkout.session.completed') {
      const session = evt.data.object as Stripe.Checkout.Session;

      // Prefer existing order by stripeSessionId to avoid duplicates (idempotent)
      const existingOrder = await sanity
        .fetch(`*[_type=="order" && stripeSessionId==$id][0]{_id}`, { id: session.id })
        .catch(() => null);
      if (existingOrder?._id) {
        console.log('[stripe-webhook] order already exists for', session.id);
      }

      // Fetch line items
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

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

      // Find or create Sanity customer
      const email = session.customer_details?.email || '';
      // Prefer userId from session metadata if provided during Checkout
      let userId: string | undefined = (session.metadata as any)?.userId || undefined;
      let customerRef: { _type: 'reference'; _ref: string } | undefined;
      if (email) {
        const existing = await sanity
          .fetch(`*[_type=="customer" && lower(email)==lower($email)][0]{_id}`, { email })
          .catch(() => null);
        let customerId: string | undefined = existing?._id;
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
          // Pull authId from customer, if present, to align with userId-based queries
          try {
            const cust = await sanity.fetch(`*[_id==$id][0]{authId}`, { id: customerId });
            if (!userId && cust?.authId) userId = String(cust.authId);
          } catch {}
        }
      }

      // Compact cart metadata if present
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
        } catch {}
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

      // Create order if not exists
      let orderId = existingOrder?._id as string | undefined;
      if (!orderId) {
        const orderDoc = await sanity.create({
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
          status: 'paid',
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
          webhookNotified: true
        });
        orderId = orderDoc._id as string;
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
          lineItems: (items?.data || []).map((li) => ({
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

      // Send confirmation email if configured
      try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const to = email;
        if (RESEND_API_KEY && to) {
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
                '[stripe-webhook] unable to fetch order metadata',
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
          let orderNumber =
            existingOrderNumber || generateFallbackOrderNumber(session, orderId || session.id || '');
          if (!existingOrderNumber) {
            generatedOrderNumber = orderNumber;
          }

          const orderDate = formatOrderDate(
            sanityOrder?.createdAt,
            session.created ?? (paymentIntent?.created as number | undefined)
          );
          const customerName =
            session.customer_details?.name ||
            sanityOrder?.customerName ||
            session.shipping_details?.name ||
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
            session.shipping_details || session.customer_details || null
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

          await sendEmail({
            to,
            subject: `Your FAS Motorsports Order Confirmation – ${orderNumber}`,
            html
          });

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
      const inv = evt.data.object as Stripe.Invoice;
      const stripeInvoiceId = inv.id;
      try {
        const quote = await sanity.fetch(
          `*[_type=="quote" && stripeInvoiceId==$id][0]{_id,status}`,
          { id: stripeInvoiceId }
        );
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
      const inv = evt.data.object as Stripe.Invoice;
      const stripeInvoiceId = inv.id;
      try {
        const quote = await sanity.fetch(
          `*[_type=="quote" && stripeInvoiceId==$id][0]{_id,status}`,
          { id: stripeInvoiceId }
        );
        if (quote?._id && quote.status !== 'paid') {
          await sanity.patch(quote._id).set({ status: 'paid' }).commit();
        }
      } catch (e) {
        console.warn(
          '[stripe-webhook] update quote on invoice.paid failed',
          (e as any)?.message || e
        );
      }
    }

    return json(200, { received: true });
  } catch (e: any) {
    console.error('[stripe-webhook] unhandled error', e?.message || e);
    return json(500, { error: 'Server error' });
  }
};

export default { handler };
