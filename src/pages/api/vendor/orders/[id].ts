import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request, 'view_purchase_orders');
  if (!ctx.ok) return ctx.response;
  const orderId = params.id;
  try {
    const query = `*[_type == "purchaseOrder" && _id == $orderId && vendor._ref == $vendorId][0]{
      _id,
      poNumber,
      status,
      orderDate,
      expectedDelivery,
      actualDelivery,
      lineItems[]{
        product->{_id, title, sku, "image": featuredImage.asset->url},
        quantity,
        unitPrice,
        total
      },
      subtotal,
      tax,
      shipping,
      total,
      shippingAddress,
      trackingNumber,
      notes,
      "statusHistory": statusHistory[] | order(timestamp desc)
    }`;
    const order = await sanity.fetch(query, { orderId, vendorId: ctx.vendorId });
    if (!order) {
      return jsonResponse({ message: 'Not found' }, { status: 404 }, { noIndex: true });
    }
    return jsonResponse({ order }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor order detail] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
