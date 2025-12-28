import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getVendorByEmail, updateVendorPassword } from '../../../../server/sanity-client';
import { vendorPasswordResetConfirmSchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = vendorPasswordResetConfirmSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorPasswordResetConfirmSchema',
        context: 'api/vendor/password-reset/confirm',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ message: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422, headers: { 'content-type': 'application/json' } }
      );
    }
    const token = String(bodyResult.data.token || '').trim();
    const email = String(bodyResult.data.email || '').trim().toLowerCase();
    const password = String(bodyResult.data.password || '');

    if (password.length < 8) {
      return new Response(JSON.stringify({ message: 'Password must be at least 8 characters long.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const vendor = await getVendorByEmail(email);
    if (!vendor || !vendor.passwordResetToken || !vendor.passwordResetExpires) {
      return new Response(JSON.stringify({ message: 'Invalid or expired reset link.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(vendor.passwordResetExpires as string);

    if (vendor.passwordResetToken !== hashedToken || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return new Response(JSON.stringify({ message: 'Invalid or expired reset link.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await updateVendorPassword(vendor._id, passwordHash);

    return new Response(JSON.stringify({ message: 'Password updated successfully.' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error('Vendor password reset confirm failed:', err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
