// src/pages/api/get-customer-profile.ts
import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { readSession } from '../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';

function getBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

function getCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get('cookie') || '';
  const parts = cookie.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === name && typeof v === 'string') return decodeURIComponent(v);
  }
  return null;
}

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type'
    }
  });

export const GET: APIRoute = async ({ request }) => {
  try {
    const { session } = await readSession(request);
    const sub = (session?.user?.id as string) || '';
    const email = (session?.user?.email as string) || '';

    if (!sub && !email) {
      return jsonResponse(
        { message: 'Token missing sub/email' },
        { status: 400, headers: { 'access-control-allow-origin': '*' } }
      );
    }

    // Prefer lookup by authId (sub), then fallback to email
    let customer = null as any;
    if (sub) {
      customer = await sanityClient.fetch(`*[_type == "customer" && authId == $sub][0]`, { sub });
    }
    if (!customer && email) {
      customer = await sanityClient.fetch(`*[_type == "customer" && email == $email][0]`, {
        email: String(email).trim().toLowerCase()
      });
    }

    if (!customer) {
      return jsonResponse(
        { message: 'Customer not found' },
        { status: 404, headers: { 'access-control-allow-origin': '*' } }
      );
    }

    return jsonResponse(customer, {
      status: 200,
      headers: { 'access-control-allow-origin': '*' }
    });
  } catch (err) {
    console.error('get-customer-profile error:', err);
    return jsonResponse(
      { message: 'Unauthorized' },
      { status: 401, headers: { 'access-control-allow-origin': '*' } },
      { noIndex: true }
    );
  }
};
