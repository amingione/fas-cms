import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

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
  void request;
  return jsonResponse(
    {
      message:
        'Direct vendor return creation in Sanity is disabled. Create returns through Medusa/fas-dash workflows.',
    },
    { status: 410 },
    { noIndex: true }
  );
};
