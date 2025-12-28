import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { sanity, findVendorAuthTokenByHash, markVendorAuthTokenUsed } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { hashRawToken } from '@/server/vendor-portal/tokens';
import { vendorAuthSetupSchema } from '@/lib/validators/api-requests';

async function getVendorForToken(token: string) {
  const now = new Date().toISOString();
  const query = `*[_type == "vendor"
    && portalAccess.setupToken == $token
    && portalAccess.setupTokenExpiry > $now
    && !defined(portalAccess.setupCompletedAt)
  ][0]{
    _id,
    name,
    companyName,
    email,
    portalAccess
  }`;
  return sanity.fetch(query, { token, now });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = vendorAuthSetupSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorAuthSetupSchema',
        context: 'api/vendor/auth/setup',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const rawToken = String(bodyResult.data.token || '').trim();
    const rawPassword = String(bodyResult.data.password || '');

    if (!rawToken) {
      return jsonResponse({ message: 'Missing token' }, { status: 400 }, { noIndex: true });
    }
    if (rawPassword.length < 8 || rawPassword.length > 128) {
      return jsonResponse({ message: 'Password must be between 8 and 128 characters' }, { status: 400 }, { noIndex: true });
    }

    const vendor = await getVendorForToken(rawToken);
    if (!vendor?._id) {
      return jsonResponse({ message: 'Invalid or expired token' }, { status: 400 }, { noIndex: true });
    }
    if (bodyResult.data?.vendorId && bodyResult.data.vendorId !== vendor._id) {
      return jsonResponse({ message: 'Token does not match vendor' }, { status: 400 }, { noIndex: true });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    await sanity
      .patch(vendor._id)
      .set({
        'portalAccess.passwordHash': passwordHash,
        'portalAccess.setupCompletedAt': new Date().toISOString(),
        'portalAccess.enabled': true
      })
      .unset(['portalAccess.setupToken', 'portalAccess.setupTokenExpiry'])
      .commit();

    // Mark the matching auth token as used if it exists (keeps single-use semantics)
    try {
      const tokenHash = hashRawToken(rawToken);
      const authToken = await findVendorAuthTokenByHash(tokenHash, 'invitation');
      if (authToken?._id) {
        await markVendorAuthTokenUsed(authToken._id);
      }
    } catch (err) {
      console.warn('[vendor setup] unable to mark auth token used', err);
    }

    return jsonResponse({ success: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor setup] error', err);
    return jsonResponse({ message: 'Server error' }, { status: 500 }, { noIndex: true });
  }
};
