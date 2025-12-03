import type { APIRoute } from 'astro';
import { readSession } from '@/server/auth/session';
import { handleInvite, requireAdmin } from '@/server/vendor-portal/service';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  if (!session?.user || !requireAdmin(session)) {
    return jsonResponse({ message: 'Unauthorized' }, { status: status ?? 401 }, { noIndex: true });
  }

  try {
    const body = await request.json();
    return await handleInvite(body, session, request);
  } catch (err) {
    console.error('[vendor invite] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
