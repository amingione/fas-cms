import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { vendorReturnCreateSchema } from '@/lib/validators/api-requests';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const returns = await sanity.fetch(
      `*[_type == "vendorReturn" && vendor._ref == $vendorId] | order(createdAt desc){
        _id,
        rmaNumber,
        status,
        reason,
        createdAt,
        refundAmount,
        order->{poNumber}
      }`,
      { vendorId: ctx.vendorId }
    );
    return jsonResponse({ returns }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor returns] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const bodyResult = vendorReturnCreateSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorReturnCreateSchema',
        context: 'api/vendor/returns',
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
    const body = bodyResult.data;
    const rmaNumber = `RMA-${Date.now()}`;
    const doc = await sanity.create({
      _type: 'vendorReturn',
      rmaNumber,
      vendor: { _type: 'reference', _ref: ctx.vendorId },
      order: body?.orderId ? { _type: 'reference', _ref: body.orderId } : undefined,
      reason: body?.reason,
      description: body?.description,
      items: Array.isArray(body?.items) ? body.items : [],
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return jsonResponse({ return: doc }, { status: 201 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor returns create] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
