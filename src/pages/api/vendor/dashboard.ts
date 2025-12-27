import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;

  try {
    const vendor = await sanity.fetch(
      '*[_type == "vendor" && _id == $vendorId][0]{customerRef}',
      { vendorId: ctx.vendorId }
    );
    const customerId = vendor?.customerRef?._ref;
    if (!customerId) {
      return jsonResponse({ message: 'Not found' }, { status: 404 }, { noIndex: true });
    }

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const statsQuery = `{
      "ordersThisMonth": count(*[_type == "order" && orderType == "wholesale" && customerRef._ref == $customerId && dateTime(coalesce(createdAt, _createdAt)) >= dateTime($startOfMonth)]),
      "ordersTotal": count(*[_type == "order" && orderType == "wholesale" && customerRef._ref == $customerId]),
      "amounts": *[_type == "order" && orderType == "wholesale" && customerRef._ref == $customerId]{ "amt": coalesce(totalAmount, amountSubtotal + amountTax + amountShipping, 0) }
    }`;

    const recentOrdersQuery = `*[_type == "order" && orderType == "wholesale" && customerRef._ref == $customerId] | order(dateTime(coalesce(createdAt, _createdAt)) desc)[0...5]{
      _id,
      orderNumber,
      status,
      createdAt,
      totalAmount,
      amountSubtotal,
      amountTax,
      amountShipping,
      currency
    }`;

    const stats = await sanity.fetch(statsQuery, { customerId, startOfMonth });
    const recentOrders = await sanity.fetch(recentOrdersQuery, { customerId });

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
