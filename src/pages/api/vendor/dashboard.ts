import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;

  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const statsQuery = `{
      "ordersThisMonth": count(*[_type == "order" && orderType == "wholesale" && customerRef._ref == $vendorId && dateTime(coalesce(orderDate, createdAt, _createdAt)) >= dateTime($startOfMonth)]),
      "ordersTotal": count(*[_type == "order" && orderType == "wholesale" && customerRef._ref == $vendorId]),
      "amounts": *[_type == "order" && orderType == "wholesale" && customerRef._ref == $vendorId]{ "amt": coalesce(totalAmount, amountSubtotal + amountTax + amountShipping, 0) }
    }`;

    const recentOrdersQuery = `*[_type == "order" && orderType == "wholesale" && customerRef._ref == $vendorId] | order(dateTime(coalesce(orderDate, createdAt, _createdAt)) desc)[0...5]{
      _id,
      orderNumber,
      status,
      orderDate,
      createdAt,
      totalAmount,
      amountSubtotal,
      amountTax,
      amountShipping,
      currency,
      wholesaleDetails
    }`;

    const stats = await sanity.fetch(statsQuery, { vendorId: ctx.vendorId, startOfMonth });
    const recentOrders = await sanity.fetch(recentOrdersQuery, { vendorId: ctx.vendorId });

    return jsonResponse(
      {
        vendor: {
          name: ctx.vendor?.displayName || ctx.vendor?.companyName || ctx.vendor?.name || 'Vendor',
          tier: ctx.vendor?.portalAccess?.vendorTier || 'standard'
        },
        stats: {
          ordersThisMonth: stats?.ordersThisMonth || 0,
          ordersTotal: stats?.ordersTotal || 0,
          totalSpent: Array.isArray(stats?.amounts)
            ? stats.amounts.reduce((sum: number, entry: any) => {
                const amt = Number(entry?.amt) || 0;
                return sum + (Number.isFinite(amt) ? amt : 0);
              }, 0)
            : 0
        },
        recentOrders: Array.isArray(recentOrders) ? recentOrders : []
      },
      { status: 200 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[vendor dashboard] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
