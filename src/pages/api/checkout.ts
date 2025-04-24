import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil'
});

export async function POST({ request }: { request: Request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Missing or invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { cart } = body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return new Response(JSON.stringify({ error: 'Cart is empty or invalid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const lineItems = cart.map((item: { name: string; price: number; quantity: number }) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name
      },
      unit_amount: Math.round(item.price * 100) // Stripe expects cents
    },
    quantity: item.quantity
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    success_url: `${import.meta.env.SITE_URL}/checkout/success`,
    cancel_url: `${import.meta.env.SITE_URL}/checkout/cancel`
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
