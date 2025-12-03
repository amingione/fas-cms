import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { fetchVendorDocuments } from '@/server/vendor-portal/data';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const documents = await fetchVendorDocuments(ctx.vendorId);
    return jsonResponse({ documents }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor documents] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
