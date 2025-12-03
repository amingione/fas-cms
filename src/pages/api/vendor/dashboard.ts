import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;

  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      .toISOString()
      .slice(0, 10);

    const statsQuery = `{
      "ordersThisMonth": count(*[_type == "purchaseOrder" && vendor._ref == $vendorId && orderDate >= $startOfMonth]),
      "ordersLastMonth": count(*[_type == "purchaseOrder" && vendor._ref == $vendorId && orderDate >= $startOfLastMonth && orderDate < $startOfMonth]),
      "pendingInvoices": *[_type == "invoice" && references($vendorId) && status == "pending"]{_id, total},
      "lowStockItems": count(*[_type == "vendorProduct" && vendor._ref == $vendorId && quantityAvailable < minimumOrder]),
      "outstandingPayments": *[_type == "bill" && vendor._ref == $vendorId && paid == false]{amount}
    }`;

    const activityQuery = `*[_type in ["purchaseOrder", "invoice", "vendorMessage", "bill"] && references($vendorId)] | order(_updatedAt desc)[0...10]{
      _type,
      _updatedAt,
      poNumber,
      invoiceNumber,
      status,
      priority,
      subject,
      description,
      amount
    }`;

    const stats = await sanity.fetch(statsQuery, { vendorId: ctx.vendorId, startOfMonth, startOfLastMonth });
    const activity = await sanity.fetch(activityQuery, { vendorId: ctx.vendorId });

    const pendingTotal = Array.isArray(stats?.pendingInvoices)
      ? stats.pendingInvoices.reduce((sum: number, inv: any) => sum + (Number(inv?.total) || 0), 0)
      : 0;
    const outstanding = Array.isArray(stats?.outstandingPayments)
      ? stats.outstandingPayments.reduce((sum: number, bill: any) => sum + (Number(bill?.amount) || 0), 0)
      : 0;

    return jsonResponse(
      {
        stats: {
          ordersThisMonth: stats?.ordersThisMonth || 0,
          ordersLastMonth: stats?.ordersLastMonth || 0,
          pendingInvoices: {
            count: Array.isArray(stats?.pendingInvoices) ? stats.pendingInvoices.length : 0,
            total: pendingTotal
          },
          lowStockItems: stats?.lowStockItems || 0,
          outstandingPayments: outstanding
        },
        activity: activity || []
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[vendor dashboard] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
