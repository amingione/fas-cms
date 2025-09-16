import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getOrdersForCustomer, getOrdersForVendor, getAllOrders } from '../../../server/sanity-client';

export const GET: APIRoute = async ({ request }) => {
  const { session } = await readSession(request);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const roles = session.user.roles || [];
  if (roles.includes('admin')) {
    const orders = await getAllOrders();
    return new Response(JSON.stringify(orders), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (roles.includes('vendor')) {
    const orders = await getOrdersForVendor(session.user.id);
    return new Response(JSON.stringify(orders), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  // default to customer orders
  if (roles.includes('customer') || !roles.length) {
    const orders = await getOrdersForCustomer(session.user.id);
    return new Response(JSON.stringify(orders), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('Forbidden', { status: 403 });
};
