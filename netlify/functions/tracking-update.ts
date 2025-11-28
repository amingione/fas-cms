import type { Handler } from '@netlify/functions';
import { handleTrackingUpdate } from './_inventory';

export const handler: Handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing payload' }) };
    }

    const payload = JSON.parse(event.body);
    await handleTrackingUpdate(payload?.result || payload);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error: any) {
    console.error('[tracking-update] failed to process webhook', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process tracking update' }) };
  }
};

export default { handler };
