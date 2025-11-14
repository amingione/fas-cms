export type KeywordValue = string | number | null | undefined;

const toTrimmedString = (value: KeywordValue): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString().trim();
  return '';
};

const collapseSpaces = (value: string): string => value.replace(/\s+/g, ' ').trim();

const coerceArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (value === null || typeof value === 'undefined') return [];
  return [value];
};

const flattenFitmentYears = (value: unknown): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => {
        if (!entry) return '';
        if (typeof entry === 'string' || typeof entry === 'number') {
          return entry.toString();
        }
        if (typeof entry === 'object') {
          const label = (entry as { label?: string }).label;
          if (label && typeof label === 'string') return label.trim();
          const from = (entry as { from?: KeywordValue; startYear?: KeywordValue }).from ??
            (entry as { start?: KeywordValue; startYear?: KeywordValue }).start ??
            (entry as { startYear?: KeywordValue }).startYear;
          const to = (entry as { to?: KeywordValue; endYear?: KeywordValue }).to ??
            (entry as { end?: KeywordValue; endYear?: KeywordValue }).end ??
            (entry as { endYear?: KeywordValue }).endYear;
          const fromStr = toTrimmedString(from ?? '');
          const toStr = toTrimmedString(to ?? '');
          if (fromStr && toStr) return `${fromStr}-${toStr}`;
          if (fromStr) return fromStr;
          if (toStr) return toStr;
        }
        return '';
      })
      .filter((entry) => entry && entry.trim().length > 0);
    return entries.length ? entries.join('–') : '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value.toString().trim();
  }
  if (typeof value === 'object') {
    const label = (value as { label?: string }).label;
    if (label && typeof label === 'string') return label.trim();
  }
  return '';
};

const pickFirstString = (...candidates: Array<KeywordValue | KeywordValue[] | undefined>): string => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const nested of candidate) {
        const trimmed = toTrimmedString(nested);
        if (trimmed) return trimmed;
      }
      continue;
    }
    const trimmed = toTrimmedString(candidate ?? '');
    if (trimmed) return trimmed;
  }
  return '';
};

export interface AnchorSource {
  primaryKeyword?: KeywordValue;
  seoPrimaryKeyword?: KeywordValue;
  secondaryKeywords?: KeywordValue | KeywordValue[];
  fallbackLabel?: KeywordValue;
  title?: KeywordValue;
  fitment?: KeywordValue;
  seoFitment?: KeywordValue;
  fitmentText?: KeywordValue;
  seoFitmentText?: KeywordValue;
  fitmentYears?: unknown;
  seoFitmentYears?: unknown;
}

export const buildPrimaryKeywordAnchor = (
  source: AnchorSource,
  fallback?: string
): string | undefined => {
  const primaryKeyword = pickFirstString(
    source.primaryKeyword,
    source.seoPrimaryKeyword,
    coerceArray(source.secondaryKeywords)
  );
  const fitmentCandidate = pickFirstString(
    source.seoFitmentText,
    source.seoFitment,
    source.fitmentText,
    source.fitment
  );
  const fitmentYears = flattenFitmentYears(source.seoFitmentYears ?? source.fitmentYears);
  const fitmentPhrase = fitmentCandidate || fitmentYears;

  const baseLabel = primaryKeyword || pickFirstString(source.title, source.fallbackLabel, fallback ?? '');
  if (!baseLabel) {
    const resolvedFallback = toTrimmedString(fallback ?? source.fallbackLabel ?? source.title ?? '');
    return resolvedFallback ? collapseSpaces(resolvedFallback) : undefined;
  }

  if (fitmentPhrase) {
    return collapseSpaces(`${baseLabel} for ${fitmentPhrase}`);
  }

  return collapseSpaces(baseLabel);
};

export const toKeywordLabel = (value: KeywordValue): string | undefined => {
  const trimmed = toTrimmedString(value);
  return trimmed ? collapseSpaces(trimmed) : undefined;
};

export const mergeAnchorFallbacks = (
  anchor: string | undefined,
  fallback?: string
): string | undefined => {
  if (anchor && anchor.trim().length > 0) return collapseSpaces(anchor);
  if (fallback && fallback.trim().length > 0) return collapseSpaces(fallback);
  return undefined;
};

export const collapseLabelSpaces = collapseSpaces;
