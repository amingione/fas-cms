import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// Defer importing Sanity utilities until we know env is configured
import { setSessionCookie } from '../../../server/auth/session';

const JWT_SECRET = process.env.JWT_SECRET || '';

// POST /api/auth/login
// Body: { email: string, password: string }
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Missing email or password' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    let token: string | null = null;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      token = jwt.sign({ sub: 'admin', role: 'admin', email }, JWT_SECRET, { expiresIn: '1h' });
    }

    if (!token) {
      const hasSanity = Boolean(
        (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
          (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
          (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined)
      );
      if (hasSanity) {
        const { getVendorByEmail } = await import('../../../server/sanity-client');
        const vendor = await getVendorByEmail(email);
        if (vendor && (vendor as any).status === 'Approved') {
          const passwordHash = (vendor as any).passwordHash;
          if (passwordHash && (await bcrypt.compare(password, passwordHash))) {
            token = jwt.sign({ sub: vendor._id, role: 'vendor', email: vendor.email }, JWT_SECRET, {
              expiresIn: '1h'
            });
          }
        }
      }
    }

    // Customer login via Sanity
    if (!token) {
      const hasSanity = Boolean(
        (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
          (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
          (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined)
      );
      if (hasSanity) {
        const { getCustomerByEmail } = await import('../../../server/sanity-client');
        const customer = await getCustomerByEmail(email);
        if (customer) {
          const passwordHash = (customer as any).passwordHash;
          if (passwordHash && (await bcrypt.compare(password, passwordHash))) {
            token = jwt.sign({ sub: customer._id, role: 'customer', email: customer.email }, JWT_SECRET, {
              expiresIn: '7d'
            });
          }
        }
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    setSessionCookie(headers, token);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
