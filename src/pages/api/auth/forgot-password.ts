import type { APIRoute } from 'astro';
import { requestPasswordReset } from '@/server/vendor-portal/service';
import { jsonResponse } from '@/server/http/responses';
import { authForgotPasswordSchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = authForgotPasswordSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'authForgotPasswordSchema',
        context: 'api/auth/forgot-password',
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
    const email = String(bodyResult.data.email || '').trim().toLowerCase();
    return await requestPasswordReset(email, request);
  } catch (err) {
    console.error('[vendor forgot password] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
