import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { se } from './_shipengine';
import { sanity } from './_sanity';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const { orderId, shipment } = JSON.parse(event.body || '{}');
    if (!orderId || !shipment) return { statusCode: 400, body: 'Missing fields' };

    // Create label
    const label = (await se('/labels', {
      method: 'POST',
      body: JSON.stringify({
        label_download: { format: 'pdf', size: '4x6', display_scheme: 'label' },
        shipment
      })
    })) as {
      shipment?: { carrier_code?: string };
      carrier_code?: string;
      tracking_number?: string;
      label_download?: { pdf?: string };
      [key: string]: any;
    };

    // Persist in Sanity order.shipments[]
    const entry = {
      _type: 'shipment',
      carrier: label?.shipment?.carrier_code || label?.carrier_code || '',
      trackingNumber: label?.tracking_number || '',
      labelUrl: label?.label_download?.pdf || '',
      createdAt: new Date().toISOString()
    };

    await sanity
      .patch(orderId)
      .setIfMissing({ shipments: [] })
      .append('shipments', [entry])
      .commit();

    return { statusCode: 200, body: JSON.stringify(entry) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Create failed' };
  }
};
