// /src/pages/api/orders/[id].ts (Astro API route)
import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PATCH, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type'
};

const projectId = (import.meta.env.PUBLIC_SANITY_PROJECT_ID || import.meta.env.SANITY_PROJECT_ID) as
  | string
  | undefined;
const dataset = (import.meta.env.PUBLIC_SANITY_DATASET || import.meta.env.SANITY_DATASET) as
  | string
  | undefined;
const token = import.meta.env.SANITY_API_TOKEN as string | undefined;

const client = createClient({
  projectId: projectId!,
  dataset: dataset!,
  apiVersion: '2023-01-01',
  token,
  useCdn: false
});

function getBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
}

async function verifyAuth(req: Request) {
  const AUTH0_DOMAIN =
    (import.meta.env.PUBLIC_AUTH0_DOMAIN as string | undefined) ||
    (import.meta.env.AUTH0_DOMAIN as string | undefined);
  const AUTH0_CLIENT_ID =
    (import.meta.env.PUBLIC_AUTH0_CLIENT_ID as string | undefined) ||
    (import.meta.env.AUTH0_CLIENT_ID as string | undefined);

  const token = getBearer(req);
  if (!token || !AUTH0_DOMAIN || !AUTH0_CLIENT_ID) return null;
  try {
    const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });
    return payload;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const id = params.id as string | undefined;
    if (!id) return new Response(JSON.stringify({ message: 'Missing order ID' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });

    const user = await verifyAuth(request);
    if (!user || typeof (user as any).email !== 'string') {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { ...cors, 'content-type': 'application/json' } });
    }

    const email = (user as any).email as string;
    const order = await client.fetch(
      `*[_type == "order" && _id == $id && customer->email == $email][0]`,
      { id, email }
    );
    if (!order)
      return new Response(JSON.stringify({ message: 'Order not found or access denied' }), {
        status: 404,
        headers: { ...cors, 'content-type': 'application/json' }
      });
    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    return new Response(JSON.stringify({ message: 'Failed to fetch order' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};

export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    const id = params.id as string | undefined;
    if (!id) return new Response(JSON.stringify({ message: 'Missing order ID' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });

    const user = await verifyAuth(request);
    if (!user || typeof (user as any).email !== 'string') {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { ...cors, 'content-type': 'application/json' } });
    }
    const email = (user as any).email as string;

    const existing = await client.fetch(
      `*[_type == "order" && _id == $id && customer->email == $email][0]`,
      { id, email }
    );
    if (!existing)
      return new Response(JSON.stringify({ message: 'Access denied' }), {
        status: 403,
        headers: { ...cors, 'content-type': 'application/json' }
      });

    const data = await request.json();
    const result = await client.patch(id).set(data).commit();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error('Error updating order:', err);
    return new Response(JSON.stringify({ message: 'Failed to update order' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
