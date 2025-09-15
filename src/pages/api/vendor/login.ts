import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getVendorByEmail } from '../../../server/sanity-client';
import { setSessionCookie } from '../../../server/auth/session';

const JWT_SECRET = process.env.JWT_SECRET || '';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const passwordInput = String(password || '');

    if (!normalizedEmail || !passwordInput) {
      return new Response(JSON.stringify({ message: 'Missing email or password' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const vendor = await getVendorByEmail(normalizedEmail);
    if (!vendor || (vendor as any).status !== 'Approved') {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }

    const passwordHash = (vendor as any).passwordHash;
    const isMatch = passwordHash ? await bcrypt.compare(passwordInput, passwordHash) : false;
    if (!isMatch) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }

    const token = jwt.sign(
      { sub: vendor._id, role: 'vendor', email: vendor.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const headers = new Headers({ 'content-type': 'application/json' });
    setSessionCookie(headers, token);

    return new Response(JSON.stringify({ token }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
