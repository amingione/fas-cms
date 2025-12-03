import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const count = await sanity.fetch(
      'count(*[_type == "vendorNotification" && vendor._ref == $vendorId && read != true])',
      { vendorId: ctx.vendorId }
    );
    return jsonResponse({ count: Number(count) || 0 }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor notifications unread count] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
