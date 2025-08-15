import { jwtVerify, createRemoteJWKSet } from 'jose';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  apiVersion: import.meta.env.SANITY_API_VERSION,
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.AUTH0_CLIENT_ID;
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

export async function POST({ request }: { request: Request }) {
  // Auth0 JWT verification
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
      status: 401
    });
  }

  const token = authHeader.split(' ')[1];
  let payload: any;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    }));
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 });
  }

  const customerEmail = payload?.email;
  if (typeof customerEmail !== 'string') {
    return new Response(JSON.stringify({ error: 'Email not found in token' }), { status: 400 });
  }

  // Look up customer in Sanity
  const customer = await client.fetch('*[_type == "customer" && email == $email][0]{ _id }', {
    email: customerEmail
  });

  if (!customer?._id) {
    return new Response(JSON.stringify({ error: 'Customer not found' }), { status: 404 });
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
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400
    });
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
      customer: { _type: 'reference', _ref: customer._id }
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: newDoc._id,
        createdAt: newDoc._createdAt,
        vehicleModel: data.vehicleModel
      }),
      {
        status: 200
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Sanity write failed:', message);
    return new Response(JSON.stringify({ error: 'Failed to write to Sanity' }), {
      status: 500
    });
  }
}
