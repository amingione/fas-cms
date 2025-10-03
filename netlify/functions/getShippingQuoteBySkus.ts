import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { se } from './_shipengine';

type CartItem = { sku: string; quantity?: number };
type Destination = {
  name?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string; // default US
};

const parseDims = (v?: string | null) => {
  if (!v) return null;
  const s = String(v).replace(/[^0-9xX\.]/g, '').toLowerCase(); // keep numbers and x
  const parts = s.split(/x/).map((p) => Number(p));
  if (parts.length >= 3 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    const [l, w, h] = parts;
    return { length: l, width: w, height: h };
  }
  return null;
};

const num = (x: any, d = 0) => {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const allowOrigin = () => {
  const allow = process.env.CORS_ALLOW || '';
  return allow.split(',').map((s) => s.trim()).filter(Boolean);
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowed = allowOrigin();
  const match = origin && allowed.find((a) => a === '*' || a.toLowerCase() === origin.toLowerCase());
  const h: Record<string, string> = {};
  if (match) {
    h['access-control-allow-origin'] = match === '*' ? '*' : match;
    h['access-control-allow-headers'] = 'content-type';
  }
  return h;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'access-control-allow-methods': 'POST, OPTIONS', ...corsHeaders(event.headers.origin) }, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const headers: Record<string, string> = { 'content-type': 'application/json', ...corsHeaders(event.headers.origin) };

    const body = JSON.parse(event.body || '{}');
    const dest: Destination = body.destination || {};
    const cart: CartItem[] = Array.isArray(body.cart) ? body.cart : [];

    if (!cart.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing cart' }) };
    const requiredDest = ['addressLine1', 'city', 'state', 'postalCode'];
    for (const k of requiredDest) if (!dest[k as keyof Destination]) return { statusCode: 400, headers, body: JSON.stringify({ error: `Missing destination.${k}` }) };

    // Defaults
    const defaultDims = {
      length: num(process.env.DEFAULT_BOX_LENGTH, 12),
      width: num(process.env.DEFAULT_BOX_WIDTH, 9),
      height: num(process.env.DEFAULT_BOX_HEIGHT, 3)
    };
    const defaultWeight = num(process.env.DEFAULT_BOX_WEIGHT_LB, 2); // lbs

    // Origin
    const shipFrom = {
      name: process.env.ORIGIN_NAME || 'FAS Motorsports',
      phone: process.env.ORIGIN_PHONE || '000-000-0000',
      address_line1: process.env.ORIGIN_ADDRESS1 || '123 Business Rd',
      city_locality: process.env.ORIGIN_CITY || 'Las Vegas',
      state_province: process.env.ORIGIN_STATE || 'NV',
      postal_code: process.env.ORIGIN_POSTAL || '89101',
      country_code: process.env.ORIGIN_COUNTRY || 'US'
    };

    const shipTo = {
      name: dest.name || '',
      phone: dest.phone || '',
      address_line1: dest.addressLine1,
      address_line2: dest.addressLine2 || undefined,
      city_locality: dest.city,
      state_province: dest.state,
      postal_code: dest.postalCode,
      country_code: (dest.country || 'US').toUpperCase()
    };

    // Fetch shipping info for SKUs from Sanity
    const skus = cart.map((c) => String(c.sku)).filter(Boolean);
    const q = `*[_type=="product" && defined(sku) && sku in $skus]{
      _id, title, sku, shippingWeight, boxDimensions, shipsAlone, shippingClass
    }`;
    const products: any[] = await sanity.fetch(q, { skus }).catch(() => []);
    const bySku = new Map<string, any>();
    for (const p of products) bySku.set(String(p.sku), p);

    // Build packages
    type Pkg = {
      weight: { value: number; unit: 'pound' };
      dimensions: { unit: 'inch'; length: number; width: number; height: number };
      sku?: string;
      title?: string;
    };
    const packages: Pkg[] = [];
    let totalWeight = 0;
    let maxDim = 0;
    let freight = false;
    let installOnly = false;
    const missing: string[] = [];

    for (const item of cart) {
      const qty = num(item.quantity, 1);
      const p = bySku.get(String(item.sku));
      const shippingClassRaw = String(p?.shippingClass || '').toLowerCase();
      const normalizedClass = shippingClassRaw.replace(/[\s_-]+/g, '');
      const dims = parseDims(p?.boxDimensions) || defaultDims;
      const weight = num(p?.shippingWeight, defaultWeight);

      if (normalizedClass === 'freight') freight = true;
      if (normalizedClass === 'installonly') {
        installOnly = true;
        continue;
      }

      // per-item max dimension
      maxDim = Math.max(maxDim, dims.length, dims.width, dims.height);
      totalWeight += weight * qty;

      const makePkg = (): Pkg => ({
        weight: { value: weight, unit: 'pound' },
        dimensions: { unit: 'inch', length: dims.length, width: dims.width, height: dims.height },
        sku: String(item.sku),
        title: p?.title || undefined
      });

      if (p) {
        if (p.shipsAlone) {
          for (let i = 0; i < qty; i++) packages.push(makePkg());
        } else {
          // Simple heuristic: pack same SKU together by qty (naive bin)
          // For now, push as a single package per line item
          packages.push(makePkg());
        }
      } else {
        missing.push(String(item.sku));
        for (let i = 0; i < qty; i++)
          packages.push({
            weight: { value: defaultWeight, unit: 'pound' },
            dimensions: { unit: 'inch', ...defaultDims },
            sku: String(item.sku)
          });
      }
    }

    // Freight thresholds (heuristic)
    if (totalWeight >= 150 || maxDim >= 60) freight = true;

    if (!packages.length && installOnly) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          installOnly: true,
          message: 'Selected products are install-only and do not require shipping.',
          packages,
          missing
        })
      };
    }

    if (freight) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          freight: true,
          installOnly,
          message: 'Freight required due to weight/dimensions or product class.',
          packages
        })
      };
    }

    const payload = {
      rate_options: { carrier_ids: process.env.SHIPENGINE_CARRIER_ID ? [process.env.SHIPENGINE_CARRIER_ID] : undefined },
      shipment: { validate_address: 'no_validation', ship_from: shipFrom, ship_to: shipTo, packages }
    };

    const data: any = await se('/rates/estimate', { method: 'POST', body: JSON.stringify(payload) });
    const rates = Array.isArray(data) ? data : data?.rate_response?.rates || [];
    if (!Array.isArray(rates) || !rates.length)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, rates: [], packages, installOnly, missing })
      };

    // Normalize and pick cheapest
    const norm = rates.map((r: any) => ({
      carrierId: r.carrier_id || r.carrierId,
      carrier: r.carrier_friendly_name || r.carrier || '',
      serviceCode: r.service_code || r.serviceCode,
      serviceName: r.service_code || r.serviceCode,
      amount: Number(r.shipping_amount?.amount ?? r.amount ?? 0),
      currency: r.shipping_amount?.currency || r.currency || 'USD',
      deliveryDays: r.delivery_days || r.deliveryDays,
      estimatedDeliveryDate: r.estimated_delivery_date || r.estimatedDeliveryDate || null
    }));
    norm.sort((a: any, b: any) => a.amount - b.amount);
    const bestRate = norm[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, freight: false, bestRate, rates: norm, packages, missing, installOnly })
    };
  } catch (e: any) {
    const headers = { 'content-type': 'application/json', ...corsHeaders('*') };
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || 'Error' }) };
  }
};

export default { handler };
