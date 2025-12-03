import type { APIRoute } from 'astro';
import { requestPasswordReset } from '@/server/vendor-portal/service';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) {
      return jsonResponse({ message: 'Email is required' }, { status: 400 }, { noIndex: true });
    }
    return await requestPasswordReset(email, request);
  } catch (err) {
    console.error('[vendor forgot password] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
