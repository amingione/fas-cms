import { createClient } from '@sanity/client';
export { renderers } from '../../renderers.mjs';

const client = createClient({
  projectId: "r4og35qd",
  dataset: "production",
  apiVersion: "2023-01-01",
  token: "sk4imcDRkE4CVoH4ppZQd3Xr3pvy8SqbvJ3KNDy4TAXYGmiOEy5wlZwzl0U6OKMRLsOBF24QHUtEvDxq7opyr0MWs5j2WXE12O79laNApMQHLJuEL3rcthoKwYKrDh1lduitDiyzpvJxzJC0NN01lGHTLJbC0DuoDUx3IntbKPN4nAwWzKzb",
  useCdn: false
});
async function POST({ request }) {
  const data = await request.json();
  if (!data.vehicleModel || !data.modifications || !data.horsepower || !data.price) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }
  try {
    const newDoc = await client.create({
      _type: "buildQuote",
      ...data
    });
    return new Response(JSON.stringify({ success: true, id: newDoc._id }), {
      status: 200
    });
  } catch (err) {
    console.error("Sanity write failed:", err);
    return new Response(JSON.stringify({ error: "Failed to write to Sanity" }), {
      status: 500
    });
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
