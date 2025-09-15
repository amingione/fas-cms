import type { APIRoute } from 'astro';
import { readSession } from '../../../../server/auth/session';
import { sanity } from '../../../../server/sanity-client';

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });

export const PATCH: APIRoute = async ({ request, params }) => {
  const { session } = await readSession(request);
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }
  const id = String(params.id || '');
  if (!id) return new Response('Missing id', { status: 400 });
  try {
    const body = await request.json();
    await sanity.patch(id).set(body).commit();
    return new Response('Updated', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Update failed', { status: 500 });
  }
};

