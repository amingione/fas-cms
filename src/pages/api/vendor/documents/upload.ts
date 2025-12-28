import type { APIRoute } from 'astro';
import { z } from 'zod';
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

    const payloadResult = z
      .object({
        file: z.instanceof(File),
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        category: z.string().optional().nullable()
      })
      .safeParse({ file, title, description, category });
    if (!payloadResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorDocumentUploadSchema',
        context: 'api/vendor/documents/upload',
        identifier: ctx.vendorId || 'unknown',
        timestamp: new Date().toISOString(),
        errors: payloadResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: payloadResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const { file: validFile, title: validTitle, description: validDescription, category: validCategory } =
      payloadResult.data;

    const buffer = Buffer.from(await validFile.arrayBuffer());
    const asset = await sanity.assets.upload('file', buffer, { filename: validFile.name });

    const doc = await sanity.create({
      _type: 'vendorDocument',
      title: validTitle,
      description: validDescription,
      category: validCategory,
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
