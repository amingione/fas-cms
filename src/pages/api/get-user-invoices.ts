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
    // Prefer email from query string for simple counts; otherwise pull from the active session
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

    const query = `*[_type == "invoice" && (
        customerRef->email == $email ||
        customerRef->email == $email ||
        customerEmail == $email
      )]
      | order(dateTime(coalesce(date, dateIssued, _createdAt)) desc) {
        _id,
        _createdAt,
        invoiceNumber,
        number,
        status,
        paymentIntentId,
        stripeSessionId,
        "total": coalesce(total, amount),
        amount,
        subtotal,
        taxRate,
        taxAmount,
        discountType,
        discountValue,
        date,
        dateIssued,
        dueDate,
        paymentLinkUrl,
        invoicePdfUrl,
        quotePdfUrl,
        receiptUrl,
        lastEmailedAt,
        customer->{
          _id,
          firstName,
          lastName,
          email,
          phone
        },
        customerRef->{
          _id,
          firstName,
          lastName,
          email,
          phone
        },
        orderRef->{
          _id,
          orderNumber,
          status,
          trackingNumber,
          shippingCarrier,
          shippingLabelUrl,
          shippingAddress,
          selectedService,
          shippingLog[]{
            _key,
            status,
            message,
            trackingNumber,
            trackingUrl,
            labelUrl,
            weight,
            createdAt
          }
        },
        "lineItems": lineItems[]{
          _key,
          kind,
          description,
          sku,
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
