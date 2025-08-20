// src/pages/api/get-user-invoices.ts
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
    // Prefer email from query string for simple counts, else derive from Auth0 token
    let email = (url.searchParams.get('email') || '').trim().toLowerCase();

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

    const query = `*[_type == "invoice" && customer->email == $email] | order(_createdAt desc) {
      _id,
      _createdAt,
      status,
      invoiceNumber,
      number,
      amount,
      total,
      dateIssued,
      date,
      dueDate
    }`;

    const invoices = await sanityClient.fetch(query, { email });

    return new Response(JSON.stringify(invoices || []), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (error: any) {
    console.error('get-user-invoices error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user invoices' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
