import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getVendorOrdersByVendorId } from '../../../server/sanity-client';

export const GET: APIRoute = async ({ request }) => {
  const { session } = await readSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const { id, role } = session.user;
  if (role !== 'vendor') {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 403, headers: { 'content-type': 'application/json' } });
  }
  try {
    const orders = await getVendorOrdersByVendorId(id);
    return new Response(JSON.stringify({ orders }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};