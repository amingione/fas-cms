import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { fetchVendorPayments } from '@/server/vendor-portal/data';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'view_payments');
  if (!ctx.ok) return ctx.response;
  try {
    const payments = await fetchVendorPayments(ctx.vendorId);
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const totals = payments.reduce(
      (acc: any, p: any) => {
        const amount = Number(p.amount) || 0;
        if (p.paid) {
          acc.paidAll += amount;
          const paidDate = p.paidDate ? new Date(p.paidDate).toISOString() : '';
          if (paidDate >= startOfYear) acc.paidYtd += amount;
          if (paidDate >= startOfMonth) acc.paidMtd += amount;
        } else {
          acc.outstanding += amount;
        }
        return acc;
      },
      { paidAll: 0, paidYtd: 0, paidMtd: 0, outstanding: 0 }
    );

    return jsonResponse({ payments, summary: totals }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor payments] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
