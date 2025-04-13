export { renderers } from '../../renderers.mjs';

async function POST({ request }) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Invalid content type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { productId, quantity, sessionId } = body;
  const res = await fetch(`https://${"r4og35qd"}.api.sanity.io/v2021-06-07/data/mutate/production`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${"sk4imcDRkE4CVoH4ppZQd3Xr3pvy8SqbvJ3KNDy4TAXYGmiOEy5wlZwzl0U6OKMRLsOBF24QHUtEvDxq7opyr0MWs5j2WXE12O79laNApMQHLJuEL3rcthoKwYKrDh1lduitDiyzpvJxzJC0NN01lGHTLJbC0DuoDUx3IntbKPN4nAwWzKzb"}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mutations: [
        {
          create: {
            _type: "cartItem",
            product: { _type: "reference", _ref: productId },
            quantity,
            sessionId,
            addedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      ]
    })
  });
  const result = await res.json();
  return new Response(JSON.stringify(result), {
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
