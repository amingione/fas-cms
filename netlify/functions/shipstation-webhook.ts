import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import {
  buildOrderPatchFromShipment,
  buildShippingLogEntry,
  createShippingSanityClient,
  extractOrderNumberFromShipment,
  extractSanityOrderIdFromShipment,
  fetchShipStationResource,
  findOrderIdByOrderNumber,
  getShipStationSignatureHeaders,
  isValidShipStationSignature,
  parseWebhookPayload,
  resolveResourceUrlFromPayload,
  type ShipStationShipment,
  type ShipStationWebhookPayload
} from '../lib/shipstation';

const allowOrigins = (): string[] => {
  const value = process.env.CORS_ALLOW || '';
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const resolveCorsOrigin = (origin?: string | null): string | null => {
  if (!origin) return null;
  const allowed = allowOrigins();
  if (!allowed.length) return null;
  const match = allowed.find((item) => item === '*' || item.toLowerCase() === origin.toLowerCase());
  return match === '*' ? origin : match || null;
};

const buildCorsHeaders = (origin?: string | null): Record<string, string> => {
  const resolved = resolveCorsOrigin(origin);
  const headers: Record<string, string> = {};
  if (resolved) {
    headers['access-control-allow-origin'] = resolved;
    headers['vary'] = 'Origin';
  }
  return headers;
};

const json = (
  statusCode: number,
  body: unknown,
  headers: Record<string, string>
): { statusCode: number; headers: Record<string, string>; body: string } => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  body: JSON.stringify(body)
});

const normalizeBody = (body: string | null, isBase64Encoded?: boolean): string => {
  if (!body) return '';
  return isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
};

const resolveOrigin = (headers: Record<string, string | undefined>): string | undefined =>
  headers['origin'] || headers['Origin'] || headers['ORIGIN'];

const getRequestId = (): string => randomUUID();

export const handler: Handler = async (event) => {
  const origin = resolveOrigin(event.headers as Record<string, string | undefined>);
  const baseHeaders = buildCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...baseHeaders,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-shipstation-hmac-sha256, x-shipstation-signature'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: baseHeaders,
      body: 'Method Not Allowed'
    };
  }

  const headers = { ...baseHeaders };
  if (headers['access-control-allow-origin']) {
    headers['access-control-allow-headers'] =
      'content-type, x-shipstation-hmac-sha256, x-shipstation-signature';
    headers['access-control-allow-methods'] = 'POST, OPTIONS';
  }
  const requestId = getRequestId();

  try {
    const rawBody = normalizeBody(event.body || '', event.isBase64Encoded);
    if (!rawBody) {
      return json(400, { error: 'Empty payload' }, headers);
    }

    const secret = process.env.SHIPSTATION_WEBHOOK_SECRET;
    if (!secret) {
      console.error('ShipStation webhook secret is not configured');
      return json(500, { error: 'Server misconfiguration' }, headers);
    }

    const signatureHeaders = getShipStationSignatureHeaders(event.headers as Record<string, unknown>);
    if (!signatureHeaders.length) {
      return json(401, { error: 'Missing ShipStation signature' }, headers);
    }

    if (!isValidShipStationSignature(secret, rawBody, signatureHeaders)) {
      return json(401, { error: 'Invalid ShipStation signature' }, headers);
    }

    let payload: ShipStationWebhookPayload;
    try {
      payload = parseWebhookPayload(rawBody);
    } catch (error) {
      console.error('Failed to parse ShipStation webhook payload', { requestId, error });
      return json(400, { error: 'Invalid payload' }, headers);
    }

    const resourceUrl = resolveResourceUrlFromPayload(payload);
    if (!resourceUrl) {
      console.warn('ShipStation webhook missing resource reference', { requestId, payload });
      return json(202, { status: 'ignored', reason: 'Missing resource reference' }, headers);
    }

    const shipment = (await fetchShipStationResource<ShipStationShipment>(resourceUrl)) || {};

    const sanityClient = createShippingSanityClient();
    let sanityOrderId = extractSanityOrderIdFromShipment(shipment);

    if (!sanityOrderId) {
      const orderNumber =
        extractOrderNumberFromShipment(shipment) ||
        (typeof payload.orderNumber === 'string' ? payload.orderNumber : undefined) ||
        (typeof payload.data?.orderNumber === 'string' ? payload.data.orderNumber : undefined);
      if (orderNumber) {
        sanityOrderId = await findOrderIdByOrderNumber(sanityClient, orderNumber);
      }
    }

    if (!sanityOrderId) {
      console.warn('Unable to resolve Sanity order for ShipStation shipment', {
        requestId,
        shipmentId: shipment.shipmentId,
        orderNumber: shipment.orderNumber || payload.orderNumber,
        resourceUrl
      });
      return json(202, { status: 'pending', reason: 'Order not found' }, headers);
    }

    const patchFields = buildOrderPatchFromShipment(shipment);
    const logEntry = buildShippingLogEntry(shipment);

    const patch = sanityClient.patch(sanityOrderId).setIfMissing({ shippingLog: [] });
    if (Object.keys(patchFields).length) {
      patch.set(patchFields);
    }
    if (logEntry) {
      patch.append('shippingLog', [logEntry]);
    }

    await patch.commit({ autoGenerateArrayKeys: true });

    console.info('ShipStation webhook processed', {
      requestId,
      orderId: sanityOrderId,
      shipmentId: shipment.shipmentId,
      resourceUrl
    });

    return json(
      200,
      {
        ok: true,
        orderId: sanityOrderId,
        shipmentId: shipment.shipmentId,
        resourceUrl,
        patched: Object.keys(patchFields)
      },
      headers
    );
  } catch (error: any) {
    console.error('ShipStation webhook failed', { requestId, error });
    return json(error?.statusCode || 500, { error: error?.message || 'Webhook processing failed' }, headers);
  }
};
