import { sanity } from '@/lib/sanity-utils';

const ime = (typeof import.meta !== 'undefined' ? ((import.meta as any).env as Record<string, string | undefined>) : {}) ?? {};
const penv = (typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {}) ?? {};

const SHIPENGINE_API_KEY = penv.SHIPENGINE_API_KEY || ime.SHIPENGINE_API_KEY || '';
const SHIPENGINE_BASE = ime.SHIPENGINE_BASE || penv.SHIPENGINE_BASE || 'https://api.shipengine.com/v1';

const parseBoolean = (value?: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['1', 'true', 'yes', 'y', 'on', 'enabled', 'enable'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off', 'disabled', 'disable'].includes(normalized)) return false;
  }
  return Boolean(value);
};

const ALLOW_USPS = parseBoolean(penv.ALLOW_USPS ?? ime.ALLOW_USPS ?? false);

let cachedCarrierIds: string[] | null = null;

const looksLikeCarrierId = (value?: string | null) => {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  return /^se-/.test(v) || /^car_/.test(v) || /^[0-9a-f-]{16,}$/i.test(v);
};

const parseCarrierIds = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => looksLikeCarrierId(part));
};

const dedupe = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

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
  installOnly?: boolean;
};

type PackageSpec = {
  weight: { value: number; unit: 'pound' };
  dimensions: { unit: 'inch'; length: number; width: number; height: number };
  sku?: string;
  title?: string;
};

const parseDims = (value?: string | null): { length: number; width: number; height: number } | null => {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9xX.]/g, '').toLowerCase();
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
  const allow = penv.CORS_ALLOW || ime.CORS_ALLOW || '';
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
  length: toNumber(penv.DEFAULT_BOX_LENGTH ?? ime.DEFAULT_BOX_LENGTH, 12),
  width: toNumber(penv.DEFAULT_BOX_WIDTH ?? ime.DEFAULT_BOX_WIDTH, 9),
  height: toNumber(penv.DEFAULT_BOX_HEIGHT ?? ime.DEFAULT_BOX_HEIGHT, 3)
};
const DEFAULT_WEIGHT = toNumber(penv.DEFAULT_BOX_WEIGHT_LB ?? ime.DEFAULT_BOX_WEIGHT_LB, 2);

const sanitizeAlpha = (value?: string | null): string =>
  String(value ?? '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();

const COUNTRY_NAME_MAP: Record<string, string> = {
  UNITEDSTATES: 'US',
  UNITEDSTATE: 'US',
  UNITEDSTATESOFAMERICA: 'US',
  USA: 'US',
  CANADA: 'CA',
  MEXICO: 'MX'
};

const STATE_NAME_MAP: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  DISTRICTOFCOLUMBIA: 'DC',
  WASHINGTONDC: 'DC',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  NEWHAMPSHIRE: 'NH',
  NEWJERSEY: 'NJ',
  NEWMEXICO: 'NM',
  NEWYORK: 'NY',
  NORTHCAROLINA: 'NC',
  NORTHDAKOTA: 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  RHODEISLAND: 'RI',
  SOUTHCAROLINA: 'SC',
  SOUTHDAKOTA: 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  WESTVIRGINIA: 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
  AMERICANSAMOA: 'AS',
  GUAM: 'GU',
  NORTHERNMARIANAISLANDS: 'MP',
  PUERTORICO: 'PR',
  VIRGINISLANDS: 'VI',
  USVIRGINISLANDS: 'VI',
  ALBERTA: 'AB',
  BRITISHCOLUMBIA: 'BC',
  MANITOBA: 'MB',
  NEWBRUNSWICK: 'NB',
  NEWFOUNDLANDANDLABRADOR: 'NL',
  NEWFOUNDLAND: 'NL',
  NOVASCOTIA: 'NS',
  NORTHWESTTERRITORIES: 'NT',
  NUNAVUT: 'NU',
  ONTARIO: 'ON',
  PRINCEEDWARDISLAND: 'PE',
  QUEBEC: 'QC',
  SASKATCHEWAN: 'SK',
  YUKON: 'YT'
};

const normalizeCountryCode = (value?: string | null, fallback = 'US'): string => {
  const primary = sanitizeAlpha(value);
  if (!primary) {
    const fallbackValue = sanitizeAlpha(fallback);
    return fallbackValue.length >= 2 ? fallbackValue.slice(0, 2) : 'US';
  }
  if (primary.length === 2) return primary;
  const mapped = COUNTRY_NAME_MAP[primary];
  if (mapped) return mapped;
  if (primary.length > 2) return primary.slice(0, 2);
  const fallbackValue = sanitizeAlpha(fallback);
  return fallbackValue.length >= 2 ? fallbackValue.slice(0, 2) : 'US';
};

const normalizeStateCode = (value?: string | null): string => {
  const cleaned = sanitizeAlpha(value);
  if (!cleaned) return '';
  if (cleaned.length === 2) return cleaned;
  const mapped = STATE_NAME_MAP[cleaned];
  if (mapped) return mapped;
  return cleaned.length > 2 ? cleaned.slice(0, 2) : '';
};

const SHIP_FROM = {
  name: penv.ORIGIN_NAME || ime.ORIGIN_NAME || 'FAS Motorsports',
  phone: penv.ORIGIN_PHONE || ime.ORIGIN_PHONE || '000-000-0000',
  address_line1: penv.ORIGIN_ADDRESS1 || ime.ORIGIN_ADDRESS1 || '123 Business Rd',
  address_line2: penv.ORIGIN_ADDRESS2 || ime.ORIGIN_ADDRESS2 || undefined,
  city_locality: penv.ORIGIN_CITY || ime.ORIGIN_CITY || 'Las Vegas',
  state_province: normalizeStateCode(penv.ORIGIN_STATE || ime.ORIGIN_STATE || 'NV') || 'NV',
  postal_code: penv.ORIGIN_POSTAL || ime.ORIGIN_POSTAL || '89101',
  country_code: normalizeCountryCode(penv.ORIGIN_COUNTRY || ime.ORIGIN_COUNTRY || 'US')
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

const listCarrierIds = async (): Promise<string[]> => {
  if (!SHIPENGINE_API_KEY) return [];
  try {
    const res = await fetch(`${SHIPENGINE_BASE}/carriers`, {
      method: 'GET',
      headers: { 'API-Key': SHIPENGINE_API_KEY }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ShipEngine carriers error ${res.status}: ${text}`);
    }
    const data = await res.json();
    const carriers = Array.isArray(data) ? data : Array.isArray(data?.carriers) ? data.carriers : [];
    if (Array.isArray(carriers)) {
      return carriers
        .filter((carrier: any) => {
          const code = String(carrier?.carrier_code || carrier?.carrierCode || '').toLowerCase();
          const name = String(carrier?.friendly_name || carrier?.friendlyName || '').toLowerCase();
          return !code.includes('usps') && !name.includes('usps');
        })
        .map((carrier: any) => String(carrier?.carrier_id || carrier?.carrierId || '').trim())
        .filter((id) => looksLikeCarrierId(id));
    }
    return [];
  } catch (err) {
    console.error('[shipping] Failed to list ShipEngine carriers', err);
    return [];
  }
};

const resolveCarrierIds = async (): Promise<string[]> => {
  const envCarrierIds = [
    ...parseCarrierIds(penv.SHIPENGINE_CARRIER_IDS),
    ...parseCarrierIds(ime.SHIPENGINE_CARRIER_IDS)
  ];

  const singleCarrierIds = [penv.SHIPENGINE_CARRIER_ID, ime.SHIPENGINE_CARRIER_ID, penv.DEFAULT_SHIPENGINE_CARRIER_ID, ime.DEFAULT_SHIPENGINE_CARRIER_ID]
    .filter((value): value is string => Boolean(value && typeof value === 'string'))
    .map((value) => value.trim())
    .filter((value) => looksLikeCarrierId(value));

  const explicit = dedupe([...envCarrierIds, ...singleCarrierIds]).filter(
    (value) => !value.toLowerCase().includes('usps')
  );
  if (explicit.length) return explicit;

  if (cachedCarrierIds) return cachedCarrierIds;

  const fetched = await listCarrierIds();
  cachedCarrierIds = dedupe(fetched);
  if (!cachedCarrierIds.length) {
    return [];
  }
  return cachedCarrierIds;
};

const isUspsRate = (rate: ShippingRate): boolean => {
  const fields = [
    rate.carrierId,
    rate.carrier,
    rate.serviceCode,
    rate.service,
    rate.serviceName
  ];
  return fields.some((value) => String(value || '').toLowerCase().includes('usps'));
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

  const normalizedCountry = normalizeCountryCode(destination.country);
  const normalizedState = normalizeStateCode(destination.state);

  if (!normalizedState) {
    return {
      success: false,
      freight: false,
      rates: [],
      packages: [],
      missing: [],
      message: 'Invalid state or province.'
    };
  }

  const ids = cart.map((item) => String(item.id));
  const products = await fetchProductsByIds(ids);

  const packages: PackageSpec[] = [];
  const missing: string[] = [];
  let totalWeight = 0;
  let maxDimension = 0;
  let freight = false;
  let installOnly = false;
  let shippableQuantity = 0;

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
    if (!product) {
      missing.push(String(item.id));
    }

    const shipsAlone = Boolean(data?.shipsAlone || product?.shipsAlone);
    const shippingClassRaw = (data?.shippingClass || product?.shippingClass || '').toLowerCase();
    const normalizedClass = shippingClassRaw.replace(/[\s_-]+/g, '');

    if (normalizedClass === 'freight') freight = true;
    if (normalizedClass === 'installonly') {
      installOnly = true;
      continue;
    }

    shippableQuantity += quantity;

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

  if (!packages.length && installOnly && shippableQuantity === 0) {
    return {
      success: true,
      freight: false,
      installOnly: true,
      rates: [],
      packages: [],
      missing,
      message: 'Selected products are install-only and do not require shipping.'
    };
  }

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
    state_province: normalizedState,
    postal_code: destination.postalCode,
    country_code: normalizedCountry
  };

  const carrierIds = await resolveCarrierIds();
  const payload: Record<string, any> = {
    shipment: {
      validate_address: 'no_validation',
      ship_from: SHIP_FROM,
      ship_to: shipTo,
      packages
    }
  };

  if (carrierIds.length) {
    payload.rate_options = { carrier_ids: carrierIds.slice(0, 10) };
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
    let data: any;
    try {
      data = await shipEngineFetch('/rates', payload);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : String(err);
      const carrierIdsInPayload = payload.rate_options?.carrier_ids;
      const carrierIdError =
        Array.isArray(carrierIdsInPayload) &&
        carrierIdsInPayload.length > 0 &&
        /carrier[_-]?id/i.test(message) &&
        /not\s+found/i.test(message);
      if (carrierIdError) {
        cachedCarrierIds = [];
        console.warn(
          '[shipping] ShipEngine rejected provided carrier_ids. Retrying without explicit carrier selection.'
        );
        const fallbackPayload = { ...payload };
        delete fallbackPayload.rate_options;
        data = await shipEngineFetch('/rates', fallbackPayload);
      } else {
        throw err;
      }
    }
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
      .filter((rate: ShippingRate) => {
        const serviceCode = String(rate.serviceCode || '').toLowerCase();
        const serviceLabel = `${rate.service || ''} ${rate.serviceName || ''}`.toLowerCase();
        const isMediaMail =
          serviceCode.includes('media_mail') || serviceLabel.includes('media mail');
        const isGlobalPost =
          serviceCode.includes('globalpost') || serviceLabel.includes('global post');

        if (isMediaMail || isGlobalPost) return false;

        if (!ALLOW_USPS && isUspsRate(rate)) return false;

        return Number.isFinite(rate.amount) && rate.amount >= 0;
      });

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
