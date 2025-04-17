import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'r4og35qd',
  dataset: 'production',
  apiVersion: import.meta.env.SANITY_API_VERSION,
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false,
});

export async function POST({ request }: { request: Request }) {
  const data = await request.json();

  // ✅ Full validation
  if (!data.vehicleModel || !data.modifications || !data.horsepower || !data.price) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  try {
    const newDoc = await client.create({
      _type: 'buildQuote',
      ...data,
    });

    return new Response(JSON.stringify({ success: true, id: newDoc._id }), {
      status: 200,
    });
  } catch (err) {
    console.error('Sanity write failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to write to Sanity' }), {
      status: 500,
    });
  }
}