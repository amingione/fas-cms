import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  const orderId = params.id;
  try {
    const query = `*[_type == "order" && orderType == "wholesale" && _id == $orderId && customerRef._ref == $vendorId][0]{
      _id,
      orderNumber,
      status,
      createdAt,
      totalAmount,
      amountSubtotal,
      amountTax,
      amountShipping,
      currency,
      statusHistory,
      cart[]{
        _key,
        name,
        sku,
        quantity,
        price,
        total,
        productRef->{_id, title, sku, "image": coalesce(images[0].asset->url, mainImage.asset->url, thumbnail.asset->url)}
      }
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
