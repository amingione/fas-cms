import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { se } from './_shipengine';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    requireUser(event);
    const { labelId } = JSON.parse(event.body || '{}');
    if (!labelId) return { statusCode: 400, body: 'Missing labelId' };
    const res = await se(`/labels/${encodeURIComponent(labelId)}/void`, { method: 'PUT' });
    return { statusCode: 200, body: JSON.stringify(res) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Void failed' };
  }
};
