import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

export async function POST({ request }: { request: Request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Missing or invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const { sessionId } = body;

  const query = import.meta.env.SANITY_QUERY_CART_ITEMS.replace('$SESSION_ID', sessionId);
  const url = `https://${import.meta.env.SANITY_PROJECT_ID}.api.sanity.io/v${import.meta.env.SANITY_API_VERSION}/data/query/${import.meta.env.SANITY_DATASET}?query=${encodeURIComponent(query)}`;

  const cartRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${import.meta.env.SANITY_API_TOKEN}`,
    },
  });

  const { result: cartItems }: { result: { product: { name: string; price: number }; quantity: number }[] } = await cartRes.json();

  const lineItems = cartItems.map((item: { product: { name: string; price: number }; quantity: number }) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.product.name,
      },
      unit_amount: Math.round(item.product.price * 100), // Stripe expects cents
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    success_url: `${import.meta.env.SITE_URL}/checkout/success`,
    cancel_url: `${import.meta.env.SITE_URL}/checkout/cancel`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
