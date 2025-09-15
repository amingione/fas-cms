// src/pages/api/appointments.ts
import type { APIRoute } from 'astro';
import { fetchAppointments } from '../../lib/calcom';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization'
};

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ url }) => {
  try {
    const emailParam = (url.searchParams.get('email') || '').trim().toLowerCase();

    const appts = await fetchAppointments();
    // If an email was provided, try to filter by common shapes
    const result = emailParam
      ? (appts || []).filter((a: any) => {
          try {
            // Common Cal.com shapes
            if (typeof a?.email === 'string' && a.email.toLowerCase() === emailParam) return true;
            if (
              typeof a?.customerEmail === 'string' &&
              a.customerEmail.toLowerCase() === emailParam
            )
              return true;
            if (
              a?.customer &&
              typeof a.customer.email === 'string' &&
              a.customer.email.toLowerCase() === emailParam
            )
              return true;
            if (Array.isArray(a?.attendees)) {
              if (
                a.attendees.some(
                  (at: any) =>
                    typeof at?.email === 'string' && at.email.toLowerCase() === emailParam
                )
              )
                return true;
            }
            return false;
          } catch {
            return false;
          }
        })
      : appts || [];

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (err: any) {
    console.error('appointments API error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Failed to fetch appointments' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
