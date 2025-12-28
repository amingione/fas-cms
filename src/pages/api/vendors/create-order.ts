import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { hasWriteToken, sanity } from '@/server/sanity-client';
import { ensureOrderCartItems } from '@/server/sanity/order-cart';
import { requireVendor } from '@/server/vendor-portal/auth';
import { vendorCreateOrderSchema } from '@/lib/validators/api-requests';
import { sanityCustomerSchema } from '@/lib/validators/sanity';

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
    const bodyResult = vendorCreateOrderSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorCreateOrderSchema',
        context: 'api/vendors/create-order',
        identifier: ctx.vendorId || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    body = bodyResult.data;
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
    vendor?.portalAccess?.email ||
    'Wholesale Vendor';
  const vendorEmail = vendor?.portalAccess?.email || null;

  const customerRef = vendor?.customerRef?._ref;
  if (!customerRef) {
    return jsonResponse({ error: 'Vendor customer reference missing' }, { status: 400 }, { noIndex: true });
  }

  const customer = await sanity.fetch(
    '*[_type == "customer" && _id == $id][0]{_id, name, email, roles}',
    { id: customerRef }
  );
  const customerResult = sanityCustomerSchema.partial().safeParse(customer);
  if (!customerResult.success) {
    console.warn('[sanity-validation]', {
      _id: (customer as any)?._id,
      _type: 'customer',
      errors: customerResult.error.format()
    });
    return jsonResponse({ error: 'Customer not found' }, { status: 404 }, { noIndex: true });
  }
  if (!customerResult.data?._id) {
    return jsonResponse({ error: 'Customer not found' }, { status: 404 }, { noIndex: true });
  }
  const roles = Array.isArray(customerResult.data.roles)
    ? customerResult.data.roles.map((r: any) => String(r || '').toLowerCase())
    : [];
  if (!roles.includes('vendor')) {
    return jsonResponse({ error: 'Customer is not authorized for wholesale pricing' }, { status: 403 }, { noIndex: true });
  }

  const orderDoc = {
    _type: 'order',
    orderNumber,
    orderType: 'wholesale',
    status: 'paid',
    paymentStatus: 'pending',
    createdAt: now,
    customerName: customerResult.data?.name || vendorName,
    customerEmail: customerResult.data?.email || vendorEmail,
    customerRef: {
      _type: 'reference',
      _ref: customerResult.data._id
    },
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
