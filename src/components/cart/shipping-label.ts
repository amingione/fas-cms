'use client';

import type { CheckoutShippingRate } from './actions';

const CARRIER_LABELS: Record<string, string> = {
  usps: 'USPS',
  ups: 'UPS',
  fedex: 'FedEx',
  dhl: 'DHL',
  ontrac: 'OnTrac'
};

function humanizeToken(token: string, index: number): string {
  const lower = token.toLowerCase();
  if (CARRIER_LABELS[lower] && index === 0) return CARRIER_LABELS[lower];
  if (CARRIER_LABELS[lower]) return CARRIER_LABELS[lower];
  if (/^\d+(?:st|nd|rd|th)?$/i.test(token)) return token.toUpperCase();
  if (lower === 'us') return 'US';
  if (lower === 'usa') return 'USA';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function humanizeShippingCode(value?: string | null): string {
  if (!value) return '';
  const cleaned = String(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.split(' ').filter(Boolean).map(humanizeToken).join(' ');
}

export function buildShippingLabel(rate: CheckoutShippingRate): string {
  const rawService = rate.service || rate.serviceName || rate.serviceCode || 'Shipping';
  const service = humanizeShippingCode(rawService) || 'Shipping';
  const carrier = humanizeShippingCode(rate.carrier || '');
  if (!carrier) return service;
  const serviceLower = service.toLowerCase();
  const carrierLower = carrier.toLowerCase();
  if (serviceLower.startsWith(carrierLower)) return service;
  return `${service} | ${carrier}`;
}
