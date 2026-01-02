export type OrderCartItem = {
  _type: 'orderCartItem';
  _key: string;
  id?: string;
  sku?: string;
  name?: string;
  price: number;
  quantity: number;
  optionSummary?: string;
  optionDetails?: string[];
  upgrades?: string[];
  upgradesTotal?: number;
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

const normalizeStringArray = (input: unknown, separators: RegExp = /[|,]/): string[] => {
  const values: string[] = [];
  const isEmptyArrayToken = (value: string) =>
    /^\[\s*\]$/.test(value) || /:\s*\[\s*\]$/.test(value);
  const add = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => add(entry));
      return;
    }
    if (typeof value === 'string') {
      value
        .split(separators)
        .map((entry) => entry.trim())
        .filter((entry) => Boolean(entry) && !isEmptyArrayToken(entry))
        .forEach((entry) => values.push(entry));
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const trimmed = String(value).trim();
      if (trimmed) values.push(trimmed);
      return;
    }
    if (value && typeof value === 'object') {
      const label = (value as any).label ?? (value as any).value ?? (value as any).name;
      if (typeof label === 'string') add(label);
    }
  };

  add(input);
  return Array.from(new Set(values));
};

const parseOptionDetails = (metadata?: Record<string, unknown>): { summary?: string; details?: string[] } => {
  if (!metadata) return {};
  const meta = metadata as Record<string, unknown>;

  const optionSummary = toStringOrUndefined(
    meta['option_summary'] ?? meta['selected_options'] ?? meta['options_readable']
  );
  const optionDetailString = toStringOrUndefined(meta['Options Detail'] ?? meta['options_detail']);

  const detailSet: Set<string> = new Set();
  const pushDetail = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (trimmed) detailSet.add(trimmed);
  };

  const parseJsonDetails = (json?: unknown) => {
    if (typeof json !== 'string' || !json.trim()) return;
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
          const label = key.trim();
          const val = value == null ? '' : String(value).trim();
          if (label && val) pushDetail(`${label}: ${val}`);
        });
      }
    } catch {
      void 0;
    }
  };

  parseJsonDetails(meta['option_details_json'] || meta['selected_options_json']);

  const optionNameRegex = /^option(\d+)_name$/i;
  Object.keys(metadata).forEach((key) => {
    const match = key.match(optionNameRegex);
    if (!match) return;
    const idx = match[1];
    const name = toStringOrUndefined(meta[key]);
    const value = toStringOrUndefined(meta[`option${idx}_value`]);
    if (name && value) pushDetail(`${name}: ${value}`);
  });

  normalizeStringArray(meta['optionDetails'] ?? meta['option_details'], /[•|,]/).forEach((entry) =>
    pushDetail(entry)
  );

  if (!detailSet.size && optionSummary) {
    optionSummary
      .split(/[•|]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => pushDetail(entry));
  }

  if (!detailSet.size && optionDetailString) {
    optionDetailString
      .split('|')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => pushDetail(entry));
  }

  return { summary: optionSummary, details: detailSet.size ? Array.from(detailSet) : undefined };
};

const parseUpgrades = (metadata?: Record<string, unknown>): { list?: string[]; total?: number } => {
  if (!metadata) return {};
  const meta = metadata as Record<string, unknown>;
  const values = new Set<string>();
  const addValues = (input?: unknown) => {
    normalizeStringArray(input, /[|,]/).forEach((value) => values.add(value));
  };

  addValues(meta['upgrades']);
  addValues(meta['upgrades_readable']);
  addValues(meta['upgrade_list']);
  addValues(meta['upgrade_titles']);
  addValues(meta['addOns'] ?? (meta as any)?.addons ?? (meta as any)?.add_ons);

  Object.keys(meta)
    .filter((key) => /^upgrade_\d+$/i.test(key))
    .forEach((key) => addValues(meta[key]));

  const total = toNumber(
    meta['upgrades_total'] ?? meta['upgrade_total'] ?? meta['upgradesTotal'] ?? meta['upgradeTotal']
  );

  return { list: values.size ? Array.from(values) : undefined, total: total ?? undefined };
};

const applyArrayMetadata = (
  metadata: Record<string, unknown> | undefined,
  key: string,
  values: string[],
  separators: RegExp
) => {
  if (!metadata) return;
  const hadKey = key in metadata;
  const normalized = values.length ? values : normalizeStringArray(metadata[key], separators);
  if (normalized.length) {
    metadata[key] = normalized;
  } else if (hadKey) {
    metadata[key] = [];
  }
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
      ? { ...(data.metadata as Record<string, unknown>) }
      : undefined;

  const { summary: optionSummary, details: optionDetails } = parseOptionDetails(metadata);
  const { list: upgradeList, total: upgradesTotal } = parseUpgrades(metadata);

  applyArrayMetadata(metadata, 'upgrades', upgradeList ?? [], /[|,]/);
  applyArrayMetadata(metadata, 'addOns', upgradeList ?? [], /[|,]/);
  applyArrayMetadata(metadata, 'optionDetails', optionDetails ?? [], /[•|,]/);
  applyArrayMetadata(metadata, 'option_details', optionDetails ?? [], /[•|,]/);

  return {
    _type: 'orderCartItem',
    _key: generateKey(),
    id: toStringOrUndefined(data.id),
    sku: toStringOrUndefined(data.sku),
    name: toStringOrUndefined(data.name) || toStringOrUndefined(data.description),
    price: price ?? 0,
    quantity: quantity ?? 1,
    ...(optionSummary ? { optionSummary } : {}),
    ...(optionDetails && optionDetails.length ? { optionDetails } : {}),
    ...(upgradeList && upgradeList.length ? { upgrades: upgradeList } : {}),
    ...(typeof upgradesTotal === 'number' ? { upgradesTotal } : {}),
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
