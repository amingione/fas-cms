import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    await requireUser(event);
    const id = new URLSearchParams(event.rawQuery || '').get('id');
    if (!id) return { statusCode: 400, body: 'Missing id' };
    const q = `*[_type=="order" && _id==$id][0]{
      _id,
      orderNumber,
      status,
      paymentStatus,
      total,
      orderDate,
      customerName,
      customerEmail,
      cardBrand,
      cardLast4,
      receiptUrl,
      shippingAddress,
      billingAddress,
      items[]{ title, sku, qty, price },
      shipments[]{ carrier, trackingNumber, labelUrl, createdAt }
    }`;
    const data = await sanity.fetch(q, { id });
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
