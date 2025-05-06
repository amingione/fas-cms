// src/pages/api/get-customer-profile.ts
import { sanityClient } from '@/lib/sanityClient';
import jwt from 'jsonwebtoken';
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

  try {
    const decoded = jwt.verify(token, import.meta.env.JWT_SECRET) as { _id: string };

    const customer = await sanityClient.fetch(`*[_type == "customer" && _id == $id][0]`, {
      id: decoded._id
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
