import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { fetchVendorAnalytics } from '@/server/vendor-portal/data';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'view_analytics');
  if (!ctx.ok) return ctx.response;
  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const analytics = await fetchVendorAnalytics(ctx.vendorId, startOfMonth);
    return jsonResponse({ analytics }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor analytics] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
