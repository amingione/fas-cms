import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { vendorNotificationsUpdateSchema } from '@/lib/validators/api-requests';

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
    const bodyResult = vendorNotificationsUpdateSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorNotificationsUpdateSchema',
        context: 'api/vendor/notifications',
        identifier: ctx.vendorId || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const ids: string[] = Array.isArray(bodyResult.data?.ids) ? bodyResult.data.ids : [];
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
