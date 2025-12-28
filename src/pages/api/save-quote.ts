import { createClient } from '@sanity/client';
import { readSession } from '../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';
import { saveQuoteSchema } from '@/lib/validators/api-requests';
import { sanityCustomerSchema } from '@/lib/validators/sanity';

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
  if (customer) {
    const customerResult = sanityCustomerSchema.partial().safeParse(customer);
    if (!customerResult.success) {
      console.warn('[sanity-validation]', {
        _id: (customer as any)?._id,
        _type: 'customer',
        errors: customerResult.error.format()
      });
      return jsonResponse({ error: 'Customer not found' }, { status: 404 });
    }
  }

  if (!customer?._id) {
    return jsonResponse({ error: 'Customer not found' }, { status: 404 });
  }

  let data;

  try {
    data = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dataResult = saveQuoteSchema.safeParse(data);
  if (!dataResult.success) {
    console.error('[validation-failure]', {
      schema: 'saveQuoteSchema',
      context: 'api/save-quote',
      identifier: customer?._id || 'unknown',
      timestamp: new Date().toISOString(),
      errors: dataResult.error.format()
    });
    return jsonResponse(
      { error: 'Validation failed', details: dataResult.error.format() },
      { status: 422 }
    );
  }

  const { vehicleModel, modifications, horsepower, price } = dataResult.data;

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
