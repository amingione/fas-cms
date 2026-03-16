import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

type CartItemInput = {
  id: string;
  title?: string;
  sku?: string;
  price: number;
  quantity: number;
};

const generateOrderNumber = (): string => {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `WO-${yy}${mm}${dd}-${rand}`;
};

export const POST: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'create_wholesale_orders');
  if (!ctx.ok) return ctx.response;

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, { status: 400 }, { noIndex: true });
  }

  const rawCart = Array.isArray(payload.cart) ? (payload.cart as CartItemInput[]) : [];
  const poNumber = typeof payload.poNumber === 'string' ? payload.poNumber.trim() : '';
  const notes = typeof payload.notes === 'string' ? payload.notes.trim() : '';

  if (!rawCart.length) {
    return jsonResponse({ error: 'Cart is empty' }, { status: 400 }, { noIndex: true });
  }

  // Validate and normalise cart items
  const cartItems = rawCart
    .filter((item) => item.id && typeof item.price === 'number' && item.quantity > 0)
    .map((item) => ({
      _type: 'cartItem' as const,
      _key: item.id,
      productRef: { _type: 'reference' as const, _ref: item.id },
      name: item.title || 'Product',
      sku: item.sku || '',
      quantity: item.quantity,
      price: item.price,
      total: Math.round(item.price * item.quantity * 100) / 100,
    }));

  if (!cartItems.length) {
    return jsonResponse({ error: 'No valid cart items' }, { status: 400 }, { noIndex: true });
  }

  const amountSubtotal = Math.round(
    cartItems.reduce((sum, item) => sum + item.total, 0) * 100
  ) / 100;

  const combinedNotes = [poNumber ? `PO #${poNumber}` : '', notes].filter(Boolean).join('\n');
  const orderNumber = generateOrderNumber();

  try {
    const doc = await sanity.create({
      _type: 'vendorOrder',
      orderNumber,
      vendor: { _type: 'reference', _ref: ctx.vendorId },
      status: 'pending',
      createdAt: new Date().toISOString(),
      currency: 'USD',
      cart: cartItems,
      amountSubtotal,
      amountTax: 0,
      amountShipping: 0,
      totalAmount: amountSubtotal,
      ...(combinedNotes ? { notes: combinedNotes } : {}),
    });

    return jsonResponse(
      { orderId: doc._id, orderNumber },
      { status: 201 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[create-order] Sanity write failed', err);
    return jsonResponse(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 },
      { noIndex: true }
    );
  }
};
