import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { getVendorByEmail } from '../../../server/sanity-client';
import { setSession } from '../../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const passwordInput = String(password || '');

    if (!normalizedEmail || !passwordInput) {
      return jsonResponse({ message: 'Missing email or password' }, { status: 400 });
    }

    const vendor = await getVendorByEmail(normalizedEmail);
    if (!vendor || (vendor as any).status !== 'Approved') {
      return jsonResponse({ message: 'Invalid credentials' }, { status: 401 }, { noIndex: true });
    }

    const passwordHash = (vendor as any).passwordHash;
    const isMatch = passwordHash ? await bcrypt.compare(passwordInput, passwordHash) : false;
    if (!isMatch) {
      return jsonResponse({ message: 'Invalid credentials' }, { status: 401 }, { noIndex: true });
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    const rolesRaw = (vendor as any).roles || (vendor as any).userRole || 'vendor';
    const roles = Array.isArray(rolesRaw)
      ? rolesRaw
      : rolesRaw
      ? [rolesRaw]
      : ['vendor'];
    setSession(
      headers,
      { id: vendor._id, email: vendor.email, roles: roles.map((r: any) => String(r || '').toLowerCase()) },
      { expiresIn: '1h' }
    );

    return jsonResponse({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error(err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 });
  }
};
