type AddOnEntry = { label: string; price?: number };

const CLEAN_PREFIX_REGEX = /^(type|option|upgrade|add[-\s]?on)\s*\d*\s*:?/i;
const SPLIT_LABEL_REGEX = /[|,]/;

function cleanLabel(label?: string | null) {
  if (!label) return '';
  return label.replace(CLEAN_PREFIX_REGEX, '').trim();
}

function normalizePrice(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return raw;
}

function splitLabel(label: string): string[] {
  if (!SPLIT_LABEL_REGEX.test(label)) return [label];
  return label
    .split(SPLIT_LABEL_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);
}

function readAddOnObject(entry: Record<string, unknown>): { labels: string[]; price?: number } {
  const rawLabel =
    (entry.label as string | undefined) ||
    (entry.value as string | undefined) ||
    (entry.name as string | undefined) ||
    (entry.title as string | undefined);

  const cleaned = cleanLabel(rawLabel);
  const labels = cleaned ? splitLabel(cleaned) : [];

  const price =
    normalizePrice(entry.priceDelta) ?? normalizePrice(entry.delta) ?? normalizePrice(entry.price);

  return { labels, price };
}

function pushEntry(addOns: AddOnEntry[], rawLabel: string, rawPrice?: number) {
  const cleaned = cleanLabel(rawLabel);
  if (!cleaned) return;
  const normalized = cleaned.toLowerCase();
  const price = normalizePrice(rawPrice);

  const existing = addOns.find((entry) => entry.label.toLowerCase() === normalized);
  if (existing) {
    if (existing.price == null && price !== undefined) existing.price = price;
    return;
  }

  addOns.push({ label: cleaned, price });
}

export function extractAddOns(item: {
  upgrades?: unknown;
  selectedUpgrades?: unknown;
  options?: Record<string, unknown> | null;
}): AddOnEntry[] {
  const addOns: AddOnEntry[] = [];

  const readEntry = (entry: unknown) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      splitLabel(entry).forEach((part) => pushEntry(addOns, part, undefined));
      return;
    }
    if (typeof entry === 'object') {
      const { labels, price } = readAddOnObject(entry as Record<string, unknown>);
      labels.forEach((label) => pushEntry(addOns, label, price));
    }
  };

  const upgradeSource = item.upgrades ?? item.selectedUpgrades;
  if (Array.isArray(upgradeSource)) {
    upgradeSource.forEach((entry) => readEntry(entry));
  } else if (upgradeSource && typeof upgradeSource === 'object') {
    Object.values(upgradeSource).forEach((entry) => readEntry(entry));
  }

  Object.entries(item.options || {}).forEach(([key, value]) => {
    if (!/upgrade|add[-\s]?on/i.test(key)) return;
    if (typeof value === 'string') {
      splitLabel(value).forEach((part) => pushEntry(addOns, part, undefined));
      return;
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const { labels, price } = readAddOnObject(obj);
      if (labels.length) {
        labels.forEach((label) => pushEntry(addOns, label, price));
        return;
      }
      const fallbackLabel = cleanLabel(String(obj.label ?? obj.value ?? obj.name ?? obj.title ?? ''));
      if (fallbackLabel) {
        pushEntry(addOns, fallbackLabel, price);
      }
    }
  });

  return addOns;
}

export function calculateAddOnTotal(addOns: AddOnEntry[]): number {
  return addOns.reduce((total, entry) => total + (entry.price ?? 0), 0);
}

