import type { APIRoute } from 'astro';
import { readSession } from '../../server/auth/session';
import { getVendorByEmail, getVendorOrdersByVendorId } from '../../server/sanity-client';

export const GET: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const { id, email, role } = session.user;
  if (role !== 'vendor') {
    // For now, we only support vendor users in /api/me
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 403, headers: { 'content-type': 'application/json' } });
  }
  try {
    // Fetch vendor details
    const vendor = await getVendorByEmail(email);
    if (!vendor) {
      return new Response(JSON.stringify({ message: 'Vendor not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    // Fetch vendor orders
    const orders = await getVendorOrdersByVendorId(id);
    return new Response(JSON.stringify({ user: vendor, orders }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};