import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getVendorBySub } from '../../../server/sanity-client';
import { jsonResponse, withNoIndexHeaders } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  if (!session?.user) {
    return new Response('Unauthorized', {
      status: status ?? 401,
      headers: withNoIndexHeaders({ 'content-type': 'text/plain; charset=utf-8' })
    });
  }

  try {
    const vendor = await getVendorBySub(session.user.id);
    if (!vendor) {
      return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    return jsonResponse(vendor);
  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
};
