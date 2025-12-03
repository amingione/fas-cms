import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { requireVendor } from '@/server/vendor-portal/auth';
import { getVendorById, updateVendorPassword } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const PUT: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return jsonResponse({ message: 'Missing password fields' }, { status: 400 }, { noIndex: true });
    }

    const vendor = await getVendorById(ctx.vendorId);
    const portalAccess = (vendor as any)?.portalAccess || {};
    const passwordHash =
      (vendor as any)?.passwordHash ||
      portalAccess.passwordHash ||
      portalAccess.hash ||
      (vendor as any)?.auth?.passwordHash;
    if (!passwordHash) {
      return jsonResponse({ message: 'No password set for this account' }, { status: 400 }, { noIndex: true });
    }

    const isMatch = await bcrypt.compare(String(currentPassword), String(passwordHash));
    if (!isMatch) {
      return jsonResponse({ message: 'Current password is incorrect' }, { status: 401 }, { noIndex: true });
    }

    if (String(newPassword).length < 8) {
      return jsonResponse({ message: 'New password must be at least 8 characters' }, { status: 400 }, { noIndex: true });
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await updateVendorPassword(ctx.vendorId, newHash);

    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor settings password PUT] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
