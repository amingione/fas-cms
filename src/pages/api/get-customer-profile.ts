// src/pages/api/get-customer-profile.ts
import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { jwtVerify, createRemoteJWKSet } from 'jose';

function getBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

function getCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get('cookie') || '';
  const parts = cookie.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === name && typeof v === 'string') return decodeURIComponent(v);
  }
  return null;
}

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type'
    }
  });

export const GET: APIRoute = async ({ request }) => {
  try {
    const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN as string | undefined;
    const AUTH0_CLIENT_ID = import.meta.env.AUTH0_CLIENT_ID as string | undefined;

    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
      return new Response(JSON.stringify({ message: 'Server misconfigured: missing AUTH0 env' }), {
        status: 500,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    // Accept either Authorization: Bearer <token> or a cookie named `token`
    const token = getBearer(request) || getCookie(request, 'token');
    if (!token) {
      return new Response(JSON.stringify({ message: 'Missing token' }), {
        status: 401,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });

    const sub = (payload.sub as string) || '';
    const email = (payload.email as string) || '';

    if (!sub && !email) {
      return new Response(JSON.stringify({ message: 'Token missing sub/email' }), {
        status: 400,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    // Prefer lookup by authId (sub), then fallback to email
    let customer = null as any;
    if (sub) {
      customer = await sanityClient.fetch(`*[_type == "customer" && authId == $sub][0]`, { sub });
    }
    if (!customer && email) {
      customer = await sanityClient.fetch(`*[_type == "customer" && email == $email][0]`, {
        email: String(email).trim().toLowerCase()
      });
    }

    if (!customer) {
      return new Response(JSON.stringify({ message: 'Customer not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    return new Response(JSON.stringify(customer), {
      status: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  } catch (err) {
    console.error('get-customer-profile error:', err);
    return new Response(JSON.stringify({ message: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
};
