import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getVendorByEmail } from '../../../server/sanity-client';
import { setSessionCookie } from '../../../server/auth/session';

const JWT_SECRET = process.env.JWT_SECRET || '';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    // Static admin credentials (set via environment variables)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    let token: string | null = null;
    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      token = jwt.sign({ sub: 'admin', role: 'admin', email }, JWT_SECRET, { expiresIn: '1h' });
    }

    // Vendor login via Sanity
    if (!token) {
      const vendor = await getVendorByEmail(email);
      if (vendor && vendor.status === 'Approved') {
        const passwordHash = (vendor as any).passwordHash;
        const isMatch = await bcrypt.compare(password, passwordHash);
        if (isMatch) {
        token = jwt.sign({ sub: vendor._id, role: 'vendor', email: vendor.email }, JWT_SECRET, { expiresIn: '1h' });
        }
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    // Set session cookie
    const headers = new Headers({ 'content-type': 'application/json' });
    setSessionCookie(headers, token);

    return new Response(JSON.stringify({ token }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};