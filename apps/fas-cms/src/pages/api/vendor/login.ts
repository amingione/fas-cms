import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { getVendorByEmail } from '../../../server/sanity-client';
import { setSession } from '../../../server/auth/session';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();
    const vendor = await getVendorByEmail(email);
    if (!vendor || vendor.status !== 'Approved') {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }
    const passwordHash = (vendor as any).passwordHash;
    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });
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
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
