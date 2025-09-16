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
    let expiresIn: string | undefined;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      sessionUser = { id: 'admin', email, roles: ['admin'] };
      expiresIn = '1h';
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
            const rolesRaw = (vendor as any).roles || (vendor as any).userRole || 'vendor';
            const roles = Array.isArray(rolesRaw)
              ? rolesRaw
              : rolesRaw
              ? [rolesRaw]
              : ['vendor'];
            sessionUser = {
              id: vendor._id,
              email: vendor.email,
              roles: roles.map((r: any) => String(r || '').toLowerCase())
            };
            expiresIn = '1h';
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
            const rolesRaw = (customer as any).roles || (customer as any).userRole || 'customer';
            const roles = Array.isArray(rolesRaw)
              ? rolesRaw
              : rolesRaw
              ? [rolesRaw]
              : ['customer'];
            sessionUser = {
              id: customer._id,
              email: customer.email,
              roles: roles.map((r: any) => String(r || '').toLowerCase())
            };
            expiresIn = '7d';
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
    setSession(headers, sessionUser, expiresIn ? { expiresIn } : undefined);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
