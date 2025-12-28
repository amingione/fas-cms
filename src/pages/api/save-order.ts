/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'stripe';
import { readSession } from '../../server/auth/session';
import { createOrderCartItem, type OrderCartItem } from '@/server/sanity/order-cart';
import { jsonResponse } from '@/server/http/responses';
import { saveOrderRequestSchema } from '@/lib/validators/api-requests';
import { stripeCheckoutSessionSchema } from '@/lib/validators/stripe';
import { sanityCustomerSchema } from '@/lib/validators/sanity';

interface OrderPayload {
  _type: 'order';
  stripeSessionId: string;
  cart: OrderCartItem[];
  totalAmount: number;
  amountSubtotal: number;
  amountTax: number;
  amountShipping: number;
  amountDiscount: number;
  status: 'pending' | 'paid' | 'unpaid' | 'failed' | 'refunded';
  orderType: 'retail' | 'wholesale';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  orderNumber: string;
  customerRef?: { _type: 'reference'; _ref: string };
  customerEmail: string;
  customerName: string;
}

interface SanityCustomerQueryResult {
  result?: { _id?: string } | null;
}

const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover'
});

export const POST = async ({ request }: { request: Request }) => {
  try {
    const bodyResult = saveOrderRequestSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'saveOrderRequestSchema',
        context: 'api/save-order',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 }
      );
    }

    const sessionResult = await readSession(request);
    const customerEmail = sessionResult.session?.user?.email;
    if (typeof customerEmail !== 'string') {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 }, { noIndex: true });
    }

    const { sessionId, cart } = bodyResult.data;

    const stripeSession = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details']
    });
    const stripeSessionResult = stripeCheckoutSessionSchema.safeParse(stripeSession);
    if (!stripeSessionResult.success) {
      console.error('[stripe-validation]', {
        id: stripeSession?.id,
        errors: stripeSessionResult.error.format()
      });
      throw new Error('Invalid Stripe session response');
    }
    const validatedSession = stripeSessionResult.data;

    const projectId =
      (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
      (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
      (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined);
    const dataset =
      (import.meta.env.SANITY_DATASET as string | undefined) ||
      (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
      (import.meta.env.VITE_SANITY_DATASET as string | undefined) ||
      'production';
    const tokenSanity =
      (import.meta.env.SANITY_WRITE_TOKEN as string | undefined) ||
      (import.meta.env.SANITY_API_TOKEN as string | undefined) ||
      (import.meta.env.VITE_SANITY_API_TOKEN as string | undefined);

    if (!projectId || !tokenSanity) {
      return jsonResponse({ error: 'Missing Sanity project ID or API token' }, { status: 500 });
    }

    const query = '*[_type == "customer" && email == $email][0]';
    const sanityUrl = new URL(`https://${projectId}.api.sanity.io/v1/data/query/${dataset}`);
    sanityUrl.searchParams.set('query', query);
    sanityUrl.searchParams.set('$email', customerEmail);

    const customerRes = await fetch(sanityUrl.toString(), {
      headers: { Authorization: `Bearer ${tokenSanity}` }
    });

    const customerData: SanityCustomerQueryResult = await customerRes.json();
    let customerId = customerData.result?._id;
    if (customerData.result) {
      const customerResult = sanityCustomerSchema.safeParse(customerData.result);
      if (!customerResult.success) {
        console.warn('[sanity-validation]', {
          _id: (customerData.result as any)?._id,
          _type: 'customer',
          errors: customerResult.error.format()
        });
        customerId = undefined;
      } else {
        customerId = customerResult.data._id;
      }
    }

    const amountSubtotal = validatedSession.amount_subtotal
      ? validatedSession.amount_subtotal / 100
      : 0;
    const amountTax =
      typeof validatedSession.total_details?.amount_tax === 'number'
        ? validatedSession.total_details.amount_tax / 100
        : 0;
    const amountShipping =
      typeof validatedSession.total_details?.amount_shipping === 'number'
        ? validatedSession.total_details.amount_shipping / 100
        : 0;
    const amountDiscount =
      typeof validatedSession.total_details?.amount_discount === 'number'
        ? validatedSession.total_details.amount_discount / 100
        : 0;
    const totalAmount = validatedSession.amount_total ? validatedSession.amount_total / 100 : 0;
    const customerName = validatedSession.customer_details?.name || '';
    const customerEmailValue = validatedSession.customer_details?.email || customerEmail || '';

    const orderPayload: OrderPayload = {
      _type: 'order',
      stripeSessionId: sessionId,
      cart: cart.map((item) =>
        createOrderCartItem({
          id: item.id,
          sku: item.sku,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          categories: item.categories,
          image: item.image,
          productUrl: item.productUrl,
          productSlug: item.productSlug,
          metadata: item.metadata
        })
      ),
      orderNumber: `FAS-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      orderType: 'retail',
      paymentStatus: 'pending',
      amountSubtotal,
      amountTax,
      amountShipping,
      amountDiscount,
      totalAmount,
      customerEmail: customerEmailValue,
      customerName
    };

    if (customerId) {
      orderPayload.customerRef = { _type: 'reference', _ref: customerId };
    }

    const sanityRes = await fetch(`https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenSanity}`
      },
      body: JSON.stringify({ mutations: [{ create: orderPayload }] })
    });

    if (!sanityRes.ok) {
      const errorDetails = await sanityRes.text();
      throw new Error(`Sanity response error: ${errorDetails}`);
    }

    return jsonResponse({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Error saving order:', err);
    return jsonResponse({ error: message }, { status: 500 });
  }
};
