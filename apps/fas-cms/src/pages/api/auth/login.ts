import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { getVendorByEmail } from '../../../server/sanity-client';
import { setSession } from '../../../server/auth/session';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    // Static admin credentials (set via environment variables)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    let sessionUser: { id: string; email: string; roles: string[] } | null = null;
    let expiresIn: string | undefined;
    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      sessionUser = { id: 'admin', email, roles: ['admin'] };
      expiresIn = '1h';
    }

    // Vendor login via Sanity
    if (!sessionUser) {
      const vendor = await getVendorByEmail(email);
      if (vendor && vendor.status === 'Approved') {
        const passwordHash = (vendor as any).passwordHash;
        const isMatch = passwordHash ? await bcrypt.compare(password, passwordHash) : false;
        if (isMatch) {
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

    if (!sessionUser) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    // Set session cookie
    const headers = new Headers({ 'content-type': 'application/json' });
    setSession(headers, sessionUser, expiresIn ? { expiresIn } : undefined);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
