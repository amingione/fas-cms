import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient, type SanityClient } from '@sanity/client';

export interface ShipStationWebhookPayload {
  resource_type?: string;
  resource_type_code?: string;
  resource_id?: number | string;
  resourceId?: number | string;
  resource_url?: string;
  resourceUrl?: string;
  event?: string;
  timestamp?: string;
  data?: Record<string, any> & {
    orderId?: number | string;
    orderKey?: string;
    orderNumber?: string;
    shipmentId?: number | string;
    advancedOptions?: {
      customField1?: string | null;
      customField2?: string | null;
      customField3?: string | null;
    };
  };
  shipmentId?: number | string;
  orderId?: number | string;
  orderKey?: string;
  orderNumber?: string;
  [key: string]: any;
}

export interface ShipStationShipment {
  shipmentId?: number | string;
  orderId?: number | string;
  orderKey?: string;
  orderNumber?: string;
  carrierCode?: string;
  carrierFriendlyName?: string;
  serviceCode?: string;
  serviceName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  weight?: {
    value?: number;
    units?: string;
    unit?: string;
  } | null;
  advancedOptions?: {
    customField1?: string | null;
    customField2?: string | null;
    customField3?: string | null;
  } | null;
  labelUrl?: string;
  labelDownload?: {
    pdf?: string;
    href?: string;
    url?: string;
    zpl?: string;
    png?: string;
  } | null;
  shipmentCost?: {
    amount?: number;
    currency?: string;
  } | null;
  [key: string]: any;
}

const SANITY_PROJECT_ID =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID;

const SANITY_DATASET =
  process.env.SANITY_STUDIO_DATASET ||
  process.env.SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  'production';

const SANITY_API_VERSION = process.env.SANITY_API_VERSION || '2023-06-07';

const SANITY_TOKEN =
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_TOKEN ||
  process.env.VITE_SANITY_API_TOKEN;

export function createShippingSanityClient(
  overrides: Partial<Parameters<typeof createClient>[0]> = {}
): SanityClient {
  if (!SANITY_PROJECT_ID) {
    throw new Error('Missing Sanity project configuration for ShipStation integration');
  }

  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token: SANITY_TOKEN,
    useCdn: false,
    ...overrides
  });
}

const SHIPSTATION_BASE_URL =
  (process.env.SHIPSTATION_API_URL && process.env.SHIPSTATION_API_URL.trim()) ||
  'https://ssapi.shipstation.com';

const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY || '';
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET || '';

export function getShipStationAuthHeader(): string {
  if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
    throw new Error('ShipStation credentials are not configured');
  }
  const token = Buffer.from(`${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text as any;
  }
};

export async function shipStationRequest<T = any>(
  pathOrUrl: string,
  init: RequestInit = {}
): Promise<T> {
  const url = new URL(
    pathOrUrl.startsWith('http') ? pathOrUrl : `${SHIPSTATION_BASE_URL.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`
  );

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', getShipStationAuthHeader());
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`ShipStation request failed (${response.status}): ${payload}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await parseJsonResponse(response)) as T;
}

export async function fetchShipStationResource<T = any>(resource: string): Promise<T> {
  if (!resource) {
    throw new Error('ShipStation resource URL is required');
  }
  const trimmed = resource.trim();
  if (!trimmed) {
    throw new Error('ShipStation resource URL is required');
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return shipStationRequest<T>(trimmed);
  }

  if (trimmed.startsWith('/')) {
    return shipStationRequest<T>(trimmed);
  }

  if (/^(shipments|orders|fulfillments)\//i.test(trimmed)) {
    return shipStationRequest<T>(`/${trimmed}`);
  }

  return shipStationRequest<T>(`/shipments/${trimmed}`);
}

export function resolveResourceUrlFromPayload(payload: ShipStationWebhookPayload): string | null {
  if (!payload) return null;
  const direct =
    payload.resource_url ||
    payload.resourceUrl ||
    (typeof payload.data?.resource_url === 'string' ? payload.data.resource_url : undefined) ||
    (typeof payload.data?.resourceUrl === 'string' ? payload.data.resourceUrl : undefined);
  if (direct && String(direct).trim()) return String(direct).trim();
  const shipmentId =
    payload.shipmentId ||
    payload.resource_id ||
    payload.resourceId ||
    payload.data?.shipmentId ||
    payload.data?.ShipmentID ||
    payload.data?.shipmentID;
  if (shipmentId) {
    return `/shipments/${shipmentId}`;
  }
  return null;
}

export function extractSanityOrderIdFromShipment(shipment: ShipStationShipment): string | null {
  const raw = shipment?.advancedOptions?.customField1;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function extractOrderNumberFromShipment(shipment: ShipStationShipment): string | null {
  const candidate = shipment?.orderNumber || shipment?.orderKey;
  if (!candidate) return null;
  const trimmed = String(candidate).trim();
  return trimmed || null;
}

export async function findOrderIdByOrderNumber(
  client: SanityClient,
  orderNumber: string
): Promise<string | null> {
  const trimmed = orderNumber.trim();
  if (!trimmed) return null;
  try {
    const result = await client.fetch<{ _id?: string } | null>(
      `*[_type == "order" && orderNumber == $orderNumber][0]{ _id }`,
      { orderNumber: trimmed }
    );
    return result?._id || null;
  } catch (error) {
    console.error('Failed to query Sanity for order number', { orderNumber: trimmed, error });
    return null;
  }
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolveWeight = (shipment: ShipStationShipment) => {
  const weight = shipment?.weight || null;
  if (!weight) return null;
  const value = toNumber(weight.value);
  if (value === null) return null;
  const unit =
    (typeof weight.units === 'string' && weight.units.trim()) ||
    (typeof weight.unit === 'string' && weight.unit.trim()) ||
    'ounce';
  return { value, unit };
};

const resolveLabelUrl = (shipment: ShipStationShipment): string | null => {
  const sources = [
    shipment?.labelDownload?.pdf,
    shipment?.labelDownload?.href,
    shipment?.labelDownload?.url,
    shipment?.labelUrl
  ];
  for (const source of sources) {
    if (typeof source === 'string' && source.trim()) {
      return source.trim();
    }
  }
  return null;
};

export const buildOrderPatchFromShipment = (
  shipment: ShipStationShipment
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};

  const carrier =
    shipment.carrierFriendlyName?.trim() || shipment.carrierCode?.trim() || shipment.serviceName?.trim();
  if (carrier) patch.shippingCarrier = carrier;

  const service: Record<string, unknown> = {};
  if (shipment.carrierCode) service.carrier = shipment.carrierCode;
  if (shipment.serviceName) service.service = shipment.serviceName;
  if (shipment.serviceCode) service.serviceCode = shipment.serviceCode;
  const shipmentCostAmount = shipment?.shipmentCost?.amount;
  const shipmentCostCurrency = shipment?.shipmentCost?.currency;
  if (typeof shipmentCostAmount === 'number' && Number.isFinite(shipmentCostAmount)) {
    service.amount = shipmentCostAmount;
  }
  if (typeof shipmentCostCurrency === 'string' && shipmentCostCurrency.trim()) {
    service.currency = shipmentCostCurrency.trim();
  }
  if (Object.keys(service).length) {
    patch.selectedService = service;
  }

  if (shipment.orderId) patch.shipStationOrderId = String(shipment.orderId);
  if (shipment.shipmentId) patch.shipStationLabelId = String(shipment.shipmentId);

  const labelUrl = resolveLabelUrl(shipment);
  if (labelUrl) patch.shippingLabelUrl = labelUrl;

  if (shipment.trackingNumber) {
    patch.trackingNumber = shipment.trackingNumber;
  }

  const trackingUrl =
    (typeof shipment.trackingUrl === 'string' && shipment.trackingUrl.trim()) ||
    (shipment.trackingNumber
      ? `https://www.google.com/search?q=${encodeURIComponent(shipment.trackingNumber)}`
      : null);
  if (trackingUrl) patch.shippingTrackingUrl = trackingUrl;

  const weight = resolveWeight(shipment);
  if (weight) patch.weight = weight;

  return patch;
};

export const buildShippingLogEntry = (
  shipment: ShipStationShipment
): Record<string, unknown> => {
  const carrier = shipment.carrierFriendlyName || shipment.carrierCode || 'Carrier';
  const service = shipment.serviceName || shipment.serviceCode || null;
  const trackingNumber = shipment.trackingNumber;
  const trackingUrl =
    (typeof shipment.trackingUrl === 'string' && shipment.trackingUrl.trim()) ||
    (trackingNumber
      ? `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}`
      : null);
  const labelUrl = resolveLabelUrl(shipment);
  const weight = resolveWeight(shipment);

  const message = service
    ? `ShipStation label created (${carrier} • ${service})`
    : `ShipStation label created (${carrier})`;

  const entry: Record<string, unknown> = {
    _type: 'shippingLogEntry',
    status: 'Label Created',
    message,
    createdAt: new Date().toISOString()
  };

  if (trackingNumber) entry.trackingNumber = trackingNumber;
  if (trackingUrl) entry.trackingUrl = trackingUrl;
  if (labelUrl) entry.labelUrl = labelUrl;
  if (weight) entry.weight = weight;

  return entry;
};

const signatureToBuffer = (signature: string): Buffer | null => {
  const trimmed = signature.trim();
  if (!trimmed) return null;
  try {
    const base64 = Buffer.from(trimmed, 'base64');
    if (base64.length) return base64;
  } catch {
    // ignore
  }
  if (/^[0-9a-f]+$/i.test(trimmed) && trimmed.length % 2 === 0) {
    try {
      return Buffer.from(trimmed, 'hex');
    } catch {
      return null;
    }
  }
  return null;
};

export function isValidShipStationSignature(
  secret: string,
  payload: string,
  providedSignatures: string[]
): boolean {
  if (!secret || !payload || !providedSignatures.length) return false;
  const digest = crypto.createHmac('sha256', secret).update(payload).digest();
  for (const signature of providedSignatures) {
    const buffer = signatureToBuffer(signature);
    if (!buffer) continue;
    if (buffer.length !== digest.length) continue;
    if (crypto.timingSafeEqual(buffer, digest)) return true;
  }
  return false;
}

export function getShipStationSignatureHeaders(headers: Record<string, unknown>): string[] {
  const keys = Object.keys(headers || {});
  const matches: string[] = [];
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (lower === 'x-shipstation-hmac-sha256' || lower === 'x-shipstation-signature') {
      const value = headers[key];
      if (typeof value === 'string' && value.trim()) {
        matches.push(value.trim());
      }
    }
  }
  return matches;
}

export function parseWebhookPayload(rawBody: string): ShipStationWebhookPayload {
  const parsed = JSON.parse(rawBody) as ShipStationWebhookPayload;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid ShipStation payload');
  }
  return parsed;
}
