import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getVendorBySub } from '../../../server/sanity-client';

export const GET: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  if (!session?.user) {
    return new Response('Unauthorized', { status: status ?? 401 });
  }

  try {
    const vendor = await getVendorBySub(session.user.id);
    if (!vendor) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response(JSON.stringify(vendor), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
