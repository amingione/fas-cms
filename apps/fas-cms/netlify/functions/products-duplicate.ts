import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const id = (body._id || body.id || '').trim();
    if (!id) return { statusCode: 400, body: 'Missing id' };
    const doc = await sanity.getDocument(id);
    if (!doc) return { statusCode: 404, body: 'Not found' };
    // Remove system fields and generate a new title
    const { _id, _type, _rev, _createdAt, _updatedAt, slug, ...rest } = doc as any;
    const title = ((doc as any).title || 'Untitled') + ' (Copy)';
    // Create new doc, keep references to images/categories etc.
    const created = await sanity.create({ _type: (doc as any)._type || 'product', title, ...rest });
    return { statusCode: 200, body: JSON.stringify(created) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Duplicate failed' };
  }
};

export default { handler };
