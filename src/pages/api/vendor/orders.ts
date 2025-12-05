import type { APIRoute } from 'astro';
import { fetchVendorOrders } from '@/server/vendor-portal/data';
import { requireVendor } from '@/server/vendor-portal/auth';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const orders = await fetchVendorOrders(ctx.vendorId, status || undefined);
    return jsonResponse({ orders }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor orders] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
