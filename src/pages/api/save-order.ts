import Stripe from 'stripe';
import { z } from 'zod';

const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil'
});

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
    const { sessionId, cart } = await request.json();

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

    const validatedCart = cartValidation.data;

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details']
    });

    const projectId = import.meta.env.SANITY_PROJECT_ID;
    const token = import.meta.env.SANITY_API_TOKEN;

    if (!projectId || !token) {
      return new Response(JSON.stringify({ error: 'Missing Sanity project ID or API token' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderPayload = {
      _type: 'order',
      stripeSessionId: sessionId,
      customerEmail: session.customer_details?.email || '',
      cart: validatedCart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        categories: item.categories || []
      })),
      totalAmount: session.amount_total ? session.amount_total / 100 : 0,
      status: 'paid',
      createdAt: new Date().toISOString()
    };

    const sanityRes = await fetch(`https://${projectId}.api.sanity.io/v1/data/mutate/production`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
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
