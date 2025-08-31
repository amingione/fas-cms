import Stripe from 'stripe';
import { createClient } from '@sanity/client';

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
    let userIdFromMetadata: string | undefined = (session.metadata as any)?.userId || undefined;

    console.log('✅ Payment confirmed for session:', session.id);
    console.log('Customer Email:', session.customer_details?.email);

    try {
      // Fetch line items to capture cart details
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

      // Retrieve payment intent details (brand/last4/receipt)
      let paymentIntent: Stripe.PaymentIntent | null = null;
      try {
        const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
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
          } catch {}
        }
      }

      // Prefer cart metadata if present
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

      const newOrder = await sanity.create({
        _type: 'order',
        stripeSessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        paymentStatus: paymentIntent?.status || session.payment_status || 'unknown',
        chargeId: typeof (paymentIntent as any)?.latest_charge === 'string' ? (paymentIntent as any).latest_charge : (paymentIntent as any)?.latest_charge?.id,
        cardBrand: (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.brand || '',
        cardLast4: (paymentIntent as any)?.charges?.data?.[0]?.payment_method_details?.card?.last4 || '',
        receiptUrl: (paymentIntent as any)?.charges?.data?.[0]?.receipt_url || '',
        currency: session.currency || 'usd',
        amountSubtotal: typeof session.amount_subtotal === 'number' ? session.amount_subtotal / 100 : undefined,
        amountTax: typeof session.total_details?.amount_tax === 'number' ? session.total_details.amount_tax / 100 : undefined,
        amountShipping: typeof session.shipping_cost?.amount_total === 'number' ? session.shipping_cost.amount_total / 100 : undefined,
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
      });

      console.log('📝 Order saved to Sanity:', newOrder._id);

      // Send confirmation email via Resend if configured
      const RESEND_API_KEY = import.meta.env.RESEND_API_KEY as string | undefined;
      const RESEND_FROM =
        (import.meta.env.RESEND_FROM as string | undefined) || 'noreply@fasmotorsports.com';
      const to = session.customer_details?.email;
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
            <p style="margin:4px 0 16px 0">Order ID: <strong>${newOrder._id}</strong></p>
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
            <p style="text-align:right;margin:0 0 4px 0">Order Total: <strong>$${Number(newOrder.totalAmount || 0).toFixed(2)}</strong></p>
            <p style="font-size:12px;color:#555">We will email tracking information when your order ships.</p>
          </div>`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ from: RESEND_FROM, to, subject: 'Order Confirmation', html })
        }).catch((e) => console.warn('Email send failed', e));

        // Internal notifications to support + info
        const internalHtml = `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111">
            <h2 style="margin:0 0 8px 0">New order received</h2>
            <p style="margin:0 0 8px 0"><strong>Order ID:</strong> ${newOrder._id}</p>
            <p style="margin:0 0 8px 0"><strong>Customer:</strong> ${email}</p>
            <p style="margin:0 0 8px 0"><strong>Total:</strong> $${Number(newOrder.totalAmount || 0).toFixed(2)}</p>
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
            subject: `New Order: ${newOrder._id}`,
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
