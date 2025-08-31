import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { stripe } from './_stripe';
import { sanity, getSanityClient } from './_sanity';
import { sendEmail } from './_resend';

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

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
        const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
        if (piId) paymentIntent = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
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
      let cartLines: any[] = [];
      const metaCart = (session.metadata && (session.metadata as any).cart) || '';
      if (metaCart) {
        try {
          const parsed = JSON.parse(metaCart);
          if (Array.isArray(parsed)) {
            cartLines = parsed.map((l: any) => ({
              _type: 'cartLine',
              description: l?.n,
              quantity: l?.q,
              amount_total: Number(l?.p || 0)
            }));
          }
        } catch {}
      }
      if (!cartLines.length) {
        cartLines = (items?.data || []).map((li) => ({
          _type: 'cartLine',
          description: li.description,
          quantity: li.quantity,
          amount_total: (li.amount_total || 0) / 100
        }));
      }

      // Create order if not exists
      let orderId = existingOrder?._id as string | undefined;
      if (!orderId) {
        const orderDoc = await sanity.create({
          _type: 'order',
          stripeSessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
          paymentStatus: paymentIntent?.status || session.payment_status || 'unknown',
          chargeId:
            typeof (paymentIntent as any)?.latest_charge === 'string'
              ? (paymentIntent as any).latest_charge
              : (paymentIntent as any)?.latest_charge?.id,
          cardBrand: (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.brand || '',
          cardLast4: (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.last4 || '',
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
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
          receiptUrl: (paymentIntent as any)?.charges?.data?.[0]?.receipt_url || ''
        });
      }

      // Send confirmation email if configured
      try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const to = email;
        if (RESEND_API_KEY && to) {
          const rows = cartLines
            .map(
              (l: any) =>
                `<tr><td style="padding:8px;border-bottom:1px solid #eee">${l.description || ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${l.quantity || 1}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(l.amount_total || 0).toFixed(2)}</td></tr>`
            )
            .join('');
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111">
              <div style="text-align:center;margin-bottom:16px">
                <img src="https://www.fasmotorsports.com/logo/chromelogofas.png" alt="FAS Motorsports" style="height:48px" />
              </div>
              <h2 style="margin:8px 0">Thanks for your order!</h2>
              <p style="margin:4px 0 16px 0">Order: <strong>${session.id}</strong></p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc">Item</th>
                    <th style="text-align:center;padding:8px;border-bottom:1px solid #ccc">Qty</th>
                    <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc">Total</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <p style="text-align:right;margin:0 0 4px 0">Order Total: <strong>$${Number((session.amount_total || 0) / 100).toFixed(2)}</strong></p>
              <p style="font-size:12px;color:#555">We will email tracking information when your order ships.</p>
            </div>`;
          await sendEmail({ to, subject: 'Order Confirmation', html });
        }
      } catch (e) {
        console.warn('[stripe-webhook] email send failed:', (e as any)?.message || e);
      }
    }

    return json(200, { received: true });
  } catch (e: any) {
    console.error('[stripe-webhook] unhandled error', e?.message || e);
    return json(500, { error: 'Server error' });
  }
};

export default { handler };
