import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  const id = params.id;
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
  try {
    const body = await request.json();
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
