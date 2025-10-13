import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
// Defer importing Sanity utilities until we know env is configured
import { setSession } from '../../../server/auth/session';

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
    let sessionUser: { id: string; email: string; roles: string[] } | null = null;
    let expiresInSeconds: number | undefined = undefined;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      sessionUser = { id: 'admin', email, roles: ['admin'] };
      expiresInSeconds = 60 * 60;
    }

    if (!sessionUser) {
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
            sessionUser = {
              id: String(vendor._id || vendor.id || vendor.email || email),
              email: String(vendor.email || email),
              roles: ['vendor']
            };
            expiresInSeconds = 60 * 60;
          }
        }
      }
    }

    // Customer login via Sanity
    if (!sessionUser) {
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
            sessionUser = {
              id: String(customer._id || customer.id || customer.email || email),
              email: String(customer.email || email),
              roles: ['customer']
            };
            expiresInSeconds = 60 * 60 * 24 * 7;
          }
        }
      }
    }

    if (!sessionUser) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    setSession(headers, sessionUser, expiresInSeconds ? { expiresIn: expiresInSeconds } : {});
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
