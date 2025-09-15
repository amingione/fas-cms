import { sanityFetch } from '@/lib/sanityFetch';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.AUTH0_CLIENT_ID;
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

export async function GET({ request }: { request: Request }): Promise<Response> {
  // Extract and verify JWT from Authorization header
  const { headers } = request;
  const authHeader = headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
      status: 401
    });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });
    if (typeof payload.email !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid token payload' }), { status: 401 });
    }
    // Log the authenticated user's email
    console.log('🧪 TUNE API DEBUG → Authenticated user:', payload.email);
    console.log('🧪 TUNE API DEBUG →', {
      tokenPrefix: import.meta.env.SANITY_API_TOKEN?.slice(0, 8),
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET
    });
    const query = `*[_type == "tune"]{ title }`;
    if (
      !import.meta.env.SANITY_API_TOKEN ||
      !import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
      !import.meta.env.PUBLIC_SANITY_DATASET
    ) {
      return new Response(JSON.stringify({ error: 'Missing Sanity credentials' }), {
        status: 500
      });
    }
    const result = await sanityFetch({ query });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    console.error('❌ Tune fetch failed:', err);
    return new Response(
      JSON.stringify({
        error: 'Tune fetch error',
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      {
        status: 500
      }
    );
  }
}
