export type OrderCartItem = {
  _type: 'orderCartItem';
  _key: string;
  id?: string;
  sku?: string;
  name?: string;
  price: number;
  quantity: number;
  categories?: string[];
  image?: string;
  productUrl?: string;
  productSlug?: string;
  metadata?: Record<string, unknown>;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'number') return String(value);
  return undefined;
};

const generateKey = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (error) {
    void error;
  }
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `oc_${stamp}_${rand}`;
};

export function createOrderCartItem(data: {
  id?: unknown;
  sku?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  quantity?: unknown;
  categories?: unknown;
  image?: unknown;
  productUrl?: unknown;
  productSlug?: unknown;
  metadata?: unknown;
}): OrderCartItem {
  const categories = Array.isArray(data.categories)
    ? data.categories
        .map((value) => toStringOrUndefined(value))
        .filter((value): value is string => Boolean(value))
    : undefined;

  const quantity = toNumber(data.quantity);
  const price = toNumber(data.price);
  const image = toStringOrUndefined(data.image);
  const productUrl = toStringOrUndefined(data.productUrl);
  const productSlug = toStringOrUndefined(data.productSlug);
  const metadata =
    data.metadata && typeof data.metadata === 'object'
      ? (data.metadata as Record<string, unknown>)
      : undefined;

  return {
    _type: 'orderCartItem',
    _key: generateKey(),
    id: toStringOrUndefined(data.id),
    sku: toStringOrUndefined(data.sku),
    name: toStringOrUndefined(data.name) || toStringOrUndefined(data.description),
    price: price ?? 0,
    quantity: quantity ?? 1,
    ...(categories && categories.length ? { categories } : {}),
    ...(image ? { image } : {}),
    ...(productUrl ? { productUrl } : {}),
    ...(productSlug ? { productSlug } : {}),
    ...(metadata ? { metadata } : {})
  };
}

export function ensureOrderCartItems(items: Array<Record<string, unknown>> | undefined | null) {
  if (!Array.isArray(items)) return [] as OrderCartItem[];
  return items.map((item) => {
    if (item && typeof item === 'object') {
      return createOrderCartItem(item);
    }
    return createOrderCartItem({ name: item as any });
  });
}
