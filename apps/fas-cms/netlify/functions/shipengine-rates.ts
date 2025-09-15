import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { se } from './_shipengine';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const body = JSON.parse(event.body || '{}'); // { from, to, packages[] }
    // Minimal example; shape these to your account defaults
    const payload = {
      rate_options: { carrier_ids: body.carrierIds || undefined },
      shipment: {
        validate_address: 'no_validation',
        ship_from: body.from,
        ship_to: body.to,
        packages: body.packages // [{ weight: { value, unit }, dimensions: { ... } }]
      }
    };
    const data = await se('/rates/estimate', { method: 'POST', body: JSON.stringify(payload) });
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
