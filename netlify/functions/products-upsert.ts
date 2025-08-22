import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const { _id, title, sku, price, featured = false, categoryIds = [], imageAssetId } = body;
    if (!title || typeof price !== 'number') return { statusCode: 400, body: 'Missing fields' };

    const doc: any = {
      _type: 'product',
      title,
      sku,
      price,
      featured: !!featured,
      categories: categoryIds.map((id: string) => ({ _type: 'reference', _ref: id }))
    };
    if (imageAssetId)
      doc.image = { _type: 'image', asset: { _type: 'reference', _ref: imageAssetId } };

    const result = _id ? await sanity.patch(_id).set(doc).commit() : await sanity.create(doc);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
