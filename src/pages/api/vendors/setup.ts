import type { APIRoute } from 'astro';
import { completeInvitation, validateInvitationToken } from '@/server/vendor-portal/service';
import { jsonResponse } from '@/server/http/responses';
import { vendorAuthSetupSchema } from '@/lib/validators/api-requests';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  if (!token) {
    return jsonResponse({ valid: false, message: 'Missing token' }, { status: 400 }, { noIndex: true });
  }
  try {
    const validation = await validateInvitationToken(token);
    if (!validation.valid || !validation.vendor) {
      return jsonResponse(
        { valid: false, message: validation.message || 'Invalid token' },
        { status: 400 },
        { noIndex: true }
      );
    }
    const vendor = validation.vendor as any;
    const vendorEmail =
      vendor?.portalAccess?.email ||
      vendor?.primaryContact?.email ||
      vendor?.accountingContact?.email ||
      '';
    return jsonResponse(
      {
        valid: true,
        vendorName: vendor.name,
        email: vendorEmail
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[vendor setup validate] failed', err);
    return jsonResponse({ valid: false, message: 'Internal error' }, { status: 500 }, { noIndex: true });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = vendorAuthSetupSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorAuthSetupSchema',
        context: 'api/vendors/setup',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { message: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const token = String(bodyResult.data.token || '').trim();
    const password = String(bodyResult.data.password || '');
    return await completeInvitation({ token, password, request });
  } catch (err) {
    console.error('[vendor setup complete] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
