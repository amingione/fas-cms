import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';

type AddressInput = {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
  phone?: string;
};

function normalizeAddress(input: any): Record<string, string> | null {
  if (!input || typeof input !== 'object') return null;
  const address = input as AddressInput;
  const normalized = {
    first_name: address.firstName?.trim() || '',
    last_name: address.lastName?.trim() || '',
    address_1: address.address1?.trim() || '',
    address_2: address.address2?.trim() || '',
    city: address.city?.trim() || '',
    province: address.province?.trim() || '',
    postal_code: address.postalCode?.trim() || '',
    country_code: address.countryCode?.trim() || '',
    phone: address.phone?.trim() || ''
  };

  if (!normalized.address_1 || !normalized.city || !normalized.postal_code || !normalized.country_code) {
    return null;
  }

  return normalized;
}

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse({ error: 'Medusa backend not configured.' }, { status: 503 }, { noIndex: true });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const cartId = typeof body?.cartId === 'string' ? body.cartId.trim() : '';
  if (!cartId) {
    return jsonResponse({ error: 'Missing cartId.' }, { status: 400 }, { noIndex: true });
  }

  const shippingAddress = normalizeAddress(body?.shippingAddress);
  const billingAddress = normalizeAddress(body?.billingAddress);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!shippingAddress) {
    return jsonResponse({ error: 'Invalid shipping address.' }, { status: 400 }, { noIndex: true });
  }

  const payload: Record<string, any> = {
    shipping_address: shippingAddress
  };
  if (billingAddress) payload.billing_address = billingAddress;
  if (email) payload.email = email;

  const response = await medusaFetch(`/store/carts/${cartId}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const data = await readJsonSafe<any>(response);

  if (!response.ok) {
    return jsonResponse(
      { error: data?.message || 'Failed to update address.', details: data },
      { status: response.status },
      { noIndex: true }
    );
  }

  return jsonResponse({ cart: data?.cart ?? null }, { status: 200 }, { noIndex: true });
};
