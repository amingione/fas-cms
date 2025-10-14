// src/pages/api/get-user-appointments.ts
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
    // Allow simple `?email=` usage for counts, otherwise derive from session cookie
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

    // Query Sanity for appointments tied to the customer's email
    const query = `*[_type == "booking" && customer->email == $email]
      | order(dateTime(coalesce(scheduledAt, createdAt, _createdAt)) desc) {
        _id,
        bookingId,
        _createdAt,
        createdAt,
        status,
        service,
        scheduledAt,
        notes,
        customer->{
          _id,
          firstName,
          lastName,
          email,
          phone
        }
      }`;

    const appts = await sanityClient.fetch(query, { email });

    return new Response(JSON.stringify(appts || []), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (err: any) {
    console.error('get-user-appointments error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Failed to fetch appointments' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
