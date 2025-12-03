import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const query = `*[_type == "vendorNotification" && vendor._ref == $vendorId] | order(createdAt desc)[0...50]{
      _id,
      type,
      title,
      message,
      link,
      read,
      createdAt
    }`;
    const notifications = await sanity.fetch(query, { vendorId: ctx.vendorId });
    return jsonResponse({ notifications }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor notifications] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const patchAll = ids.length
      ? ids.map((id) => sanity.patch(id).set({ read: true }))
      : [sanity.patch({ query: '*[_type == "vendorNotification" && vendor._ref == $vendorId && read != true]', params: { vendorId: ctx.vendorId } }).set({ read: true })];
    const tx = sanity.transaction();
    patchAll.forEach((p) => tx.patch(p));
    await tx.commit();
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor notifications mark read] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
