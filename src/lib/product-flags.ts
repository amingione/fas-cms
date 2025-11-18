type FilterEntry = {
  slug?: string | { current?: string };
  label?: string;
  title?: string;
  name?: string;
  value?: string;
  [key: string]: unknown;
};

const INSTALL_ONLY_SLUGS = new Set(['install-only', 'installonly']);

const toBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ['true', '1', 'yes', 'y', 'on', 'install-only'].includes(normalized);
  }
  return false;
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function collectFilterSlugs(filters: unknown): string[] {
  if (!filters) return [];
  const entries = Array.isArray(filters) ? filters : [filters];
  return entries
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return entry;
      if (typeof entry === 'object') {
        const filterEntry = entry as FilterEntry;
        const candidates: Array<string | undefined> = [
          typeof filterEntry.slug === 'string' ? filterEntry.slug : undefined,
          typeof filterEntry.slug === 'object' && filterEntry.slug
            ? (filterEntry.slug as { current?: string }).current
            : undefined,
          filterEntry.value,
          filterEntry.label,
          filterEntry.title,
          filterEntry.name,
          typeof filterEntry._id === 'string' ? filterEntry._id : undefined
        ];
        const match = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
        if (match) return match;
      }
      return '';
    })
    .map((value) => slugify(String(value)))
    .filter(Boolean);
}

const normalizeShippingClass = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const collapseToken = (value: string): string => value.replace(/[-_]/g, '');

const matchesInstallOnly = (slug: string): boolean => {
  if (!slug) return false;
  const normalized = slugify(slug);
  if (!normalized) return false;
  if (INSTALL_ONLY_SLUGS.has(normalized)) return true;
  return INSTALL_ONLY_SLUGS.has(collapseToken(normalized));
};

export function resolveProductCartMeta(product: {
  shippingClass?: unknown;
  filters?: unknown;
  installOnly?: unknown;
} | null | undefined): { shippingClass?: string; installOnly: boolean } {
  const shippingClass = normalizeShippingClass(product?.shippingClass);
  const normalizedShipping = shippingClass.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const explicitInstallOnly = toBooleanFlag(product?.installOnly);
  const filterSlugs = collectFilterSlugs(product?.filters);
  const installOnlyFromFilters = filterSlugs.some((slug) => matchesInstallOnly(slug));
  const installOnlyFromShipping =
    normalizedShipping.includes('installonly') || normalizedShipping.includes('installservice');

  return {
    shippingClass: shippingClass || undefined,
    installOnly: Boolean(explicitInstallOnly || installOnlyFromFilters || installOnlyFromShipping)
  };
}
