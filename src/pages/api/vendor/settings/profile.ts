import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const vendor = await sanity.fetch('*[_type == "vendor" && _id == $id][0]{_id, name, email, portalAccess}', {
      id: ctx.vendorId
    });
    if (!vendor) return jsonResponse({ message: 'Not found' }, { status: 404 }, { noIndex: true });
    return jsonResponse(vendor, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor settings get] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const body = await request.json();
    const patch: Record<string, any> = {};
    if (typeof body?.name === 'string') patch.name = body.name;
    if (typeof body?.email === 'string') patch.email = body.email;
    if (typeof body?.portalEmail === 'string') patch['portalAccess.email'] = body.portalEmail;
    await sanity.patch(ctx.vendorId).set(patch).commit();
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor settings put] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
