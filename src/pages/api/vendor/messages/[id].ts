import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import { vendorMessageReplySchema } from '@/lib/validators/api-requests';

export const GET: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  const id = params.id;
  if (!id) {
    return jsonResponse({ message: 'Missing id' }, { status: 400 }, { noIndex: true });
  }
  try {
    const query = `*[_type == "vendorMessage" && _id == $id && vendor._ref == $vendorId][0]{
      _id,
      subject,
      status,
      priority,
      category,
      relatedOrder->{poNumber, _id},
      relatedInvoice->{invoiceNumber, _id},
      attachments[]{asset->{url, originalFilename}},
      replies[] | order(timestamp asc){
        message,
        author,
        authorEmail,
        timestamp,
        isStaff,
        attachments[]{asset->{url, originalFilename}}
      },
      createdAt
    }`;
    const message = await sanity.fetch(query, { id, vendorId: ctx.vendorId });
    if (!message) return jsonResponse({ message: 'Not found' }, { status: 404 }, { noIndex: true });
    return jsonResponse({ message }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor message detail] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  const id = params.id;
  if (!id) {
    return jsonResponse({ message: 'Missing id' }, { status: 400 }, { noIndex: true });
  }
  try {
    const bodyResult = vendorMessageReplySchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorMessageReplySchema',
        context: 'api/vendor/messages/reply',
        identifier: id || 'unknown',
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
    const reply = {
      _type: 'reply',
      message: body?.message || '',
      author: body?.author || 'Vendor',
      authorEmail: ctx.email,
      timestamp: new Date().toISOString(),
      isStaff: false
    };
    const patch = sanity.patch(id).setIfMissing({ replies: [] }).append('replies', [reply]).set({
      lastReplyAt: new Date().toISOString()
    });
    await patch.commit();
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor message reply] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  const id = params.id;
  if (!id) {
    return jsonResponse({ message: 'Missing id' }, { status: 400 }, { noIndex: true });
  }
  try {
    const message = await sanity.fetch(
      `*[_type == "vendorMessage" && _id == $id && vendor._ref == $vendorId][0]{_id}`,
      { id, vendorId: ctx.vendorId }
    );
    if (!message) return jsonResponse({ message: 'Not found' }, { status: 404 }, { noIndex: true });
    await sanity.delete(id);
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor message delete] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
