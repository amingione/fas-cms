import type { APIRoute } from 'astro';
import { readSession } from '../../../../server/auth/session';
import { sanity } from '../../../../server/sanity-client';

export const PATCH: APIRoute = async ({ request, params }) => {
  const { session } = await readSession(request);
  const roles = session?.user?.roles || [];
  if (!session?.user || !roles.includes('admin')) {
    return new Response('Forbidden', { status: 403 });
  }
  const id = params.id as string;
  const body = await request.json();
  try {
    const mutation = { patch: { id, set: body } };
    await sanity.transaction().patch(id, (p) => p.set(body)).commit();
    return new Response('Updated', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Update failed', { status: 500 });
  }
};
