import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'view_purchase_orders');
  if (!ctx.ok) return ctx.response;

  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return jsonResponse({ message: 'At least one line item is required' }, { status: 400 }, { noIndex: true });
    }
    const expectedDelivery = body?.expectedDelivery || null;
    const shippingAddress = body?.shippingAddress || null;
    const notes = body?.notes || '';
    const shipping = Number(body?.shipping || 0);

    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
      0
    );
    const tax = Number((subtotal * 0.08).toFixed(2)); // simple 8% placeholder
    const total = Number((subtotal + tax + shipping).toFixed(2));

    const poNumber = `PO-${Date.now()}`;
    const order = await sanity.create({
      _type: 'purchaseOrder',
      poNumber,
      vendor: { _type: 'reference', _ref: ctx.vendorId },
      status: 'pending',
      orderDate: new Date().toISOString(),
      expectedDelivery,
      lineItems: items.map((item: any) => ({
        _type: 'object',
        _key: Math.random().toString(36).slice(2),
        product: item.productId ? { _type: 'reference', _ref: item.productId } : undefined,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))
      })),
      subtotal,
      tax,
      shipping,
      total,
      shippingAddress,
      notes,
      statusHistory: [
        {
          _type: 'object',
          _key: Math.random().toString(36).slice(2),
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: 'Order submitted'
        }
      ]
    });

    await sanity.create({
      _type: 'vendorNotification',
      vendor: { _type: 'reference', _ref: ctx.vendorId },
      type: 'order',
      title: 'Order Submitted',
      message: `Your order ${poNumber} has been submitted.`,
      link: `/vendor-portal/orders/${order._id}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    return jsonResponse({ order }, { status: 201 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor order submit] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
