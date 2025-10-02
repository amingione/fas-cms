import { sanity, hasWriteToken } from '../sanity-client';

type QuoteRequestItemInput = {
  name?: string | null;
  quantity?: number | null;
  price?: number | null;
  total?: number | null;
  notes?: string | null;
};

type QuoteRequestInput = {
  source: string;
  status?: 'new' | 'in-progress' | 'quoted' | 'won' | 'lost';
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  vehicle?: string | null;
  summary?: string | null;
  subtotal?: number | null;
  notes?: string | null;
  items?: QuoteRequestItemInput[];
  linkedQuoteId?: string | null;
  meta?: Record<string, unknown> | string | null;
  submittedAt?: string;
};

type SanityQuoteRequest = {
  _type: 'quoteRequest';
  submittedAt: string;
  source: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicle?: string;
  summary?: string;
  subtotal?: number;
  notes?: string;
  items?: Array<{
    _type: 'quoteItem';
    name?: string;
    quantity?: number;
    price?: number;
    total?: number;
    notes?: string;
  }>;
  linkedQuote?: { _type: 'reference'; _ref: string; _weak?: boolean };
  meta?: string;
};

function toNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export async function createQuoteRequest(input: QuoteRequestInput) {
  if (!hasWriteToken) {
    console.warn('[quote-requests] Missing Sanity write token; skipping persistence');
    return null;
  }

  const submittedAt = input.submittedAt || new Date().toISOString();
  const doc: SanityQuoteRequest = {
    _type: 'quoteRequest',
    submittedAt,
    source: input.source,
    status: input.status || 'new',
    customerName: input.customerName?.trim() || undefined,
    customerEmail: input.customerEmail?.trim().toLowerCase() || undefined,
    customerPhone: input.customerPhone?.trim() || undefined,
    vehicle: input.vehicle?.trim() || undefined,
    summary: input.summary?.trim() || undefined,
    subtotal: toNumber(input.subtotal ?? undefined),
    notes: input.notes?.trim() || undefined
  };

  if (input.items && input.items.length) {
    doc.items = input.items.map((item) => ({
      _type: 'quoteItem',
      name: item.name?.trim() || undefined,
      quantity: toNumber(item.quantity ?? undefined),
      price: toNumber(item.price ?? undefined),
      total: toNumber(item.total ?? undefined),
      notes: item.notes?.trim() || undefined
    }));
  }

  if (input.linkedQuoteId) {
    doc.linkedQuote = { _type: 'reference', _ref: input.linkedQuoteId, _weak: true };
  }

  if (input.meta) {
    try {
      const serialized = typeof input.meta === 'string' ? input.meta : JSON.stringify(input.meta);
      doc.meta = serialized.length > 8000 ? serialized.slice(0, 8000) : serialized;
    } catch (err) {
      console.warn('[quote-requests] Failed to serialize meta payload', err);
    }
  }

  try {
    return await sanity.create(doc);
  } catch (err) {
    console.error('[quote-requests] Failed to create quote request', err);
    return null;
  }
}
