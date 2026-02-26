// src/pages/api/get-user-quotes.ts
import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { readSession } from '../../server/auth/session';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type'
};

// Session-authenticated endpoint only. Do not allow query-based email override.

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ request }) => {
  try {
    const { session } = await readSession(request);
    const se = (session?.user?.email as string | undefined) || '';
    const email = se ? se.toLowerCase() : '';

    if (!email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'content-type': 'application/json' }
      });
    }

    const query = `*[_type == "quote" && (
        customerRef->email == $email ||
        customerRef->email == $email ||
        billTo.email == $email
      )]
      | order(dateTime(coalesce(createdAt, _createdAt)) desc) {
        _id,
        _createdAt,
        createdAt,
        quoteNumber,
        title,
        status,
        subtotal,
        discountType,
        discountValue,
        taxRate,
        taxAmount,
        total,
        notes,
        quotePdfUrl,
        lastEmailedAt,
        billTo,
        shipTo,
        customer->{
          _id,
          firstName,
          lastName,
          email,
          phone
        },
        timeline[]{
          _key,
          action,
          timestamp
        },
        "lineItems": lineItems[]{
          _key,
          customName,
          description,
          quantity,
          unitPrice,
          lineTotal,
          product->{
            _id,
            title,
            slug{current},
            sku
          }
        },
        "items": lineItems
      }`;

    const quotes = await sanityClient.fetch(query, { email });

    return new Response(JSON.stringify(quotes || []), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (error: any) {
    console.error('get-user-quotes error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user quotes' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
