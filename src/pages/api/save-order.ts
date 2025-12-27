/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'stripe';
import { z } from 'zod';
import { readSession } from '../../server/auth/session';
import type { z as ZodNamespace } from 'zod';
import { createOrderCartItem, type OrderCartItem } from '@/server/sanity/order-cart';
import { jsonResponse } from '@/server/http/responses';

type CartItem = ZodNamespace.infer<typeof CartItemSchema>;

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

interface SaveOrderBody {
  sessionId: string;
  cart: unknown;
}

interface SanityCustomerQueryResult {
  result?: { _id?: string } | null;
}

const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20'
});


const CartItemSchema = z.object({
  id: z.string(),
  sku: z.string().optional(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  categories: z.array(z.string()).optional(),
  image: z.string().optional(),
  productUrl: z.string().optional(),
  productSlug: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
const CartSchema = z.array(CartItemSchema);

export const POST = async ({ request }: { request: Request }) => {
  try {
    const body = (await request.json()) as SaveOrderBody;

    const sessionResult = await readSession(request);
    const customerEmail = sessionResult.session?.user?.email;
    if (typeof customerEmail !== 'string') {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 }, { noIndex: true });
    }

    const { sessionId, cart } = body;

    if (!sessionId || !cart) {
      return jsonResponse({ error: 'Missing sessionId or cart' }, { status: 400 });
    }

    const cartValidation = CartSchema.safeParse(cart);
    if (!cartValidation.success) {
      return jsonResponse(
        { error: 'Invalid cart format', details: cartValidation.error.format() },
        { status: 422 }
      );
    }

    const validatedCart: CartItem[] = cartValidation.data as CartItem[];

    const stripeSession = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details']
    });

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
    const customerId = customerData.result?._id;

    const amountSubtotal = stripeSession.amount_subtotal ? stripeSession.amount_subtotal / 100 : 0;
    const amountTax =
      typeof stripeSession.total_details?.amount_tax === 'number'
        ? stripeSession.total_details.amount_tax / 100
        : 0;
    const amountShipping =
      typeof stripeSession.total_details?.amount_shipping === 'number'
        ? stripeSession.total_details.amount_shipping / 100
        : 0;
    const amountDiscount =
      typeof stripeSession.total_details?.amount_discount === 'number'
        ? stripeSession.total_details.amount_discount / 100
        : 0;
    const totalAmount = stripeSession.amount_total ? stripeSession.amount_total / 100 : 0;
    const customerName = stripeSession.customer_details?.name || '';
    const customerEmailValue = stripeSession.customer_details?.email || customerEmail || '';

    const orderPayload: OrderPayload = {
      _type: 'order',
      stripeSessionId: sessionId,
      cart: validatedCart.map((item) =>
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
