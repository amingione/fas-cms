import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';
import { getCustomerBySub } from '../../../server/sanity-client';

export const GET: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const customer = await getCustomerBySub(session.user.id);
  if (!customer) {
    return new Response('Not Found', { status: 404 });
  }
  return new Response(JSON.stringify(customer), { status: 200, headers: { 'content-type': 'application/json' } });
};
