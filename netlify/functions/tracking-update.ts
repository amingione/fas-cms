import type { Handler } from '@netlify/functions';
import { handleTrackingUpdate } from './_inventory';
import { trackingUpdateSchema } from '../../src/lib/validators/api-requests';

export const handler: Handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing payload' }) };
    }

    const payload = JSON.parse(event.body);
    const payloadResult = trackingUpdateSchema.safeParse(payload);
    if (!payloadResult.success) {
      console.error('[validation-failure]', {
        schema: 'trackingUpdateSchema',
        context: 'netlify/tracking-update',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: payloadResult.error.format()
      });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request', details: payloadResult.error.format() })
      };
    }
    await handleTrackingUpdate(payloadResult.data?.result || payloadResult.data);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error: any) {
    console.error('[tracking-update] failed to process webhook', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process tracking update' }) };
  }
};

export default { handler };
