import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const POST: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;

    if (!file || !title) {
      return jsonResponse({ message: 'Missing file or title' }, { status: 400 }, { noIndex: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await sanity.assets.upload('file', buffer, { filename: file.name });

    const doc = await sanity.create({
      _type: 'vendorDocument',
      title,
      description,
      category,
      vendor: { _type: 'reference', _ref: ctx.vendorId },
      file: {
        _type: 'file',
        asset: { _type: 'reference', _ref: asset._id }
      },
      uploadedAt: new Date().toISOString(),
      uploadedBy: ctx.email || ctx.vendorId
    });

    return jsonResponse({ document: doc }, { status: 201 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor document upload] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
