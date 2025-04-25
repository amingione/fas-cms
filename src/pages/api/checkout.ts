import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil'
});

const baseUrl = import.meta.env.PUBLIC_BASE_URL || 'http://localhost:4321';

function validateBaseUrl(): Response | null {
  if (!baseUrl || !baseUrl.startsWith('http')) {
    console.error('❌ Invalid BASE_URL:', baseUrl);
    return new Response(
      JSON.stringify({ error: 'BASE_URL is missing or invalid. Must start with http or https.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

const validationError = validateBaseUrl();

export async function POST({ request }: { request: Request }) {
  if (validationError) return validationError;

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
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'] // Add other countries if needed
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Stripe Checkout Session Error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
