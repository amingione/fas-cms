// src/pages/api/get-user-invoices.ts
import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { readSession } from '../../server/auth/session';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type'
};

// Session-based; allow ?email override

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Prefer email from query string for simple counts, else derive from Auth0 token
    let email = (url.searchParams.get('email') || '').trim().toLowerCase();

    if (!email) {
      const { session } = await readSession(request);
      const se = (session?.user?.email as string | undefined) || '';
      email = se ? se.toLowerCase() : '';
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
