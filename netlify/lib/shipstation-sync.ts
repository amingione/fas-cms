import type { SanityClient } from '@sanity/client';
import { createShippingSanityClient, shipStationRequest } from './shipstation';

type ShippingAddress = {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type OrderLineItem = {
  _key?: string;
  id?: string;
  sku?: string;
  name?: string;
  price?: number | string | null;
  quantity?: number | string | null;
  image?: string;
  imageUrl?: string;
  productUrl?: string;
  metadata?: Record<string, unknown> | null;
};

type ShipStationOrderResponse = {
  orderId?: number | string;
  orderID?: number | string;
  orderKey?: string;
  orderNumber?: string;
  [key: string]: unknown;
};

type SanityOrderForSync = {
  _id: string;
  orderNumber?: string;
  stripeSessionId?: string;
  shippingAddress?: ShippingAddress | null;
  customerEmail?: string;
  customerName?: string;
  cart?: OrderLineItem[];
  status?: string;
  createdAt?: string;
  _createdAt?: string;
  orderDate?: string;
  amountSubtotal?: number | null;
  amountTax?: number | null;
  amountShipping?: number | null;
  totalAmount?: number | null;
  selectedShippingAmount?: number | null;
  selectedShippingCurrency?: string | null;
  shippingServiceCode?: string | null;
  shippingServiceName?: string | null;
  shippingCarrier?: string | null;
  shippingMetadata?: Record<string, string> | null;
  selectedService?: {
    carrier?: string;
    service?: string;
    serviceCode?: string;
  } | null;
  shipStationOrderId?: string | null;
  shipStationOrderKey?: string | null;
  shipStationOrderNumber?: string | null;
  shipStationSyncedAt?: string | null;
};

type ShipStationOrderPayload = {
  orderNumber: string;
  orderKey?: string;
  orderDate?: string;
  orderStatus: 'awaiting_shipment' | string;
  amountPaid?: number;
  taxAmount?: number;
  shippingAmount?: number;
  customerEmail?: string;
  customerUsername?: string;
  billTo?: ShipStationAddressPayload;
  shipTo: ShipStationAddressPayload;
  items: ShipStationLineItem[];
  carrierCode?: string;
  serviceCode?: string;
  confirmation?: string;
  externallyFulfilled?: boolean;
  advancedOptions: {
    storeId?: number;
    customField1?: string;
    customField2?: string;
    customField3?: string;
    [key: string]: unknown;
  };
};

type ShipStationAddressPayload = {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  residential?: boolean;
};

type ShipStationLineItem = {
  lineItemKey?: string;
  sku?: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  adjustment?: boolean;
  options?: Array<{ name: string; value: string }>;
};

type SyncOptions = {
  orderId: string;
  sanityClient?: SanityClient;
  force?: boolean;
  dryRun?: boolean;
};

export type ShipStationSyncResult = {
  ok: boolean;
  orderId: string;
  shipStationOrderId?: string;
  shipStationOrderNumber?: string;
  shipStationOrderKey?: string;
  skipped?: boolean;
  reason?: string;
  payload?: ShipStationOrderPayload;
  response?: ShipStationOrderResponse;
};

const ORDER_SYNC_QUERY = `
  *[_type == "order" && _id == $id][0]{
    _id,
    orderNumber,
    stripeSessionId,
    orderDate,
    createdAt,
    _createdAt,
    status,
    shippingAddress,
    customerEmail,
    customerName,
    cart[]{
      _key,
      id,
      sku,
      name,
      price,
      quantity,
      image,
      imageUrl,
      productUrl,
      metadata
    },
    amountSubtotal,
    amountTax,
    amountShipping,
    totalAmount,
    selectedShippingAmount,
    selectedShippingCurrency,
    shippingServiceCode,
    shippingServiceName,
    shippingCarrier,
    shippingMetadata,
    selectedService,
    shipStationOrderId,
    shipStationOrderKey,
    shipStationOrderNumber,
    shipStationSyncedAt
  }
`;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === 'bigint') return Number(value);
  return undefined;
};

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return undefined;
};

const normalizeAddress = (address?: ShippingAddress | null): ShipStationAddressPayload => {
  if (!address || typeof address !== 'object') return {};
  const country =
    typeof address.country === 'string' && address.country.trim()
      ? address.country.trim().toUpperCase()
      : 'US';
  return {
    name: toStringOrUndefined(address.name) || undefined,
    company: toStringOrUndefined(address.company) || undefined,
    phone: toStringOrUndefined(address.phone) || undefined,
    email: toStringOrUndefined(address.email) || undefined,
    street1: toStringOrUndefined(address.addressLine1) || undefined,
    street2: toStringOrUndefined(address.addressLine2) || undefined,
    city: toStringOrUndefined(address.city) || undefined,
    state: toStringOrUndefined(address.state) || undefined,
    postalCode: toStringOrUndefined(address.postalCode) || undefined,
    country,
    residential: true
  };
};

const normalizeLineItemOptions = (metadata?: Record<string, unknown> | null) => {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const entries = Object.entries(metadata).reduce<Array<{ name: string; value: string }>>(
    (acc, [key, value]) => {
      const name = toStringOrUndefined(key);
      const val = toStringOrUndefined(value);
      if (name && val) acc.push({ name, value: val });
      return acc;
    },
    []
  );
  return entries.length ? entries : undefined;
};

const normalizeLineItems = (items?: OrderLineItem[] | null): ShipStationLineItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const quantity = toNumber(item.quantity) ?? 1;
      const unitPrice = toNumber(item.price) ?? 0;
      const name = toStringOrUndefined(item.name) || `Item ${index + 1}`;
      return {
        lineItemKey: toStringOrUndefined(item._key) || toStringOrUndefined(item.id),
        sku: toStringOrUndefined(item.sku) || toStringOrUndefined(item.id),
        name,
        imageUrl: toStringOrUndefined(item.imageUrl) || toStringOrUndefined(item.image),
        quantity: Math.max(1, Math.round(quantity)),
        unitPrice,
        adjustment: false,
        options: normalizeLineItemOptions(item.metadata || undefined)
      } satisfies ShipStationLineItem;
    })
    .filter((item) => Number.isFinite(item.unitPrice) && Number.isFinite(item.quantity));
};

const resolveOrderNumber = (order: SanityOrderForSync): string => {
  if (order.orderNumber && order.orderNumber.trim()) return order.orderNumber.trim();
  const numericId = order._id.slice(-6).toUpperCase();
  const created =
    order.orderDate || order.createdAt || order._createdAt || new Date().toISOString();
  const stamp = new Date(created).toISOString().slice(0, 10).replace(/-/g, '');
  return `SANITY-${stamp}-${numericId}`;
};

const resolveOrderDate = (order: SanityOrderForSync): string | undefined => {
  const candidates = [order.orderDate, order.createdAt, order._createdAt];
  for (const value of candidates) {
    if (value && !Number.isNaN(Date.parse(value))) {
      return new Date(value).toISOString();
    }
  }
  return undefined;
};

const normalizeCarrierCode = (order: SanityOrderForSync): string | undefined => {
  const carrierSources = [
    order.shippingMetadata?.shipping_carrier,
    order.shippingMetadata?.carrier,
    order.shippingCarrier,
    order.selectedService?.carrier
  ];
  for (const source of carrierSources) {
    if (!source) continue;
    const normalized = source.toLowerCase();
    if (normalized.includes('fedex')) return 'fedex';
    if (normalized.includes('ups')) return 'ups';
    if (normalized.includes('usps') || normalized.includes('postal')) return 'usps';
    if (normalized.includes('dhl')) return 'dhl_express';
    if (normalized.includes('ontrac')) return 'ontrac';
  }
  return undefined;
};

const resolveServiceCode = (order: SanityOrderForSync): string | undefined => {
  const candidates = [
    order.shippingMetadata?.shipping_service_code,
    order.shippingMetadata?.service_code,
    order.shippingServiceCode,
    order.selectedService?.serviceCode,
    order.selectedService?.service
  ];
  for (const entry of candidates) {
    if (!entry) continue;
    const trimmed = entry.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
};

const resolveServiceName = (order: SanityOrderForSync): string | undefined => {
  const candidates = [
    order.shippingMetadata?.shipping_service_name,
    order.shippingMetadata?.shipping_service,
    order.shippingServiceName,
    order.selectedService?.service
  ];
  for (const entry of candidates) {
    if (!entry) continue;
    const trimmed = entry.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
};

const resolveShippingAmount = (order: SanityOrderForSync): number | undefined => {
  const candidates = [
    order.selectedShippingAmount,
    order.amountShipping,
    toNumber(order.shippingMetadata?.shipping_amount)
  ];
  for (const value of candidates) {
    const number = toNumber(value);
    if (typeof number === 'number' && Number.isFinite(number)) {
      return number;
    }
  }
  return undefined;
};

const buildOrderPayload = (order: SanityOrderForSync): ShipStationOrderPayload | null => {
  const shipTo = normalizeAddress(order.shippingAddress);
  if (!shipTo.street1 || !shipTo.city || !shipTo.state || !shipTo.postalCode) {
    return null;
  }

  const items = normalizeLineItems(order.cart);
  if (!items.length) return null;

  const orderNumber = resolveOrderNumber(order);
  const orderDate = resolveOrderDate(order);
  const carrierCode = normalizeCarrierCode(order);
  const serviceCode = resolveServiceCode(order);
  const serviceName = resolveServiceName(order);
  const shippingAmount = resolveShippingAmount(order);
  const taxAmount = toNumber(order.amountTax);
  const amountPaid = toNumber(order.totalAmount);

  const advancedOptions: ShipStationOrderPayload['advancedOptions'] = {
    customField1: order._id,
    customField2: order.stripeSessionId,
    customField3: serviceName
  };

  return {
    orderNumber,
    orderKey: order.stripeSessionId || order._id,
    orderDate,
    orderStatus: 'awaiting_shipment',
    amountPaid: typeof amountPaid === 'number' ? amountPaid : undefined,
    taxAmount: typeof taxAmount === 'number' ? taxAmount : undefined,
    shippingAmount: typeof shippingAmount === 'number' ? shippingAmount : undefined,
    customerEmail: order.customerEmail || shipTo.email,
    customerUsername: order.customerEmail || shipTo.email,
    billTo: shipTo,
    shipTo,
    items,
    carrierCode,
    serviceCode,
    advancedOptions
  };
};

const extractResponseOrderId = (response: ShipStationOrderResponse | undefined): string | undefined => {
  if (!response) return undefined;
  const candidates = [response.orderId, response.orderID];
  for (const candidate of candidates) {
    const value = toStringOrUndefined(candidate);
    if (value) return value;
  }
  return undefined;
};

export async function syncShipStationOrder(options: SyncOptions): Promise<ShipStationSyncResult> {
  const { orderId, sanityClient, force = false, dryRun = false } = options;
  if (!orderId || typeof orderId !== 'string') {
    throw new Error('orderId is required for ShipStation sync');
  }

  const client = sanityClient || createShippingSanityClient();
  const order = (await client.fetch(ORDER_SYNC_QUERY, { id: orderId })) as SanityOrderForSync | null;
  if (!order) {
    return { ok: false, orderId, skipped: true, reason: 'Order not found' };
  }

  if (order.shippingMetadata?.shipping_source === 'install_only') {
    return { ok: true, orderId, skipped: true, reason: 'Install-only order' };
  }

  if (order.shipStationOrderId && !force && order.shipStationSyncedAt) {
    return {
      ok: true,
      orderId,
      shipStationOrderId: order.shipStationOrderId,
      shipStationOrderNumber: order.shipStationOrderNumber || order.orderNumber,
      shipStationOrderKey: order.shipStationOrderKey || order.stripeSessionId || order._id,
      skipped: true,
      reason: 'Order already synced'
    };
  }

  const payload = buildOrderPayload(order);
  if (!payload) {
    return {
      ok: false,
      orderId,
      skipped: true,
      reason: 'Missing shipping address or line items'
    };
  }

  let response: ShipStationOrderResponse | undefined;
  if (!dryRun) {
    response = (await shipStationRequest('/orders/createorder', {
      method: 'POST',
      body: JSON.stringify(payload)
    })) as ShipStationOrderResponse;
  }

  const responseOrderId = extractResponseOrderId(response);
  const responseOrderNumber =
    toStringOrUndefined(response?.orderNumber) || payload.orderNumber || order.orderNumber;
  const responseOrderKey = toStringOrUndefined(response?.orderKey) || payload.orderKey;

  const patch: Record<string, unknown> = {
    shipStationSyncedAt: new Date().toISOString()
  };
  if (responseOrderId) patch.shipStationOrderId = responseOrderId;
  if (responseOrderNumber) patch.shipStationOrderNumber = responseOrderNumber;
  if (responseOrderKey) patch.shipStationOrderKey = responseOrderKey;
  if (payload.carrierCode && !order.shippingCarrier) patch.shippingCarrier = payload.carrierCode;
  if (payload.serviceCode && !order.shippingServiceCode)
    patch.shippingServiceCode = payload.serviceCode;
  if (!order.shippingServiceName) {
    const serviceName = resolveServiceName(order);
    if (serviceName) patch.shippingServiceName = serviceName;
  }

  if (!dryRun && Object.keys(patch).length) {
    await client.patch(orderId).set(patch).commit({ autoGenerateArrayKeys: true });
  }

  return {
    ok: true,
    orderId,
    shipStationOrderId: responseOrderId || order.shipStationOrderId || undefined,
    shipStationOrderNumber: responseOrderNumber || order.orderNumber || undefined,
    shipStationOrderKey: responseOrderKey || order.shipStationOrderKey || undefined,
    skipped: false,
    payload,
    response
  };
}
