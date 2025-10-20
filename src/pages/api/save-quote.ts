import { createClient } from '@sanity/client';
import { readSession } from '../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  apiVersion: import.meta.env.SANITY_API_VERSION,
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

export async function POST({ request }: { request: Request }) {
  // Session-based auth
  const { session } = await readSession(request);
  if (!session?.user?.email) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 }, { noIndex: true });
  }
  const customerEmail = session.user.email as string;

  // Look up customer in Sanity
  const customer = await client.fetch<{ _id: string } | null>(
    '*[_type == "customer" && email == $email][0]{ _id }',
    {
      email: customerEmail
    }
  );

  if (!customer?._id) {
    return jsonResponse({ error: 'Customer not found' }, { status: 404 });
  }

  let data: {
    vehicleModel: string;
    modifications: string[];
    horsepower: number;
    price: number;
  };

  try {
    data = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vehicleModel, modifications, horsepower, price } = data;

  if (
    typeof vehicleModel !== 'string' ||
    !Array.isArray(modifications) ||
    typeof horsepower !== 'number' ||
    typeof price !== 'number'
  ) {
    return jsonResponse({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  try {
    const newDoc = await client.create({
      _type: 'buildQuote',
      submittedAt: new Date().toISOString(),
      vehicleModel,
      modifications,
      horsepower,
      price,
      customer: { _type: 'reference', _ref: customer._id }
    });

    return jsonResponse({
      success: true,
      id: newDoc._id,
      createdAt: newDoc._createdAt,
      vehicleModel: data.vehicleModel
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Sanity write failed:', message);
    return jsonResponse({ error: 'Failed to write to Sanity' }, { status: 500 });
  }
}
