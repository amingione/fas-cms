import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const contentType = event.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) return { statusCode: 400, body: 'Send raw image bytes' };
    const buffer = Buffer.from(event.body || '', 'base64'); // Netlify -> base64
    const asset = await sanity.assets.upload('image', buffer, { contentType });
    return {
      statusCode: 200,
      body: JSON.stringify({ assetId: asset._id, url: (asset as any).url })
    };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Upload failed' };
  }
};
