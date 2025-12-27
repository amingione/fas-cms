import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { hasWriteToken, sanity } from '@/server/sanity-client';
import { ensureOrderCartItems } from '@/server/sanity/order-cart';
import { requireVendor } from '@/server/vendor-portal/auth';

export const POST: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  if (!hasWriteToken) {
    return jsonResponse(
      { error: 'Server is not authorized to create orders. Missing Sanity token.' },
      { status: 500 },
      { noIndex: true }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, { status: 400 }, { noIndex: true });
  }

  const cart = ensureOrderCartItems(body?.cart);
  if (!cart.length) {
    return jsonResponse({ error: 'Cart is empty' }, { status: 400 }, { noIndex: true });
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0), 0);
  const orderNumber = `WS-${Date.now()}`;
  const now = new Date().toISOString();

  const vendor = ctx.vendor as any;
  const vendorName =
    vendor?.displayName ||
    vendor?.companyName ||
    vendor?.name ||
    vendor?.portalAccess?.email ||
    'Wholesale Vendor';
  const vendorEmail = vendor?.portalAccess?.email || vendor?.email || null;

  const orderDoc = {
    _type: 'order',
    orderNumber,
    orderType: 'wholesale',
    status: 'paid',
    paymentStatus: 'pending',
    createdAt: now,
    customerName: vendorName,
    customerEmail: vendorEmail,
    ...(vendor?._id
      ? {
          customerRef: {
            _type: 'reference',
            _ref: vendor._id
          }
        }
      : {}),
    wholesaleDetails: {
      workflowStatus: 'requested'
    },
    cart: cart.map((item) => ({
      ...item,
      ...(item.id
        ? {
            productRef: {
              _type: 'reference',
              _ref: item.id
            }
          }
        : {}),
      total: (item.price ?? 0) * (item.quantity ?? 0)
    })),
    totalAmount: subtotal,
    amountSubtotal: subtotal,
    amountTax: 0,
    amountShipping: 0,
    currency: 'USD'
  };

  try {
    const order = await sanity.create(orderDoc, { autoGenerateArrayKeys: true });
    return jsonResponse(
      { success: true, orderId: order._id, orderNumber },
      { status: 200 },
      { noIndex: true }
    );
  } catch (error) {
    console.error('[vendor wholesale] order creation error', error);
    return jsonResponse({ error: 'Failed to create order' }, { status: 500 }, { noIndex: true });
  }
};
