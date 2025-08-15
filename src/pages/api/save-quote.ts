import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { createClient } from '@sanity/client';

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  apiVersion: import.meta.env.SANITY_API_VERSION,
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.AUTH0_CLIENT_ID;

if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
  throw new Error('Auth0 environment variables are not configured');
}

const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

type TokenPayload = JWTPayload & { email?: string };

export async function POST({ request }: { request: Request }) {
  // Auth0 JWT verification
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.split(' ')[1];
  let payload: TokenPayload;
  try {
    const verified = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });
    payload = verified.payload as TokenPayload;
  } catch {
    return json({ error: 'Invalid or expired token' }, 401);
  }

  const customerEmail = payload?.email;
  if (typeof customerEmail !== 'string') {
    return json({ error: 'Email not found in token' }, 400);
  }

  // Look up customer in Sanity
  const customer = await client.fetch<{ _id: string } | null>(
    '*[_type == "customer" && email == $email][0]{ _id }',
    {
      email: customerEmail
    }
  );

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
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { vehicleModel, modifications, horsepower, price } = data;

  if (
    typeof vehicleModel !== 'string' ||
    !Array.isArray(modifications) ||
    typeof horsepower !== 'number' ||
    typeof price !== 'number'
  ) {
    return json({ error: 'Missing or invalid fields' }, 400);
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

    return json(
      {
        success: true,
        id: newDoc._id,
        createdAt: newDoc._createdAt,
        vehicleModel: data.vehicleModel
      },
      200
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Sanity write failed:', message);
    return json({ error: 'Failed to write to Sanity' }, 500);
  }
}
