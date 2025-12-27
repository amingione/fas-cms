import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { getVendorByEmail, updateVendorLastLogin } from '../../../server/sanity-client';
import { setSession } from '../../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';
import { rateLimit } from '@/server/vendor-portal/rateLimit';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const passwordInput = String(password || '');

    if (!normalizedEmail || !passwordInput) {
      return jsonResponse({ message: 'Missing email or password' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    const rl = rateLimit(`vendor-login:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return jsonResponse({ message: 'Too many login attempts. Try again soon.' }, { status: 429 }, { noIndex: true });
    }

    const vendor = await getVendorByEmail(normalizedEmail);
    const portalAccess = (vendor as any).portalAccess || {};
    const status = (vendor as any).status;
    const portalEnabled = portalAccess.enabled !== false; // default to enabled when unset
    const approved = String(status || '').toLowerCase() === 'approved';
    // Allow login if portal access is enabled or vendor is approved
    if (!vendor || (!approved && !portalEnabled)) {
      return jsonResponse({ message: 'Invalid credentials or portal access disabled' }, { status: 401 }, { noIndex: true });
    }

    const passwordHash =
      portalAccess.passwordHash ||
      (vendor as any).passwordHash ||
      portalAccess.hash ||
      (vendor as any).auth?.passwordHash;
    if (!passwordHash) {
      return jsonResponse({ message: 'Account not set up yet. Please complete setup from your email link.' }, { status: 401 }, { noIndex: true });
    }
    const isMatch = await bcrypt.compare(passwordInput, passwordHash);
    if (!isMatch) {
      return jsonResponse({ message: 'Invalid credentials' }, { status: 401 }, { noIndex: true });
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    const portalPerms = (vendor as any).portalAccess?.permissions;
    const rolesRaw = (vendor as any).roles || (vendor as any).userRole || portalPerms || 'vendor';
    const roles = Array.isArray(rolesRaw)
      ? rolesRaw
      : rolesRaw
      ? [rolesRaw]
      : ['vendor'];
    const vendorEmail =
      portalAccess.email ||
      (vendor as any)?.primaryContact?.email ||
      (vendor as any)?.accountingContact?.email ||
      normalizedEmail;
    setSession(
      headers,
      { id: vendor._id, email: vendorEmail, roles: roles.map((r: any) => String(r || '').toLowerCase()) },
      { expiresIn: '1h' }
    );

    try {
      await updateVendorLastLogin(vendor._id);
    } catch (err) {
      console.warn('[vendor login] failed to update lastLogin', err);
    }

    return jsonResponse({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error(err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 });
  }
};
