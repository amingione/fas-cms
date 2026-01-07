import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
// Defer importing Sanity utilities until we know env is configured
import { setSession } from '../../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';
import { authLoginSchema } from '@/lib/validators/api-requests';

// POST /api/auth/login
// Body: { email: string, password: string }
export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = authLoginSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'authLoginSchema',
        context: 'api/auth/login',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { message: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 }
      );
    }
    const email = String(bodyResult.data.email || '').trim().toLowerCase();
    const password = String(bodyResult.data.password || '');

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    let sessionUser: { id: string; email: string; roles: string[] } | null = null;
    let expiresInSeconds: number | undefined = undefined;
    let accountFound = false;

    if (adminEmail && adminPassword && email === adminEmail) {
      accountFound = true;
      if (password === adminPassword) {
        sessionUser = { id: 'admin', email, roles: ['admin'] };
        expiresInSeconds = 60 * 60;
      }
    }

    if (!sessionUser) {
      const hasSanity = Boolean(
        (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
          (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
          (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined)
      );
      if (hasSanity) {
        const { getCustomerByEmail, getVendorByCustomerId } = await import('../../../server/sanity-client');
        const customer = await getCustomerByEmail(email);
        const customerRoles = Array.isArray((customer as any)?.roles) ? (customer as any).roles : [];
        const isVendorCustomer = customerRoles.includes('vendor');

        if (customer && isVendorCustomer) {
          accountFound = true;
          const vendor = await getVendorByCustomerId(String(customer._id || customer.id || ''));
          if (!vendor) {
            return jsonResponse(
              { message: 'Vendor account not linked. Contact support.' },
              { status: 401 },
              { noIndex: true }
            );
          }
          const status = String((vendor as any).status || '').toLowerCase();
          const portalEnabled = Boolean((vendor as any)?.portalAccess?.enabled);
          if (!portalEnabled || status !== 'active') {
            return jsonResponse(
              { message: 'Vendor account not active or portal access disabled.' },
              { status: 401 },
              { noIndex: true }
            );
          }
          const passwordHash =
            (vendor as any)?.portalAccess?.passwordHash ||
            (vendor as any).passwordHash ||
            (vendor as any)?.portalAccess?.hash ||
            (vendor as any)?.auth?.passwordHash;
          if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
            return jsonResponse(
              { message: 'Invalid credentials' },
              { status: 401 },
              { noIndex: true }
            );
          }

          sessionUser = {
            id: String(vendor._id || vendor.id || email),
            email: String(customer.email || email),
            roles: ['vendor']
          };
          expiresInSeconds = 60 * 60;
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
