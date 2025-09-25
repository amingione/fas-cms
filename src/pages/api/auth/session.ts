import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';

export const GET: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  const body = session ? session : { user: null };
  return new Response(JSON.stringify(body), {
    status: session ? status : 200,
    headers: { 'content-type': 'application/json' }
  });
};
