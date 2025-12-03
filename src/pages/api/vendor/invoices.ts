import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { fetchVendorInvoices } from '@/server/vendor-portal/data';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'upload_invoices');
  if (!ctx.ok) return ctx.response;
  try {
    const invoices = await fetchVendorInvoices(ctx.vendorId);
    return jsonResponse({ invoices }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor invoices] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
