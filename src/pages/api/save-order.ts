/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'stripe';
import { z } from 'zod';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { z as ZodNamespace } from 'zod';

type CartItem = ZodNamespace.infer<typeof CartItemSchema>;

interface OrderPayload {
  _type: 'order';
  stripeSessionId: string;
  cart: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    categories: string[];
  }>;
  totalAmount: number;
  status: 'paid' | 'unpaid' | 'failed' | 'refunded';
  createdAt: string;
  customer?: { _type: 'reference'; _ref: string };
}

interface SaveOrderBody {
  sessionId: string;
  cart: unknown;
}

interface SanityCustomerQueryResult {
  result?: { _id?: string } | null;
}

const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
});

const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.AUTH0_CLIENT_ID;
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  categories: z.array(z.string()).optional()
});
const CartSchema = z.array(CartItemSchema);

export const POST = async ({ request }: { request: Request }) => {
  try {
    const body = (await request.json()) as SaveOrderBody;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401
      });
    }

    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });

    const customerEmail = payload?.email;
    if (typeof customerEmail !== 'string') {
      return new Response(JSON.stringify({ error: 'Email not found in token' }), { status: 400 });
    }

    const { sessionId, cart } = body;

    if (!sessionId || !cart) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or cart' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cartValidation = CartSchema.safeParse(cart);
    if (!cartValidation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid cart format', details: cartValidation.error.format() }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const validatedCart: CartItem[] = cartValidation.data as CartItem[];

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details']
    });

    const projectId = import.meta.env.SANITY_PROJECT_ID;
    const tokenSanity = import.meta.env.SANITY_API_TOKEN;

    if (!projectId || !tokenSanity) {
      return new Response(JSON.stringify({ error: 'Missing Sanity project ID or API token' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const query = '*[_type == "customer" && email == $email][0]';
    const sanityUrl = new URL(`https://${projectId}.api.sanity.io/v1/data/query/production`);
    sanityUrl.searchParams.set('query', query);
    sanityUrl.searchParams.set('$email', customerEmail);

    const customerRes = await fetch(sanityUrl.toString(), {
      headers: { Authorization: `Bearer ${tokenSanity}` }
    });

    const customerData: SanityCustomerQueryResult = await customerRes.json();
    const customerId = customerData.result?._id;

    const orderPayload: OrderPayload = {
      _type: 'order',
      stripeSessionId: sessionId,
      cart: validatedCart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        categories: (item.categories ?? []) as string[]
      })),
      totalAmount: session.amount_total ? session.amount_total / 100 : 0,
      status: 'paid',
      createdAt: new Date().toISOString()
    };

    if (customerId) {
      orderPayload.customer = { _type: 'reference', _ref: customerId };
    }

    const sanityRes = await fetch(`https://${projectId}.api.sanity.io/v1/data/mutate/production`, {
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Error saving order:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
