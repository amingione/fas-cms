export type QuickViewOptionValue = {
  id: string;
  label: string;
  value: string;
  priceDelta?: number;
  description?: string;
  defaultSelected?: boolean;
};

export type QuickViewOptionGroup = {
  key: string;
  title: string;
  type: 'radio' | 'select';
  helperText?: string;
  values: QuickViewOptionValue[];
};

const VALUE_KEYS = ['label', 'title', 'name', 'value', 'displayName', 'text', 'content', 'option'];

const normalizeSingleValue = (entry: unknown): string | null => {
  if (entry == null) return null;
  if (typeof entry === 'string' || typeof entry === 'number') {
    const value = String(entry).trim();
    return value.length ? value : null;
  }
  if (typeof entry === 'object') {
    for (const key of VALUE_KEYS) {
      const raw = (entry as Record<string, unknown>)[key];
      if (typeof raw === 'string' && raw.trim().length) {
        return raw.trim();
      }
    }
    const fallbacks = ['id', '_key', '_id'];
    for (const key of fallbacks) {
      const raw = (entry as Record<string, unknown>)[key];
      if (typeof raw === 'string' && raw.trim().length) {
        return raw.trim();
      }
    }
  }
  return null;
};

const readPriceDelta = (entry: unknown): number => {
  if (!entry || typeof entry !== 'object') return 0;
  const { priceDelta, price, delta, surcharge } = entry as Record<string, unknown>;
  const candidates = [priceDelta, delta, price, surcharge];
  for (const candidate of candidates) {
    const numeric = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(numeric) && numeric !== 0) return numeric;
  }
  return 0;
};

const normalizeOptionValue = (
  entry: unknown,
  groupKey: string,
  index: number
): QuickViewOptionValue | null => {
  if (entry == null) return null;

  if (typeof entry === 'string' || typeof entry === 'number') {
    const label = String(entry).trim();
    if (!label) return null;
    return {
      id: `${groupKey}-${index}-${label}`,
      label,
      value: label
    };
  }

  if (typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    let label = '';
    for (const key of VALUE_KEYS) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length) {
        label = value.trim();
        break;
      }
    }

    if (!label) {
      const fallback = normalizeSingleValue(entry);
      if (!fallback) return null;
      label = fallback;
    }

    const rawValue = record.value ?? record.id ?? record._key ?? label;
    const normalizedValue = String(rawValue ?? label).trim();
    if (!normalizedValue) return null;

    const priceDelta = readPriceDelta(entry);
    const description =
      typeof record.description === 'string' && record.description.trim().length
        ? record.description.trim()
        : undefined;
    const defaultSelected = Boolean(
      record.defaultSelected ?? record.default ?? record.isDefault ?? false
    );

    return {
      id: `${groupKey}-${index}-${normalizedValue}`,
      label,
      value: normalizedValue,
      priceDelta,
      description,
      defaultSelected
    };
  }

  return null;
};

const POSSIBLE_VALUE_ARRAYS = [
  'values',
  'items',
  'options',
  'choices',
  'sizes',
  'variants',
  'entries',
  'variations',
  'valueOptions',
  'selections'
];

const looksLikeGroupObject = (entry: any): boolean => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  if (entry.values || entry.items || entry.options) return true;
  if (typeof entry.title === 'string' || typeof entry.name === 'string') return true;
  if (typeof entry.key === 'string' || typeof entry._key === 'string') return true;
  return POSSIBLE_VALUE_ARRAYS.some((key) => Array.isArray(entry[key]));
};

const normalizeOptionGroup = (group: any, index: number): QuickViewOptionGroup | null => {
  if (!group) return null;

  if (typeof group !== 'object' || Array.isArray(group)) {
    const primitiveEntries = Array.isArray(group) ? group : [group];
    const primitiveValues = primitiveEntries
      .map((entry, idx) => normalizeOptionValue(entry, 'options', idx))
      .filter((value): value is QuickViewOptionValue => Boolean(value));
    if (!primitiveValues.length) return null;
    return {
      key: `options-${index}`,
      title: 'Options',
      type: primitiveValues.length > 4 ? 'select' : 'radio',
      values: primitiveValues
    };
  }

  const keyCandidate =
    group.key || group._key || group.id || group.name || group.title || `option-${index}`;
  const title = group.title || group.name || group.label || 'Option';
  const helperText =
    typeof group.description === 'string' && group.description.trim().length
      ? group.description.trim()
      : undefined;

  let values: QuickViewOptionValue[] = [];
  for (const key of POSSIBLE_VALUE_ARRAYS) {
    if (Array.isArray(group[key])) {
      values = group[key]
        .map((entry: unknown, idx: number) =>
          normalizeOptionValue(entry, String(keyCandidate), idx)
        )
        .filter((value): value is QuickViewOptionValue => Boolean(value));
      if (values.length) break;
    }
  }

  if (!values.length) {
    const fallback = normalizeOptionValue(group.value ?? group, String(keyCandidate), 0);
    if (fallback) {
      values = [fallback];
    }
  }

  if (!values.length) return null;

  return {
    key: String(keyCandidate || `option-${index}`),
    title: String(title || 'Option'),
    type: values.length > 4 ? 'select' : 'radio',
    helperText,
    values
  };
};

export function getQuickViewOptionGroups(product: any): QuickViewOptionGroup[] {
  if (!product) return [];

  const variationOptions = Array.isArray(product?.variationOptions) ? product.variationOptions : [];
  const optionSources = [product?.options, product?.optionGroups, product?.variations];
  const primarySource = optionSources.find((src) => Array.isArray(src) && src.length) || null;

  let candidateGroups: any[] = [];
  if (Array.isArray(primarySource) && primarySource.length) {
    candidateGroups = primarySource;
  } else if (variationOptions.length) {
    candidateGroups = variationOptions;
  }

  if (!candidateGroups.length) return [];

  const hasGroupObjects = candidateGroups.some((entry) => looksLikeGroupObject(entry));

  if (!hasGroupObjects) {
    const values = candidateGroups
      .map((entry, idx) => normalizeOptionValue(entry, 'options', idx))
      .filter((value): value is QuickViewOptionValue => Boolean(value));
    return values.length
      ? [
          {
            key: 'options',
            title: 'Options',
            type: values.length > 4 ? 'select' : 'radio',
            values
          }
        ]
      : [];
  }

  const groups = candidateGroups
    .map((group, index) => normalizeOptionGroup(group, index))
    .filter((group): group is QuickViewOptionGroup => Boolean(group));

  if (!groups.length && variationOptions.length) {
    const values = variationOptions
      .map((entry: unknown, idx: number) => normalizeOptionValue(entry, 'options', idx))
      .filter((value: QuickViewOptionValue | null): value is QuickViewOptionValue =>
        Boolean(value)
      );
    if (values.length) {
      return [
        {
          key: 'options',
          title: 'Options',
          type: values.length > 4 ? 'select' : 'radio',
          values
        }
      ];
    }
  }

  return groups;
}
