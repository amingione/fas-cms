import type { APIRoute } from 'astro';
import { completeInvitation, validateInvitationToken } from '@/server/vendor-portal/service';
import { jsonResponse } from '@/server/http/responses';

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
    return jsonResponse(
      {
        valid: true,
        vendorName: vendor.name,
        email: vendor.email || vendor.portalAccess?.email
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
    const body = await request.json();
    const token = String(body?.token || '').trim();
    const password = String(body?.password || '');
    if (!token || !password) {
      return jsonResponse({ message: 'Missing token or password' }, { status: 400 }, { noIndex: true });
    }
    return await completeInvitation({ token, password, request });
  } catch (err) {
    console.error('[vendor setup complete] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
