import { sanity } from '@/lib/sanity-utils';

const SHIPENGINE_API_KEY = process.env.SHIPENGINE_API_KEY || '';
const SHIPENGINE_BASE = 'https://api.shipengine.com/v1';

const looksLikeCarrierId = (value?: string | null) => {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  return /^se-/.test(v) || /^car_/.test(v) || /^[0-9a-f-]{16,}$/i.test(v);
};

export type CartItemInput = {
  id: string;
  quantity?: number;
};

export type Destination = {
  name?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type ShippingRate = {
  carrierId?: string;
  carrier?: string;
  serviceCode?: string;
  service?: string;
  serviceName?: string; // legacy support
  amount: number;
  currency: string;
  deliveryDays?: number | null;
  estimatedDeliveryDate?: string | null;
};

export type ShippingQuoteResult = {
  success: boolean;
  freight: boolean;
  rates: ShippingRate[];
  bestRate?: ShippingRate;
  packages: PackageSpec[];
  missing: string[];
  message?: string;
};

type PackageSpec = {
  weight: { value: number; unit: 'pound' };
  dimensions: { unit: 'inch'; length: number; width: number; height: number };
  sku?: string;
  title?: string;
};

const parseDims = (value?: string | null): { length: number; width: number; height: number } | null => {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9xX\.]/g, '').toLowerCase();
  const parts = cleaned.split(/x/).map((part) => Number(part));
  if (parts.length >= 3 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    const [length, width, height] = parts;
    return { length, width, height };
  }
  return null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const getAllowedOrigins = () => {
  const allow = process.env.CORS_ALLOW || '';
  return allow
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export function buildCorsHeaders(origin?: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const match = origin && allowed.find((a) => a === '*' || a.toLowerCase() === origin.toLowerCase());
  if (!match) return {};
  return {
    'access-control-allow-origin': match === '*' ? '*' : match,
    'access-control-allow-headers': 'content-type'
  };
}

type SanityProduct = {
  _id: string;
  title?: string;
  sku?: string;
  shippingWeight?: number;
  boxDimensions?: string;
  shipsAlone?: boolean;
  shippingClass?: string;
  variants?: Array<{
    _id?: string;
    _key?: string;
    id?: string;
    title?: string;
    sku?: string;
    shippingWeight?: number;
    boxDimensions?: string;
    shipsAlone?: boolean;
    shippingClass?: string;
  }>;
};

const fetchProductsByIds = async (ids: string[]): Promise<SanityProduct[]> => {
  if (!sanity) return [];
  const query = `*[_type == "product" && (
    _id in $ids ||
    count(variants[@._id in $ids || @.id in $ids || @._key in $ids]) > 0
  )]{
    _id,
    title,
    sku,
    shippingWeight,
    boxDimensions,
    shipsAlone,
    shippingClass,
    variants[]{
      _id,
      _key,
      id,
      title,
      sku,
      shippingWeight,
      boxDimensions,
      shipsAlone,
      shippingClass
    }
  }`;
  try {
    return await sanity.fetch<SanityProduct[]>(query, { ids });
  } catch (err) {
    console.error('[shipping] Failed to fetch products', err);
    return [];
  }
};

const DEFAULT_DIMS = {
  length: toNumber(process.env.DEFAULT_BOX_LENGTH, 12),
  width: toNumber(process.env.DEFAULT_BOX_WIDTH, 9),
  height: toNumber(process.env.DEFAULT_BOX_HEIGHT, 3)
};
const DEFAULT_WEIGHT = toNumber(process.env.DEFAULT_BOX_WEIGHT_LB, 2);

const SHIP_FROM = {
  name: process.env.ORIGIN_NAME || 'FAS Motorsports',
  phone: process.env.ORIGIN_PHONE || '000-000-0000',
  address_line1: process.env.ORIGIN_ADDRESS1 || '123 Business Rd',
  address_line2: process.env.ORIGIN_ADDRESS2 || undefined,
  city_locality: process.env.ORIGIN_CITY || 'Las Vegas',
  state_province: process.env.ORIGIN_STATE || 'NV',
  postal_code: process.env.ORIGIN_POSTAL || '89101',
  country_code: ((process.env.ORIGIN_COUNTRY || 'US') || 'US').toUpperCase()
};

const shipEngineFetch = async (path: string, body: any) => {
  if (!SHIPENGINE_API_KEY) throw new Error('ShipEngine API key not configured');
  const res = await fetch(`${SHIPENGINE_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Key': SHIPENGINE_API_KEY
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ShipEngine error ${res.status}: ${text}`);
  }
  return res.json();
};

export async function computeShippingQuote(
  cart: CartItemInput[],
  destination: Destination
): Promise<ShippingQuoteResult> {
  if (!Array.isArray(cart) || !cart.length) {
    return {
      success: false,
      freight: false,
      rates: [],
      packages: [],
      missing: [],
      message: 'Cart is empty.'
    };
  }

  const requiredFields: Array<keyof Destination> = ['addressLine1', 'city', 'state', 'postalCode'];
  for (const field of requiredFields) {
    if (!destination[field]) {
      return {
        success: false,
        freight: false,
        rates: [],
        packages: [],
        missing: [],
        message: `Missing destination.${field}`
      };
    }
  }

  const ids = cart.map((item) => String(item.id));
  const products = await fetchProductsByIds(ids);

  const packages: PackageSpec[] = [];
  const missing: string[] = [];
  let totalWeight = 0;
  let maxDimension = 0;
  let freight = false;

  const findProductData = (cartId: string) => {
    for (const product of products) {
      if (product._id === cartId) {
        return { product, variant: undefined };
      }
      const variant = product.variants?.find(
        (v) => v?._id === cartId || v?.id === cartId || v?._key === cartId
      );
      if (variant) return { product, variant };
    }
    return { product: undefined, variant: undefined };
  };

  for (const item of cart) {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const { product, variant } = findProductData(String(item.id));

    const data = variant || product;
    const sku = (variant?.sku || product?.sku || item.id) as string;
    const title = variant?.title || product?.title;
    const dims = parseDims(data?.boxDimensions) || DEFAULT_DIMS;
    const weight = Math.max(0.1, toNumber(data?.shippingWeight, DEFAULT_WEIGHT));
    const shipsAlone = Boolean(data?.shipsAlone || product?.shipsAlone);
    const shippingClass = (data?.shippingClass || product?.shippingClass || '').toLowerCase();

    if (!product) {
      missing.push(String(item.id));
    }

    if (shippingClass === 'freight') freight = true;

    maxDimension = Math.max(maxDimension, dims.length, dims.width, dims.height);
    totalWeight += weight * quantity;

    const buildPkg = (): PackageSpec => ({
      weight: { value: weight, unit: 'pound' },
      dimensions: { unit: 'inch', length: dims.length, width: dims.width, height: dims.height },
      sku,
      title
    });

    if (shipsAlone) {
      for (let i = 0; i < quantity; i++) packages.push(buildPkg());
    } else {
      for (let i = 0; i < quantity; i++) packages.push(buildPkg());
    }
  }

  if (totalWeight >= 150 || maxDimension >= 60) freight = true;

  if (freight) {
    return {
      success: true,
      freight: true,
      packages,
      rates: [],
      missing,
      message: 'Freight required due to weight or dimensions.'
    };
  }

  const shipTo = {
    name: destination.name || '',
    phone: destination.phone || '',
    address_line1: destination.addressLine1,
    address_line2: destination.addressLine2 || undefined,
    city_locality: destination.city,
    state_province: destination.state,
    postal_code: destination.postalCode,
    country_code: (destination.country || 'US').toUpperCase()
  };

  const carrierId = process.env.SHIPENGINE_CARRIER_ID || process.env.DEFAULT_SHIPENGINE_CARRIER_ID;
  const payload: Record<string, any> = {
    shipment: {
      validate_address: 'no_validation',
      ship_from: SHIP_FROM,
      ship_to: shipTo,
      packages
    }
  };

  if (looksLikeCarrierId(carrierId)) {
    payload.rate_options = { carrier_ids: [carrierId] };
  }

  if (!SHIP_FROM.postal_code || !SHIP_FROM.city_locality) {
    return {
      success: false,
      freight: false,
      rates: [],
      packages,
      missing,
      message: 'Shipping origin (postal code and city) is not configured.'
    };
  }

  try {
    const data = await shipEngineFetch('/rates', payload);
    const rawRates = Array.isArray(data) ? data : data?.rate_response?.rates || [];
    const normalized: ShippingRate[] = rawRates
      .map((rate: any) => {
        const amount = Number(rate?.shipping_amount?.amount ?? rate?.amount ?? 0);
        return {
          carrierId: rate?.carrier_id || rate?.carrierId || undefined,
          carrier: rate?.carrier_friendly_name || rate?.carrier || undefined,
          serviceCode: rate?.service_code || rate?.serviceCode || undefined,
          service:
            rate?.service ||
            rate?.service_name ||
            rate?.serviceCode ||
            rate?.service_code ||
            rate?.service_type ||
            undefined,
          serviceName:
            rate?.service ||
            rate?.service_name ||
            rate?.serviceCode ||
            rate?.service_code ||
            rate?.service_type ||
            undefined,
          amount,
          currency: (rate?.shipping_amount?.currency || rate?.currency || 'USD').toUpperCase(),
          deliveryDays: rate?.delivery_days ?? rate?.deliveryDays ?? null,
          estimatedDeliveryDate:
            rate?.estimated_delivery_date || rate?.estimatedDeliveryDate || null
        } as ShippingRate;
      })
      .filter((rate: ShippingRate) => Number.isFinite(rate.amount) && rate.amount >= 0);

    normalized.sort((a, b) => a.amount - b.amount);

    return {
      success: true,
      freight: false,
      rates: normalized,
      bestRate: normalized[0],
      packages,
      missing
    };
  } catch (err: any) {
    console.error('[shipping] ShipEngine request failed', err);
    return {
      success: false,
      freight: false,
      rates: [],
      packages,
      missing,
      message: err?.message || 'Failed to fetch shipping rates.'
    };
  }
}
