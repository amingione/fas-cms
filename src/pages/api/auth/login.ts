import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
// Defer importing Sanity utilities until we know env is configured
import { setSession } from '../../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';

// POST /api/auth/login
// Body: { email: string, password: string }
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!email || !password) {
      return jsonResponse({ message: 'Missing email or password' }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    let sessionUser: { id: string; email: string; roles: string[] } | null = null;
    let expiresInSeconds: number | undefined = undefined;
    let accountFound = false;
    let passwordMatch = false;

    if (adminEmail && adminPassword && email === adminEmail) {
      accountFound = true;
      if (password === adminPassword) {
        sessionUser = { id: 'admin', email, roles: ['admin'] };
        expiresInSeconds = 60 * 60;
        passwordMatch = true;
      }
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
          accountFound = true;
          const passwordHash = (vendor as any).passwordHash;
          if (passwordHash && (await bcrypt.compare(password, passwordHash))) {
            sessionUser = {
              id: String(vendor._id || vendor.id || vendor.email || email),
              email: String(vendor.email || email),
              roles: ['vendor']
            };
            expiresInSeconds = 60 * 60;
            passwordMatch = true;
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
          accountFound = true;
          const passwordHash = (customer as any).passwordHash;
          if (passwordHash && (await bcrypt.compare(password, passwordHash))) {
            sessionUser = {
              id: String(customer._id || customer.id || customer.email || email),
              email: String(customer.email || email),
              roles: ['customer']
            };
            expiresInSeconds = 60 * 60 * 24 * 7;
            passwordMatch = true;
          }
        }
      }
    }

    if (!sessionUser) {
      const message = accountFound
        ? 'Incorrect password. Double-check your password or use “Forgot password” to reset it.'
        : 'We couldn’t find an account with that email. Create one or verify you entered it correctly.';
      return jsonResponse({ message }, { status: 401 }, { noIndex: true });
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    setSession(headers, sessionUser, expiresInSeconds ? { expiresIn: expiresInSeconds } : {});
    return jsonResponse({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error(err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 });
  }
};
