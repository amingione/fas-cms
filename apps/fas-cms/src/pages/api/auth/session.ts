import type { APIRoute } from 'astro';
import { readSession } from '../../../server/auth/session';

export const GET: APIRoute = async ({ request }) => {
  const { session, status } = await readSession(request);
  return new Response(JSON.stringify(session ?? {}), {
    status,
    headers: { 'content-type': 'application/json' },
  });
};