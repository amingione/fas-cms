// /src/pages/api/orders/[id].ts (Astro API route)
import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { readSession } from '../../../server/auth/session';
import { jsonResponse } from '@/server/http/responses';

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
  apiVersion: '2023-01-01',
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
      `*[_type == "order" && _id == $id && customer->email == $email][0]`,
      { id, email }
    );
    if (!order) {
      return jsonResponse(
        { message: 'Order not found or access denied' },
        { status: 404, headers: { ...cors } }
      );
    }
    return jsonResponse(order, { status: 200, headers: { ...cors } });
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
      `*[_type == "order" && _id == $id && customer->email == $email][0]`,
      { id, email }
    );
    if (!existing)
      return jsonResponse(
        { message: 'Access denied' },
        { status: 403, headers: { ...cors } }
      );

    const data = await request.json();
    const result = await client.patch(id).set(data).commit();
    return jsonResponse(result, { status: 200, headers: { ...cors } });
  } catch (err) {
    console.error('Error updating order:', err);
    return jsonResponse(
      { message: 'Failed to update order' },
      { status: 500, headers: { ...cors } }
    );
  }
};
