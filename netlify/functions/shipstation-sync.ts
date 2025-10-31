import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { syncShipStationOrder } from '../lib/shipstation-sync';
import { createShippingSanityClient } from '../lib/shipstation';

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*'
  },
  body: JSON.stringify(body)
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization'
        },
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method Not Allowed' });
    }

    const host = event.headers.host || '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');

    if (!isLocal) {
      await requireUser(event);
    }

    let body: Record<string, unknown>;
    try {
      body = event.body ? (JSON.parse(event.body) as Record<string, unknown>) : {};
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }

    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) {
      return json(400, { error: 'orderId is required' });
    }

    const force = Boolean(body.force);
    const dryRun = Boolean(body.dryRun);

    const sanityClient = createShippingSanityClient();
    const result = await syncShipStationOrder({ orderId, sanityClient, force, dryRun });
    return json(200, { ok: true, result });
  } catch (error: any) {
    const status = error?.statusCode || 500;
    const message = error?.message || 'ShipStation sync failed';
    console.error('[shipstation-sync] error', message);
    return json(status, { error: message });
  }
};
