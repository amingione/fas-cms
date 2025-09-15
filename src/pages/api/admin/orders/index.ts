import type { APIRoute } from 'astro';
import { readSession } from '../../../../server/auth/session';
import { getAllOrders } from '../../../../server/sanity-client';

export const GET: APIRoute = async ({ request }) => {
  const { session } = await readSession(request);
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }
  const orders = await getAllOrders();
  return new Response(JSON.stringify(orders), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

