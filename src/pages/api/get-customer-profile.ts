// src/pages/api/get-customer-profile.ts
import { sanityClient } from '@/lib/sanityClient';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  console.log('Incoming request to /api/get-customer-profile', request.headers);

  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split('; ')
    .find((row) => row.startsWith('token='))
    ?.split('=')[1];

  if (!token) {
    return new Response(JSON.stringify({ message: 'Missing token' }), { status: 401 });
  }

  console.log('Extracted JWT token:', token);
  // Auth0 JWKS + jose verification
  const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN;
  const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: import.meta.env.AUTH0_CLIENT_ID
    });

    if (!payload.email) {
      return new Response(JSON.stringify({ message: 'Email not found in token' }), { status: 400 });
    }

    const customer = await sanityClient.fetch(`*[_type == "customer" && email == $email][0]`, {
      email: payload.email
    });

    if (!customer) {
      return new Response(JSON.stringify({ message: 'Customer not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(customer), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('JWT verification failed:', err);
    return new Response(JSON.stringify({ message: 'Invalid or expired token' }), { status: 401 });
  }
};
