import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const vendor = await sanity.fetch(
      '*[_type == "vendor" && _id == $vendorId][0]{notificationPreferences}',
      { vendorId: ctx.vendorId }
    );
    return jsonResponse(
      { preferences: vendor?.notificationPreferences || {} },
      { status: 200 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[vendor settings notifications GET] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const preferences = await request.json();
    await sanity.patch(ctx.vendorId).set({ notificationPreferences: preferences }).commit();
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor settings notifications PUT] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
