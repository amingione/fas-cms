import type { APIRoute } from 'astro';
import { readSession } from '@/server/auth/session';
import { handleInvite, requireAdmin } from '@/server/vendor-portal/service';
import { jsonResponse } from '@/server/http/responses';
import { vendorInviteSchema } from '@/lib/validators/api-requests';

export const POST: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  if (!session?.user || !requireAdmin(session)) {
    return jsonResponse({ message: 'Unauthorized' }, { status: status ?? 401 }, { noIndex: true });
  }

  try {
    const bodyResult = vendorInviteSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorInviteSchema',
        context: 'api/vendors/invite',
        identifier: session?.user?.id || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { message: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    return await handleInvite(bodyResult.data, session, request);
  } catch (err) {
    console.error('[vendor invite] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
