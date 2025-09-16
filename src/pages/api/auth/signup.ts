import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { sanity, hasWriteToken } from '../../../server/sanity-client';
import { setSession } from '../../../server/auth/session';

// POST /api/auth/signup
// Body: { email: string, password: string, name?: string }
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const name = String(body?.name || '');
    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Missing email or password' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Ensure no existing user (customer or vendor) with this email
    const existing = await sanity.fetch(
      '*[(_type == "customer" || _type == "vendor") && lower(email) == $e][0]',
      { e: email }
    );
    if (existing) {
      return new Response(JSON.stringify({ message: 'Account already exists' }), {
        status: 409,
        headers: { 'content-type': 'application/json' }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    if (!hasWriteToken) {
      console.error('Signup attempted but SANITY_WRITE_TOKEN/SANITY_API_TOKEN is not configured');
      return new Response(JSON.stringify({ message: 'Signup temporarily unavailable. Please contact support.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    const doc = await sanity.create({
      _type: 'customer',
      email,
      name: name || '',
      passwordHash,
      status: 'Active',
      roles: ['customer']
    } as any);

    const headers = new Headers({ 'content-type': 'application/json' });
    setSession(headers, { id: doc._id, email, roles: ['customer'] });
    return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
