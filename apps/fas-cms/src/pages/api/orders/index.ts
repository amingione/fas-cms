import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getOrdersForCustomer, getOrdersForVendor, getAllOrders } from '../../../server/sanity-client';

export const GET: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const role = session.user.role;
  if (role === 'customer') {
    const orders = await getOrdersForCustomer(session.user.id);
    return new Response(JSON.stringify(orders), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (role === 'vendor') {
    const orders = await getOrdersForVendor(session.user.id);
    return new Response(JSON.stringify(orders), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (role === 'admin') {
    const orders = await getAllOrders();
    return new Response(JSON.stringify(orders), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('Forbidden', { status: 403 });
};