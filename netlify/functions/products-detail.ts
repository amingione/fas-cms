import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const id = (event.queryStringParameters?.id || '').trim();
    if (!id) return { statusCode: 400, body: 'Missing id' };
    const q = `*[_type=="product" && _id==$id][0]{
      _id,
      title,
      sku,
      price,
      featured,
      // support either categories or category field
      "categoryIds": coalesce(categories[]->_id, category[]->_id, []),
      // expose primary image both ways
      "imageUrl": coalesce(images[0].asset->url, image.asset->url, socialImage.asset->url),
      // expose primary asset id if present
      "imageAssetId": coalesce(images[0].asset->_id, image.asset->_id, socialImage.asset->_id),
      // extended editable fields if present
      description,
      shortDescription,
      specifications,
      addOns,
      // seo
      slug,
      metaTitle,
      metaDescription,
      canonicalUrl,
      noindex,
      draft
    }`;
    const data = await sanity.fetch(q, { id });
    if (!data) return { statusCode: 404, body: 'Not found' };
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};

export default { handler };
