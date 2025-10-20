import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getVendorOrdersByVendorId } from '../../../server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const { session } = await readSession(request);
  if (!session?.user) {
    return jsonResponse(
      { message: 'Authentication required' },
      { status: 401 },
      { noIndex: true }
    );
  }

  const { id, roles } = session.user;
  if (!roles?.includes('vendor')) {
    return jsonResponse({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const orders = await getVendorOrdersByVendorId(id);
    return jsonResponse({ orders });
  } catch (err) {
    console.error(err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 });
  }
};
