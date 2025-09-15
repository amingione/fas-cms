// src/pages/api/get-user-order.ts
import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type'
};

function getBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
}

function getCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get('cookie') || '';
  for (const part of cookie.split(/;\s*/)) {
    const [k, v] = part.split('=');
    if (k === name && typeof v === 'string') return decodeURIComponent(v);
  }
  return null;
}

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Allow either query param or token-derived email
    let email = (url.searchParams.get('email') || '').trim().toLowerCase();

    // If no email in query, try to verify an Auth0 token
    if (!email) {
      const AUTH0_DOMAIN =
        (import.meta.env.PUBLIC_AUTH0_DOMAIN as string | undefined) ||
        (import.meta.env.AUTH0_DOMAIN as string | undefined);
      const AUTH0_CLIENT_ID =
        (import.meta.env.PUBLIC_AUTH0_CLIENT_ID as string | undefined) ||
        (import.meta.env.AUTH0_CLIENT_ID as string | undefined);

      const token = getBearer(request) || getCookie(request, 'token');

      if (token && AUTH0_DOMAIN && AUTH0_CLIENT_ID) {
        try {
          const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));
          const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://${AUTH0_DOMAIN}/`,
            audience: AUTH0_CLIENT_ID
          });
          if (typeof payload.email === 'string') {
            email = payload.email.toLowerCase();
          }
        } catch (err) {
          // If a token was supplied but failed verification, treat as unauthorized
          return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
            status: 401,
            headers: { ...cors, 'content-type': 'application/json' }
          });
        }
      }
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400,
        headers: { ...cors, 'content-type': 'application/json' }
      });
    }

    const query = `*[_type == "order" && (customer->email == $email || customerEmail == $email)]
      | order(coalesce(orderDate, createdAt, _createdAt) desc){
        _id,
        // identifiers
        orderNumber,
        stripeSessionId,
        // status + dates
        status,
        _createdAt,
        createdAt,
        orderDate,
        // totals (support both "total" and "totalAmount")
        "total": coalesce(total, totalAmount),
        // optional tracking
        trackingNumber
      }`;

    const orders = await sanityClient.fetch(query, { email });

    return new Response(JSON.stringify(orders || []), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (err: any) {
    console.error('get-user-order error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
