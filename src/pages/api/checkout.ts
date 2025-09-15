import Stripe from 'stripe';
import { readSession } from '../../server/auth/session';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
});

const configuredBaseUrl = import.meta.env.PUBLIC_BASE_URL || '';

function validateBaseUrl(baseUrl: string): Response | null {
  if (!baseUrl || !baseUrl.startsWith('http')) {
    console.error('❌ Invalid PUBLIC_BASE_URL:', baseUrl);
    return new Response(
      JSON.stringify({
        error: 'PUBLIC_BASE_URL is missing or invalid. Must start with http or https.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

export async function POST({ request }: { request: Request }) {
  // Resolve base URL: prefer explicit env var, else Origin header during dev/preview
  const origin = request.headers.get('origin') || '';
  const xfProto = request.headers.get('x-forwarded-proto') || '';
  const xfHost = request.headers.get('x-forwarded-host') || '';
  const forwarded = xfProto && xfHost ? `${xfProto}://${xfHost}` : '';
  const baseUrl = configuredBaseUrl || forwarded || origin;
  const validationError = validateBaseUrl(baseUrl);
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

  type CartItem = { id?: string; sku?: string; name: string; price: number; quantity: number };
  const lineItems = (cart as CartItem[]).map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name,
        // Help fulfillment map back to Sanity/Inventory
        metadata: {
          ...(item.sku ? { sku: String(item.sku) } : {}),
          ...(item.id ? { sanity_product_id: String(item.id) } : {})
        }
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  }));

  // Persist compact cart metadata (Stripe metadata fields are strings and size-limited)
  let metaCart = '';
  try {
    const compact = cart.map((i: any) => ({ n: i?.name, q: i?.quantity, p: i?.price }));
    metaCart = JSON.stringify(compact);
    if (metaCart.length > 450) metaCart = metaCart.slice(0, 450);
  } catch {}

  // Derive optional user identity for reliable joins in webhook
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { session } = await readSession(request);
    if (session?.user) {
      userId = String(session.user.id || '');
      userEmail = String(session.user.email || '');
    }
  } catch {}

  try {
    const sessionMetadata: Record<string, string> = {
      ...(userId ? { userId } : {}),
      ...(userEmail ? { userEmail } : {}),
      site: baseUrl
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      metadata: { ...sessionMetadata, ...(metaCart ? { cart: metaCart } : {}) },
      payment_intent_data: { metadata: sessionMetadata },
      tax_id_collection: { enabled: true },
      // Enable Stripe Tax for automatic sales tax calculation
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'] // Add other countries if needed
      },
      phone_number_collection: { enabled: true },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: 'usd' },
            display_name: 'Standard (5–7 business days)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 }
            }
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 3500, currency: 'usd' },
            display_name: 'Expedited (2–3 business days)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 }
            }
          }
        }
      ],
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
