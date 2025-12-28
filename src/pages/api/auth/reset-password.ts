import type { APIRoute } from 'astro';
import { completePasswordReset, validateResetToken } from '@/server/vendor-portal/service';
import { jsonResponse } from '@/server/http/responses';
import { authResetPasswordSchema } from '@/lib/validators/api-requests';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  if (!token) {
    return jsonResponse({ valid: false, message: 'Missing token' }, { status: 400 }, { noIndex: true });
  }
  try {
    const result = await validateResetToken(token);
    if (!result.valid) {
      return jsonResponse(
        { valid: false, message: result.message || 'Invalid token' },
        { status: 400 },
        { noIndex: true }
      );
    }
    const vendor = result.vendor as any;
    return jsonResponse(
      { valid: true, vendorName: vendor?.name, email: vendor?.email || vendor?.portalAccess?.email },
      { status: 200 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[vendor reset validate] failed', err);
    return jsonResponse({ valid: false, message: 'Internal error' }, { status: 500 }, { noIndex: true });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = authResetPasswordSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'authResetPasswordSchema',
        context: 'api/auth/reset-password',
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
    return await completePasswordReset({ token, password });
  } catch (err) {
    console.error('[vendor reset complete] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
