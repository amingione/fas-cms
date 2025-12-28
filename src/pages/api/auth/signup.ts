import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { sanity, hasWriteToken } from '../../../server/sanity-client';
import { setSession } from '../../../server/auth/session';
import { authSignupSchema } from '@/lib/validators/api-requests';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

// GET /api/auth/signup -> inform clients to use POST instead of returning a 404
export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ message: 'Use POST to create an account.' }), {
    status: 405,
    headers: {
      ...JSON_HEADERS,
      Allow: 'POST'
    }
  });

// POST /api/auth/signup
// Body: { email: string, password: string, name?: string }
export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = authSignupSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'authSignupSchema',
        context: 'api/auth/signup',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ message: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422, headers: JSON_HEADERS }
      );
    }
    const email = String(bodyResult.data.email || '').trim().toLowerCase();
    const password = String(bodyResult.data.password || '');
    const name = String(bodyResult.data.name || '');

    // Ensure no existing user (customer or vendor) with this email
    const existing = await sanity.fetch(
      '*[(_type == "customer" || _type == "vendor") && lower(email) == $e][0]',
      { e: email }
    );
    if (existing) {
      return new Response(JSON.stringify({ message: 'Account already exists' }), {
        status: 409,
        headers: JSON_HEADERS
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    if (!hasWriteToken) {
      console.error('Signup attempted but SANITY_WRITE_TOKEN/SANITY_API_TOKEN is not configured');
      return new Response(JSON.stringify({ message: 'Signup temporarily unavailable. Please contact support.' }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }

    const doc = await sanity.create({
      _type: 'customer',
      email,
      name: name || email,
      passwordHash,
      roles: ['customer']
    } as any);

    const headers = new Headers(JSON_HEADERS);
    setSession(headers, { id: doc._id, email, roles: ['customer'] });
    return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
};
