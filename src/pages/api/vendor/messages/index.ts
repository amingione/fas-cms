import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { vendorMessageCreateSchema } from '@/lib/validators/api-requests';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const query = `*[_type == "vendorMessage" && vendor._ref == $vendorId] | order(lastReplyAt desc){
      _id,
      subject,
      status,
      priority,
      category,
      createdAt,
      lastReplyAt,
      "lastReply": replies[-1].message,
      "replyCount": count(replies)
    }`;
    const messages = await sanity.fetch(query, { vendorId: ctx.vendorId });
    return jsonResponse({ messages }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor messages] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const bodyResult = vendorMessageCreateSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorMessageCreateSchema',
        context: 'api/vendor/messages',
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
    const doc = {
      _type: 'vendorMessage',
      vendor: { _type: 'reference', _ref: ctx.vendorId },
      subject: body?.subject || 'Message',
      status: 'open',
      priority: body?.priority || 'normal',
      category: body?.category || 'general',
      createdAt: new Date().toISOString(),
      lastReplyAt: new Date().toISOString(),
      replies: [
        {
          message: body?.message || '',
          author: body?.author || 'Vendor',
          authorEmail: ctx.email,
          timestamp: new Date().toISOString(),
          isStaff: false
        }
      ]
    };
    const created = await sanity.create(doc);
    return jsonResponse({ message: created }, { status: 201 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor messages create] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
