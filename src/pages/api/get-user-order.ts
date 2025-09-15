// src/pages/api/get-user-order.ts
import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { readSession } from '../../server/auth/session';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type'
};

// No bearer/jwks needed; use fas_session or query ?email

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Allow either query param or token-derived email
    let email = (url.searchParams.get('email') || '').trim().toLowerCase();

    // If no email in query, try session cookie
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
