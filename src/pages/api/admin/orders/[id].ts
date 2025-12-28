import type { APIRoute } from 'astro';
import { readSession } from '../../../../server/auth/session';
import { sanity } from '../../../../server/sanity-client';
import { adminOrderPatchSchema } from '@/lib/validators/api-requests';

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
  const roles = session?.user?.roles || [];
  if (!session?.user || !roles.includes('admin')) {
    return new Response('Forbidden', { status: 403 });
  }
  const id = String(params.id || '');
  if (!id) return new Response('Missing id', { status: 400 });
  try {
    const bodyResult = adminOrderPatchSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'adminOrderPatchSchema',
        context: 'api/admin/orders',
        identifier: id || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }), {
        status: 422,
        headers: { 'content-type': 'application/json' }
      });
    }
    await sanity.patch(id).set(bodyResult.data).commit();
    return new Response('Updated', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Update failed', { status: 500 });
  }
};
