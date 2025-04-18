import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'r4og35qd',
  dataset: 'production',
  apiVersion: import.meta.env.SANITY_API_VERSION,
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false,
});

export async function POST({ request }: { request: Request }) {
  let data: {
    vehicleModel: string;
    modifications: string[];
    horsepower: number;
    price: number;
  };
 
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }
 
  const { vehicleModel, modifications, horsepower, price } = data;
 
  if (
    typeof vehicleModel !== 'string' ||
    !Array.isArray(modifications) ||
    typeof horsepower !== 'number' ||
    typeof price !== 'number'
  ) {
    return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { status: 400 });
  }

  try {
    const newDoc = await client.create({
      _type: 'buildQuote',
      submittedAt: new Date().toISOString(),
      vehicleModel,
      modifications,
      horsepower,
      price,
    });

    return new Response(JSON.stringify({
      success: true,
      id: newDoc._id,
      createdAt: newDoc._createdAt,
      vehicleModel: data.vehicleModel
    }), {
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Sanity write failed:', message);
    return new Response(JSON.stringify({ error: 'Failed to write to Sanity' }), {
      status: 500,
    });
  }
}