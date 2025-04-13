import Stripe from 'stripe';
export { renderers } from '../../renderers.mjs';

const stripe = new Stripe("sk_test_51RCVrQP1CiCjkLwl4JoNT5uHALYhRG60jI1GSVbUeA2lGatWkg6cDeeFqV65wRhKWSzE0iiCjDhWzw8WQ8Mz8HGV007xzeNxm5", {
  apiVersion: "2025-03-31.basil"
});
async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Missing or invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { sessionId } = body;
  const query = undefined                                       .replace("$SESSION_ID", sessionId);
  const url = `https://${"r4og35qd"}.api.sanity.io/v${undefined                                  }/data/query/${"production"}?query=${encodeURIComponent(query)}`;
  const cartRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${"sk4imcDRkE4CVoH4ppZQd3Xr3pvy8SqbvJ3KNDy4TAXYGmiOEy5wlZwzl0U6OKMRLsOBF24QHUtEvDxq7opyr0MWs5j2WXE12O79laNApMQHLJuEL3rcthoKwYKrDh1lduitDiyzpvJxzJC0NN01lGHTLJbC0DuoDUx3IntbKPN4nAwWzKzb"}`
    }
  });
  const { result: cartItems } = await cartRes.json();
  const lineItems = cartItems.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.product.name
      },
      unit_amount: Math.round(item.product.price * 100)
      // Stripe expects cents
    },
    quantity: item.quantity
  }));
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: lineItems,
    success_url: `${undefined                        }/checkout/success`,
    cancel_url: `${undefined                        }/checkout/cancel`
  });
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
