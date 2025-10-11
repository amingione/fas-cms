import type { Handler } from '@netlify/functions';
import { requireUser } from './_auth';
import { se } from './_shipengine';

const looksLikeCarrierId = (value?: string | null) => {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  return /^se-/.test(v) || /^car_/.test(v) || /^[0-9a-f-]{16,}$/i.test(v);
};

const FALLBACK_CARRIER_IDS: string[] = [
  'se-3809552', // USPS (Stamps.com)
  'se-3809716', // DHL Express
  'se-3809553', // UPS
  'se-3809712', // SEKO LTL
  'se-3809554', // FedEx
  'se-3809713' // GlobalPost
];

const parseCarrierIds = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => looksLikeCarrierId(part));
};

const resolveCarrierIds = (incoming: unknown): string[] => {
  const fromBody = Array.isArray(incoming)
    ? incoming.filter((id) => looksLikeCarrierId(id))
    : parseCarrierIds(typeof incoming === 'string' ? incoming : undefined);
  const envIds = [
    ...parseCarrierIds(process.env.SHIPENGINE_CARRIER_IDS),
    ...parseCarrierIds(process.env.DEFAULT_SHIPENGINE_CARRIER_IDS)
  ];
  const singleIds = [process.env.SHIPENGINE_CARRIER_ID, process.env.DEFAULT_SHIPENGINE_CARRIER_ID]
    .filter((value): value is string => Boolean(value && typeof value === 'string'))
    .map((value) => value.trim())
    .filter((value) => looksLikeCarrierId(value));
  const combined = Array.from(new Set([...fromBody, ...envIds, ...singleIds])).filter(
    (value) => !value.toLowerCase().includes('usps')
  );
  return combined.length ? combined : FALLBACK_CARRIER_IDS;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const body = JSON.parse(event.body || '{}'); // { from, to, packages[] }
    // Minimal example; shape these to your account defaults
    const carrierIds = resolveCarrierIds(body.carrierIds);
    const payload = {
      rate_options: { carrier_ids: carrierIds.slice(0, 10) },
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
