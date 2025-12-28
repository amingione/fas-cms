// /src/pages/api/orders/[id].ts (Astro API route)
import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { readSession } from '../../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';
import { orderUpdateSchema } from '@/lib/validators/api-requests';
import { sanityOrderSchema } from '@/lib/validators/sanity';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PATCH, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type'
};

const projectId = (import.meta.env.PUBLIC_SANITY_PROJECT_ID || import.meta.env.SANITY_PROJECT_ID) as
  | string
  | undefined;
const dataset = (import.meta.env.PUBLIC_SANITY_DATASET || import.meta.env.SANITY_DATASET) as
  | string
  | undefined;
const token = import.meta.env.SANITY_API_TOKEN as string | undefined;

const client = createClient({
  projectId: projectId!,
  dataset: dataset!,
  apiVersion: '2024-01-01',
  token,
  useCdn: false
});

async function requireSessionEmail(req: Request): Promise<string | null> {
  const { session } = await readSession(req);
  const email = (session?.user?.email as string | undefined) || '';
  return email ? email.toLowerCase() : null;
}

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const id = params.id as string | undefined;
    if (!id) {
      return jsonResponse({ message: 'Missing order ID' }, { status: 400, headers: { ...cors } });
    }

    const email = await requireSessionEmail(request);
    if (!email) {
      return jsonResponse(
        { message: 'Unauthorized' },
        { status: 401, headers: { ...cors } },
        { noIndex: true }
      );
    }
    const order = await client.fetch(
      `*[_type == "order" && _id == $id && customerRef->email == $email][0]`,
      { id, email }
    );
    const orderResult = sanityOrderSchema.safeParse(order);
    if (!orderResult.success) {
      console.warn('[sanity-validation]', {
        _id: (order as any)?._id,
        _type: 'order',
        errors: orderResult.error.format()
      });
      return jsonResponse(
        { message: 'Order not found or access denied' },
        { status: 404, headers: { ...cors } }
      );
    }
    if (!order) {
      return jsonResponse(
        { message: 'Order not found or access denied' },
        { status: 404, headers: { ...cors } }
      );
    }
    return jsonResponse(orderResult.data, { status: 200, headers: { ...cors } });
  } catch (err) {
    console.error('Error fetching order:', err);
    return jsonResponse(
      { message: 'Failed to fetch order' },
      { status: 500, headers: { ...cors } }
    );
  }
};

export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    const id = params.id as string | undefined;
    if (!id) {
      return jsonResponse({ message: 'Missing order ID' }, { status: 400, headers: { ...cors } });
    }

    const email = await requireSessionEmail(request);
    if (!email) {
      return jsonResponse(
        { message: 'Unauthorized' },
        { status: 401, headers: { ...cors } },
        { noIndex: true }
      );
    }

    const existing = await client.fetch(
      `*[_type == "order" && _id == $id && customerRef->email == $email][0]`,
      { id, email }
    );
    const existingResult = sanityOrderSchema.safeParse(existing);
    if (!existingResult.success) {
      console.warn('[sanity-validation]', {
        _id: (existing as any)?._id,
        _type: 'order',
        errors: existingResult.error.format()
      });
    }
    if (!existingResult.success || !existing)
      return jsonResponse(
        { message: 'Access denied' },
        { status: 403, headers: { ...cors } }
      );

    const dataResult = orderUpdateSchema.safeParse(await request.json());
    if (!dataResult.success) {
      console.error('[validation-failure]', {
        schema: 'orderUpdateSchema',
        context: 'api/orders/update',
        identifier: id || 'unknown',
        timestamp: new Date().toISOString(),
        errors: dataResult.error.format()
      });
      return jsonResponse(
        { message: 'Validation failed', details: dataResult.error.format() },
        { status: 422, headers: { ...cors } }
      );
    }
    const data = dataResult.data;

    const allowlist = new Set([
      'shippingAddress',
      'billingAddress',
      'phone',
      'email',
      'notes'
    ]);
    const keys = Object.keys(data);
    const invalid = keys.filter((key) => !allowlist.has(key));
    if (invalid.length) {
      return jsonResponse(
        { message: 'Invalid fields', fields: invalid },
        { status: 400, headers: { ...cors } }
      );
    }

    const orderPatch: Record<string, unknown> = {};
    if ('shippingAddress' in data) orderPatch.shippingAddress = data.shippingAddress;
    if ('billingAddress' in data) orderPatch.billingAddress = data.billingAddress;
    if ('notes' in data) orderPatch.opsInternalNotes = data.notes;

    const customerPatch: Record<string, unknown> = {};
    if ('phone' in data) customerPatch.phone = data.phone;
    if ('email' in data) customerPatch.email = data.email;

    let customerId: string | null = null;
    let vendorId: string | null = null;
    if (Object.keys(customerPatch).length) {
      const order = await client.fetch(
        '*[_type == "order" && _id == $id][0]{customerRef}',
        { id }
      );
      const orderResult = sanityOrderSchema.partial().safeParse(order);
      if (!orderResult.success) {
        console.warn('[sanity-validation]', {
          _id: (order as any)?._id,
          _type: 'order',
          errors: orderResult.error.format()
        });
        return jsonResponse(
          { message: 'Customer reference missing' },
          { status: 400, headers: { ...cors } }
        );
      }
      customerId = orderResult.data?.customerRef?._ref || null;
      if (!customerId) {
        return jsonResponse(
          { message: 'Customer reference missing' },
          { status: 400, headers: { ...cors } }
        );
      }
      if ('email' in customerPatch) {
        const vendor = await client.fetch(
          '*[_type == "vendor" && customerRef._ref == $customerId][0]{_id}',
          { customerId }
        );
        vendorId = vendor?._id || null;
      }
    }

    const tx = client.transaction();
    if (Object.keys(orderPatch).length) {
      tx.patch(id, { set: orderPatch });
    }
    if (customerId) {
      tx.patch(customerId, { set: customerPatch });
    }
    if (vendorId && 'email' in customerPatch) {
      tx.patch(vendorId, { set: { 'portalAccess.email': customerPatch.email } });
    }
    const result = await tx.commit();
    return jsonResponse(result, { status: 200, headers: { ...cors } });
  } catch (err) {
    console.error('Error updating order:', err);
    return jsonResponse(
      { message: 'Failed to update order' },
      { status: 500, headers: { ...cors } }
    );
  }
};
