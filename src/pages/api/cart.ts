export async function POST({ request }: { request: Request }) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Invalid content type" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { productId, quantity, sessionId } = body;

  const res = await fetch(`https://${import.meta.env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/production`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.PUBLIC_SANITY_WRITE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mutations: [
        {
          create: {
            _type: 'cartItem',
            product: { _type: 'reference', _ref: productId },
            quantity,
            sessionId,
            addedAt: new Date().toISOString(),
          },
        },
      ],
    }),
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
