import { sanityFetch } from '@/lib/sanityFetch';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.AUTH0_CLIENT_ID;
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

export async function GET({ request }: { request: Request }): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
      status: 401
    });
  }
  const token = authHeader.split(' ')[1];
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${AUTH0_DOMAIN}/`,
    audience: AUTH0_CLIENT_ID
  });
  if (typeof payload.email !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid token payload' }), { status: 401 });
  }

  console.log('🧪 VEHICLE API DEBUG →', {
    tokenPrefix: import.meta.env.SANITY_API_TOKEN?.slice(0, 8),
    projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
    dataset: import.meta.env.PUBLIC_SANITY_DATASET
  });

  const query = `*[_type == "vehicleModel"]{ model }`;

  if (
    !import.meta.env.SANITY_API_TOKEN ||
    !import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
    !import.meta.env.PUBLIC_SANITY_DATASET
  ) {
    return new Response(JSON.stringify({ error: 'Missing Sanity credentials' }), {
      status: 500
    });
  }

  try {
    const result = await sanityFetch({ query });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('❌ Vehicle fetch failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Vehicle fetch error', details: message }), {
      status: 500
    });
  }
}
