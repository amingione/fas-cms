import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getOrderById } from '../../../server/sanity-client';

export const GET: APIRoute = async ({ request, params }) => {
  const { session } = await readSession(request);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const orderId = params.id as string;
  const order: any = await getOrderById(orderId);
  if (!order) {
    return new Response('Not Found', { status: 404 });
  }
  const role = session.user.role;
  const userId = session.user.id;
  // Restrict access based on role
  if (role === 'customer') {
    if (order.customer?._ref !== userId) {
      return new Response('Forbidden', { status: 403 });
    }
  }
  if (role === 'vendor') {
    if (order.vendor?._ref !== userId) {
      return new Response('Forbidden', { status: 403 });
    }
  }
  
  // admins have access to all orders
  return new Response(JSON.stringify(order), { status: 200, headers: { 'content-type': 'application/json' } });
};